import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const SESSION_SIGNING_KEY = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{2,32}$/;
const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

type UserRole = 'admin' | 'user';

interface ClaimedCredential {
  username: string;
  salt: string;
  hash: string;
}

interface AppUserRecord {
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  salt: string;
  hash: string;
  createdAt: string;
  createdBy: string;
}

interface StoredTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface StoredSiteTexts {
  appTitle: string;
  appDescription: string;
  cashflowTitle: string;
  cashflowDescription: string;
  expenseDistTitle: string;
  expenseDistDescription: string;
  recentTitle: string;
  recentDescription: string;
  allTrxTitle: string;
}

interface UserWorkspaceData {
  transactions: StoredTransaction[];
  siteTexts?: StoredSiteTexts;
  theme?: 'dark' | 'light';
  updatedAt: string;
}

interface SessionPayload {
  sub: string;
  role: UserRole;
  jti: string;
  exp: number;
}

interface AuthenticatedCaller {
  username: string;
  role: UserRole;
  source: 'session' | 'firebase';
  jti?: string;
}

// Server-side in-memory stores
let claimedCredential: ClaimedCredential | null = null;
const additionalUsers = new Map<string, AppUserRecord>(); // key: lowercase username
const userWorkspaceStore = new Map<string, UserWorkspaceData>(); // key: lowercase username
const revokedTokens = new Set<string>();
const revokedUserMinIssuedAt = new Map<string, number>(); // key: lowercase username -> timestamp ms

let cachedFirebaseProjectId: string | null = null;
let cachedFirebaseCerts: Record<string, string> = {};
let cachedFirebaseCertsExpiresAt = 0;

function getFirebaseProjectId(): string | null {
  if (cachedFirebaseProjectId) return cachedFirebaseProjectId;
  if (process.env.FIREBASE_PROJECT_ID?.trim()) {
    cachedFirebaseProjectId = process.env.FIREBASE_PROJECT_ID.trim();
    return cachedFirebaseProjectId;
  }
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { projectId?: string };
      if (typeof parsed?.projectId === 'string' && parsed.projectId.trim()) {
        cachedFirebaseProjectId = parsed.projectId.trim();
        return cachedFirebaseProjectId;
      }
    }
  } catch {
    // Ignore read error
  }
  return null;
}

function getBootstrappedAdminEmail(): string {
  const configured = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return configured && configured.length > 0 ? configured : 'lastwizard.sand@gmail.com';
}

function getEnvUsername(): string {
  const configured = process.env.APP_LOGIN_USERNAME?.trim();
  return configured && configured.length > 0 ? configured : 'ifan';
}

function getEnvPassword(): string {
  return process.env.APP_LOGIN_PASSWORD ?? '';
}

function hashPassword(password: string, salt: string): Buffer {
  return crypto.scryptSync(password, salt, 64);
}

function timingSafeCompareText(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function getPrimaryAdminUsername(): string {
  const envPassword = getEnvPassword();
  return envPassword.length > 0
    ? getEnvUsername()
    : (claimedCredential?.username ?? getEnvUsername());
}

function isPrimaryAdmin(username: string): boolean {
  return username.toLowerCase() === getPrimaryAdminUsername().toLowerCase();
}

function resolveUserRoleAndActive(username: string): { exists: boolean; active: boolean; role: UserRole; canonical: string } {
  const primary = getPrimaryAdminUsername();
  if (username.toLowerCase() === primary.toLowerCase()) {
    const envPassword = getEnvPassword();
    const configured = envPassword.length > 0 || claimedCredential !== null;
    return {
      exists: configured,
      active: configured,
      role: 'admin',
      canonical: primary,
    };
  }
  const found = additionalUsers.get(username.toLowerCase());
  if (!found) {
    return { exists: false, active: false, role: 'user', canonical: username };
  }
  return {
    exists: true,
    active: found.active,
    role: found.role,
    canonical: found.username,
  };
}

function signSessionToken(username: string, role: UserRole): string {
  const payload: SessionPayload = {
    sub: username,
    role,
    jti: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(encodedPayload)
    .digest('base64url');

  const sigBufA = Buffer.from(providedSig);
  const sigBufB = Buffer.from(expectedSig);
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as SessionPayload;
    if (
      !parsed ||
      typeof parsed.sub !== 'string' ||
      (parsed.role !== 'admin' && parsed.role !== 'user') ||
      typeof parsed.jti !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() > parsed.exp || revokedTokens.has(parsed.jti)) {
      return null;
    }
    const minValidAfter = revokedUserMinIssuedAt.get(parsed.sub.toLowerCase());
    const issuedAt = parsed.exp - SESSION_TTL_MS;
    if (minValidAfter && issuedAt <= minValidAfter) {
      return null;
    }
    const status = resolveUserRoleAndActive(parsed.sub);
    if (!status.exists || !status.active) {
      return null;
    }
    return {
      ...parsed,
      sub: status.canonical,
      role: status.role,
    };
  } catch {
    return null;
  }
}

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  if (Date.now() < cachedFirebaseCertsExpiresAt && Object.keys(cachedFirebaseCerts).length > 0) {
    return cachedFirebaseCerts;
  }
  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Firebase certificates');
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedFirebaseCerts = (await response.json()) as Record<string, string>;
  cachedFirebaseCertsExpiresAt = Date.now() + Math.max(60, maxAgeSec) * 1000;
  return cachedFirebaseCerts;
}

async function verifyFirebaseAdminToken(idToken: string): Promise<AuthenticatedCaller | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
      return null;
    }

    const certs = await getFirebasePublicCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    const sigBuf = Buffer.from(signatureB64, 'base64url');
    if (!verifier.verify(cert, sigBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      auth_time?: number;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    const nowSec = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== projectId ||
      payload.iss !== `https://securetoken.google.com/${projectId}` ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.exp !== 'number' ||
      payload.exp <= nowSec ||
      typeof payload.iat !== 'number' ||
      payload.iat > nowSec + 300 ||
      typeof payload.auth_time !== 'number' ||
      payload.auth_time > nowSec + 300 ||
      payload.email_verified !== true ||
      typeof payload.email !== 'string'
    ) {
      return null;
    }

    if (payload.email.toLowerCase() !== getBootstrappedAdminEmail()) {
      return null;
    }

    return {
      username: payload.email,
      role: 'admin',
      source: 'firebase',
    };
  } catch {
    return null;
  }
}

function extractAuthHeader(req: Request): { scheme: 'Bearer' | 'Firebase'; token: string } | null {
  const header = req.headers.authorization;
  if (!header) return null;
  if (header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    return token.length > 0 ? { scheme: 'Bearer', token } : null;
  }
  if (header.startsWith('Firebase ')) {
    const token = header.slice(9).trim();
    return token.length > 0 ? { scheme: 'Firebase', token } : null;
  }
  return null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = extractAuthHeader(req);
  if (!authHeader || authHeader.scheme !== 'Bearer') {
    return res.status(401).json({ error: 'Autentikasi diperlukan.' });
  }
  const payload = verifySessionToken(authHeader.token);
  if (!payload) {
    return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
  }
  (req as Request & { authCaller?: AuthenticatedCaller }).authCaller = {
    username: payload.sub,
    role: payload.role,
    source: 'session',
    jti: payload.jti,
  };
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = extractAuthHeader(req);
  if (!authHeader) {
    return res.status(401).json({ error: 'Autentikasi admin diperlukan.' });
  }

  if (authHeader.scheme === 'Bearer') {
    const payload = verifySessionToken(authHeader.token);
    if (!payload) {
      return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
    }
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang dapat mengelola user.' });
    }
    (req as Request & { authCaller?: AuthenticatedCaller }).authCaller = {
      username: payload.sub,
      role: payload.role,
      source: 'session',
      jti: payload.jti,
    };
    return next();
  }

  const firebaseAdmin = await verifyFirebaseAdminToken(authHeader.token);
  if (!firebaseAdmin) {
    return res.status(403).json({ error: 'Hanya akun admin terverifikasi yang dapat mengelola user.' });
  }
  (req as Request & { authCaller?: AuthenticatedCaller }).authCaller = firebaseAdmin;
  return next();
}

function serializeUserPublic(record: AppUserRecord) {
  return {
    username: record.username,
    displayName: record.displayName,
    role: record.role,
    active: record.active,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    isPrimaryAdmin: false,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  // Auth status endpoint
  app.get('/api/auth/status', (req: Request, res: Response) => {
    const envPassword = getEnvPassword();
    const configured = envPassword.length > 0 || claimedCredential !== null;
    const defaultUsername = getPrimaryAdminUsername();

    const authHeader = extractAuthHeader(req);
    const session = authHeader?.scheme === 'Bearer' ? verifySessionToken(authHeader.token) : null;

    res.json({
      configured,
      hasAdditionalUsers: additionalUsers.size > 0,
      defaultUsername,
      authenticated: session !== null,
      username: session?.sub ?? null,
      role: session?.role ?? null,
    });
  });

  // One-time initial password claim route when APP_LOGIN_PASSWORD env is not configured
  app.post('/api/auth/setup', (req: Request, res: Response) => {
    if (getEnvPassword().length > 0 || claimedCredential !== null) {
      return res.status(409).json({ error: 'Kredensial login sudah dikonfigurasi.' });
    }

    const rawUsername = req.body?.username;
    const rawPassword = req.body?.password;

    if (typeof rawUsername !== 'string' || typeof rawPassword !== 'string') {
      return res.status(400).json({ error: 'Username dan password harus berupa teks yang valid.' });
    }

    const username = rawUsername.trim();
    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Username harus 2-32 karakter (huruf, angka, titik, garis bawah, atau hubung).' });
    }
    if (additionalUsers.has(username.toLowerCase())) {
      return res.status(409).json({ error: 'Username sudah dipakai oleh user lain.' });
    }
    if (rawPassword.length < 6 || rawPassword.length > 128) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(rawPassword, salt).toString('hex');
    claimedCredential = { username, salt, hash };

    const token = signSessionToken(username, 'admin');
    return res.status(201).json({ token, username, role: 'admin', displayName: username });
  });

  // Login endpoint (supports primary admin and any created active user)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const rawUsername = req.body?.username;
    const rawPassword = req.body?.password;

    if (typeof rawUsername !== 'string' || typeof rawPassword !== 'string') {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const username = rawUsername.trim();
    if (!username || !rawPassword || username.length > 64 || rawPassword.length > 128) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    // 1. Check created users first if username matches one
    const createdUser = additionalUsers.get(username.toLowerCase());
    if (createdUser) {
      const derived = hashPassword(rawPassword, createdUser.salt);
      const stored = Buffer.from(createdUser.hash, 'hex');
      const passMatch = derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
      if (!passMatch) {
        return res.status(401).json({ error: 'Username atau password salah.' });
      }
      if (!createdUser.active) {
        return res.status(403).json({ error: 'Akses akun ini sedang dinonaktifkan oleh admin.' });
      }
      const token = signSessionToken(createdUser.username, createdUser.role);
      return res.json({
        token,
        username: createdUser.username,
        displayName: createdUser.displayName,
        role: createdUser.role,
      });
    }

    // 2. Check env-configured primary admin
    const envPassword = getEnvPassword();
    if (envPassword.length > 0) {
      const expectedUsername = getEnvUsername();
      const userMatch = timingSafeCompareText(username, expectedUsername);
      const passMatch = timingSafeCompareText(rawPassword, envPassword);
      if (!userMatch || !passMatch) {
        return res.status(401).json({ error: 'Username atau password salah.' });
      }
      const token = signSessionToken(expectedUsername, 'admin');
      return res.json({
        token,
        username: expectedUsername,
        displayName: expectedUsername,
        role: 'admin',
      });
    }

    // 3. Check claimed primary admin credential
    if (!claimedCredential) {
      return res.status(409).json({ error: 'Silakan aktifkan password awal admin terlebih dahulu.' });
    }

    const userMatch = timingSafeCompareText(username, claimedCredential.username);
    const derived = hashPassword(rawPassword, claimedCredential.salt);
    const stored = Buffer.from(claimedCredential.hash, 'hex');
    const passMatch = derived.length === stored.length && crypto.timingSafeEqual(derived, stored);

    if (!userMatch || !passMatch) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const token = signSessionToken(claimedCredential.username, 'admin');
    return res.json({
      token,
      username: claimedCredential.username,
      displayName: claimedCredential.username,
      role: 'admin',
    });
  });

  // Protected current user check
  app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
    const caller = (req as Request & { authCaller?: AuthenticatedCaller }).authCaller;
    const found = caller ? additionalUsers.get(caller.username.toLowerCase()) : undefined;
    res.json({
      username: caller?.username ?? null,
      displayName: found?.displayName ?? caller?.username ?? null,
      role: caller?.role ?? 'user',
    });
  });

  // Logout endpoint
  app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
    const caller = (req as Request & { authCaller?: AuthenticatedCaller }).authCaller;
    if (caller?.jti) {
      revokedTokens.add(caller.jti);
    }
    res.json({ ok: true });
  });

  // --- USER MANAGEMENT ROUTES (Admin Only) ---

  app.get('/api/users', requireAdmin, (_req: Request, res: Response) => {
    const envPassword = getEnvPassword();
    const primaryConfigured = envPassword.length > 0 || claimedCredential !== null;
    const primaryUsername = getPrimaryAdminUsername();

    const list = [];
    if (primaryConfigured) {
      list.push({
        username: primaryUsername,
        displayName: `${primaryUsername} (Admin Utama)`,
        role: 'admin' as UserRole,
        active: true,
        createdAt: null,
        createdBy: 'system',
        isPrimaryAdmin: true,
      });
    }

    for (const user of additionalUsers.values()) {
      list.push(serializeUserPublic(user));
    }

    res.json({ users: list });
  });

  app.post('/api/users', requireAdmin, (req: Request, res: Response) => {
    const caller = (req as Request & { authCaller?: AuthenticatedCaller }).authCaller;
    const rawUsername = req.body?.username;
    const rawPassword = req.body?.password;
    const rawDisplayName = req.body?.displayName;
    const rawRole = req.body?.role;

    if (typeof rawUsername !== 'string' || typeof rawPassword !== 'string') {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const username = rawUsername.trim();
    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        error: 'Username harus 2-32 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau hubung.',
      });
    }

    if (rawPassword.length < 6 || rawPassword.length > 128) {
      return res.status(400).json({ error: 'Password minimal 6 karakter dan maksimal 128 karakter.' });
    }

    if (isPrimaryAdmin(username) || additionalUsers.has(username.toLowerCase())) {
      return res.status(409).json({ error: `Username "${username}" sudah digunakan.` });
    }

    const role: UserRole = rawRole === 'admin' ? 'admin' : 'user';
    const displayName =
      typeof rawDisplayName === 'string' && rawDisplayName.trim().length > 0
        ? rawDisplayName.trim().slice(0, 64)
        : username;

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(rawPassword, salt).toString('hex');

    const newUser: AppUserRecord = {
      username,
      displayName,
      role,
      active: true,
      salt,
      hash,
      createdAt: new Date().toISOString(),
      createdBy: caller?.username ?? 'admin',
    };

    additionalUsers.set(username.toLowerCase(), newUser);
    return res.status(201).json({ user: serializeUserPublic(newUser) });
  });

  app.patch('/api/users/:username', requireAdmin, (req: Request, res: Response) => {
    const caller = (req as Request & { authCaller?: AuthenticatedCaller }).authCaller;
    const targetParam = req.params.username?.trim() || '';
    if (!USERNAME_REGEX.test(targetParam)) {
      return res.status(400).json({ error: 'Username tidak valid.' });
    }

    if (isPrimaryAdmin(targetParam)) {
      return res.status(403).json({ error: 'Akun admin utama tidak dapat diubah atau dinonaktifkan di sini.' });
    }

    const target = additionalUsers.get(targetParam.toLowerCase());
    if (!target) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const isSelf = caller?.username.toLowerCase() === target.username.toLowerCase();

    if (typeof req.body?.active === 'boolean') {
      if (isSelf && !req.body.active) {
        return res.status(400).json({ error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' });
      }
      target.active = req.body.active;
      if (!target.active) {
        revokedUserMinIssuedAt.set(target.username.toLowerCase(), Date.now());
      }
    }

    if (req.body?.role === 'admin' || req.body?.role === 'user') {
      if (isSelf && req.body.role !== 'admin') {
        return res.status(400).json({ error: 'Anda tidak dapat menurunkan peran akun Anda sendiri.' });
      }
      target.role = req.body.role;
    }

    if (typeof req.body?.displayName === 'string') {
      const cleaned = req.body.displayName.trim().slice(0, 64);
      if (cleaned.length > 0) {
        target.displayName = cleaned;
      }
    }

    if (typeof req.body?.password === 'string' && req.body.password.length > 0) {
      if (req.body.password.length < 6 || req.body.password.length > 128) {
        return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(req.body.password, salt).toString('hex');
      target.salt = salt;
      target.hash = hash;
      revokedUserMinIssuedAt.set(target.username.toLowerCase(), Date.now());
    }

    return res.json({ user: serializeUserPublic(target) });
  });

  app.delete('/api/users/:username', requireAdmin, (req: Request, res: Response) => {
    const caller = (req as Request & { authCaller?: AuthenticatedCaller }).authCaller;
    const targetParam = req.params.username?.trim() || '';
    if (!USERNAME_REGEX.test(targetParam)) {
      return res.status(400).json({ error: 'Username tidak valid.' });
    }

    if (isPrimaryAdmin(targetParam)) {
      return res.status(403).json({ error: 'Akun admin utama tidak dapat dihapus.' });
    }

    const key = targetParam.toLowerCase();
    const target = additionalUsers.get(key);
    if (!target) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    if (caller?.username.toLowerCase() === key) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun yang sedang digunakan.' });
    }

    additionalUsers.delete(key);
    userWorkspaceStore.delete(key);
    revokedUserMinIssuedAt.set(key, Date.now());
    return res.json({ ok: true });
  });

  // --- PER-USER WORKSPACE DATA ROUTES (for non-Google username/password users) ---

  app.get('/api/user-data', requireAuth, (req: Request, res: Response) => {
    const caller = (req as Request & { authCaller?: AuthenticatedCaller }).authCaller;
    if (!caller) return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    const data = userWorkspaceStore.get(caller.username.toLowerCase()) || null;
    return res.json({ data });
  });

  app.put('/api/user-data', requireAuth, (req: Request, res: Response) => {
    const caller = (req as Request & { authCaller?: AuthenticatedCaller }).authCaller;
    if (!caller) return res.status(401).json({ error: 'Autentikasi diperlukan.' });

    const body = req.body as Partial<UserWorkspaceData>;
    if (!Array.isArray(body?.transactions) || body.transactions.length > 2000) {
      return res.status(400).json({ error: 'Format data transaksi tidak valid.' });
    }

    const sanitizedTransactions: StoredTransaction[] = body.transactions
      .filter((t): t is StoredTransaction => {
        return (
          Boolean(t) &&
          typeof t.id === 'string' &&
          t.id.length > 0 &&
          t.id.length <= 128 &&
          (t.type === 'income' || t.type === 'expense') &&
          typeof t.amount === 'number' &&
          Number.isFinite(t.amount) &&
          t.amount > 0 &&
          typeof t.category === 'string' &&
          typeof t.date === 'string' &&
          typeof t.description === 'string'
        );
      })
      .map((t) => ({
        id: t.id.slice(0, 128),
        type: t.type,
        amount: t.amount,
        category: t.category.slice(0, 50),
        date: t.date.slice(0, 10),
        description: t.description.slice(0, 200),
      }));

    const existing = userWorkspaceStore.get(caller.username.toLowerCase());
    let sanitizedSiteTexts: StoredSiteTexts | undefined = existing?.siteTexts;
    if (body.siteTexts && typeof body.siteTexts === 'object') {
      const s = body.siteTexts as Partial<StoredSiteTexts>;
      const cleanStr = (val: unknown, fallback: string, maxLen: number) =>
        typeof val === 'string' && val.trim().length > 0 ? val.trim().slice(0, maxLen) : fallback;
      sanitizedSiteTexts = {
        appTitle: cleanStr(s.appTitle, existing?.siteTexts?.appTitle || 'DompetKu', 80),
        appDescription: cleanStr(s.appDescription, existing?.siteTexts?.appDescription || 'Pengelola Keuangan & Anggaran Pintar', 160),
        cashflowTitle: cleanStr(s.cashflowTitle, existing?.siteTexts?.cashflowTitle || 'Arus Kas Bulanan', 80),
        cashflowDescription: cleanStr(s.cashflowDescription, existing?.siteTexts?.cashflowDescription || 'Perbandingan pemasukan dan pengeluaran per bulan', 160),
        expenseDistTitle: cleanStr(s.expenseDistTitle, existing?.siteTexts?.expenseDistTitle || 'Distribusi Pengeluaran', 80),
        expenseDistDescription: cleanStr(s.expenseDistDescription, existing?.siteTexts?.expenseDistDescription || 'Berdasarkan kategori', 160),
        recentTitle: cleanStr(s.recentTitle, existing?.siteTexts?.recentTitle || 'Transaksi Terbaru', 80),
        recentDescription: cleanStr(s.recentDescription, existing?.siteTexts?.recentDescription || 'Aktivitas keuangan terakhir Anda', 160),
        allTrxTitle: cleanStr(s.allTrxTitle, existing?.siteTexts?.allTrxTitle || 'Daftar Seluruh Transaksi', 80),
      };
    }

    const nextData: UserWorkspaceData = {
      transactions: sanitizedTransactions,
      siteTexts: sanitizedSiteTexts,
      theme: body.theme === 'light' || body.theme === 'dark' ? body.theme : existing?.theme,
      updatedAt: new Date().toISOString(),
    };

    userWorkspaceStore.set(caller.username.toLowerCase(), nextData);
    return res.json({ ok: true, updatedAt: nextData.updatedAt });
  });

  if (process.env.NODE_ENV !== 'production') {
    // Vite middleware for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
