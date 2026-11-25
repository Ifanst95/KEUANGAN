import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Blueprint constraint constants (synchronized with firebase-blueprint.json & firestore.rules)
export const MAX_ID_LEN = 128;
export const MAX_CATEGORY_LEN = 50;
export const MAX_DESCRIPTION_LEN = 200;
export const MAX_TITLE_LEN = 80;
export const MAX_SUBTITLE_LEN = 160;
export const MAX_AMOUNT = 1000000000000;
export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const VALID_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface CloudTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
}

export interface CloudPreferences {
  appTitle: string;
  appDescription: string;
  cashflowTitle: string;
  cashflowDescription: string;
  expenseDistTitle: string;
  expenseDistDescription: string;
  recentTitle: string;
  recentDescription: string;
  allTrxTitle: string;
  theme: 'dark' | 'light';
}

function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, MAX_ID_LEN);
  return cleaned.length > 0 && VALID_ID_REGEX.test(cleaned) ? cleaned : `trx_${Date.now()}`;
}

function sanitizeTransactionPayload(trx: CloudTransaction): CloudTransaction {
  const safeId = sanitizeId(trx.id);
  const safeType = trx.type === 'income' ? 'income' : 'expense';
  const safeAmount = Math.min(Math.max(Number(trx.amount) || 1, 1), MAX_AMOUNT);
  const safeCategory = (trx.category || 'Lainnya').trim().slice(0, MAX_CATEGORY_LEN) || 'Lainnya';
  const safeDate = VALID_DATE_REGEX.test(trx.date)
    ? trx.date
    : new Date().toISOString().split('T')[0];
  const safeDescription =
    (trx.description || (safeType === 'income' ? 'Pemasukan' : 'Pengeluaran'))
      .trim()
      .slice(0, MAX_DESCRIPTION_LEN) || 'Transaksi';

  return {
    id: safeId,
    type: safeType,
    amount: safeAmount,
    category: safeCategory,
    date: safeDate,
    description: safeDescription,
  };
}

function sanitizePreferencesPayload(prefs: CloudPreferences): CloudPreferences {
  const clamp = (val: string, fallback: string, maxLen: number) => {
    const trimmed = (val || '').trim().slice(0, maxLen);
    return trimmed.length > 0 ? trimmed : fallback;
  };
  return {
    appTitle: clamp(prefs.appTitle, 'DompetKu', MAX_TITLE_LEN),
    appDescription: clamp(prefs.appDescription, 'Pengelola Keuangan & Anggaran Pintar', MAX_SUBTITLE_LEN),
    cashflowTitle: clamp(prefs.cashflowTitle, 'Arus Kas Bulanan', MAX_TITLE_LEN),
    cashflowDescription: clamp(
      prefs.cashflowDescription,
      'Perbandingan pemasukan dan pengeluaran per bulan',
      MAX_SUBTITLE_LEN
    ),
    expenseDistTitle: clamp(prefs.expenseDistTitle, 'Distribusi Pengeluaran', MAX_TITLE_LEN),
    expenseDistDescription: clamp(prefs.expenseDistDescription, 'Berdasarkan kategori', MAX_SUBTITLE_LEN),
    recentTitle: clamp(prefs.recentTitle, 'Transaksi Terbaru', MAX_TITLE_LEN),
    recentDescription: clamp(prefs.recentDescription, 'Aktivitas keuangan terakhir Anda', MAX_SUBTITLE_LEN),
    allTrxTitle: clamp(prefs.allTrxTitle, 'Daftar Seluruh Transaksi', MAX_TITLE_LEN),
    theme: prefs.theme === 'light' ? 'light' : 'dark',
  };
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export function subscribeToTransactions(
  userId: string,
  onData: (transactions: CloudTransaction[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${userId}/transactions`;
  const q = query(
    collection(db, 'users', userId, 'transactions'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CloudTransaction[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: typeof data.id === 'string' ? data.id : docSnap.id,
          type: data.type === 'income' ? 'income' : 'expense',
          amount: typeof data.amount === 'number' ? data.amount : 0,
          category: typeof data.category === 'string' ? data.category : 'Lainnya',
          date: typeof data.date === 'string' ? data.date : '',
          description: typeof data.description === 'string' ? data.description : '',
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createTransactionInFirestore(
  userId: string,
  trx: CloudTransaction
): Promise<void> {
  const safe = sanitizeTransactionPayload(trx);
  const path = `users/${userId}/transactions/${safe.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'transactions', safe.id), {
      id: safe.id,
      userId,
      type: safe.type,
      amount: safe.amount,
      category: safe.category,
      date: safe.date,
      description: safe.description,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTransactionInFirestore(
  userId: string,
  trx: CloudTransaction
): Promise<void> {
  const safe = sanitizeTransactionPayload(trx);
  const path = `users/${userId}/transactions/${safe.id}`;
  const docRef = doc(db, 'users', userId, 'transactions', safe.id);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        type: safe.type,
        amount: safe.amount,
        category: safe.category,
        date: safe.date,
        description: safe.description,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: safe.id,
        userId,
        type: safe.type,
        amount: safe.amount,
        category: safe.category,
        date: safe.date,
        description: safe.description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTransactionInFirestore(
  userId: string,
  transactionId: string
): Promise<void> {
  const safeId = sanitizeId(transactionId);
  const path = `users/${userId}/transactions/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'transactions', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedOrResetTransactionsInFirestore(
  userId: string,
  transactions: CloudTransaction[],
  replaceExisting: boolean
): Promise<void> {
  const colPath = `users/${userId}/transactions`;
  try {
    const existingQuery = query(
      collection(db, 'users', userId, 'transactions'),
      where('userId', '==', userId)
    );
    const existingSnap = await getDocs(existingQuery);

    if (!replaceExisting && !existingSnap.empty) {
      return;
    }

    const batch = writeBatch(db);
    if (replaceExisting) {
      existingSnap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
    }

    transactions.forEach((trx) => {
      const safe = sanitizeTransactionPayload(trx);
      const ref = doc(db, 'users', userId, 'transactions', safe.id);
      batch.set(ref, {
        id: safe.id,
        userId,
        type: safe.type,
        amount: safe.amount,
        category: safe.category,
        date: safe.date,
        description: safe.description,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}

export function subscribeToPreferences(
  userId: string,
  onData: (prefs: CloudPreferences | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${userId}/settings/preferences`;
  const prefRef = doc(db, 'users', userId, 'settings', 'preferences');

  return onSnapshot(
    prefRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      onData({
        appTitle: typeof data.appTitle === 'string' ? data.appTitle : 'DompetKu',
        appDescription:
          typeof data.appDescription === 'string'
            ? data.appDescription
            : 'Pengelola Keuangan & Anggaran Pintar',
        cashflowTitle: typeof data.cashflowTitle === 'string' ? data.cashflowTitle : 'Arus Kas Bulanan',
        cashflowDescription:
          typeof data.cashflowDescription === 'string'
            ? data.cashflowDescription
            : 'Perbandingan pemasukan dan pengeluaran per bulan',
        expenseDistTitle:
          typeof data.expenseDistTitle === 'string'
            ? data.expenseDistTitle
            : 'Distribusi Pengeluaran',
        expenseDistDescription:
          typeof data.expenseDistDescription === 'string'
            ? data.expenseDistDescription
            : 'Berdasarkan kategori',
        recentTitle: typeof data.recentTitle === 'string' ? data.recentTitle : 'Transaksi Terbaru',
        recentDescription:
          typeof data.recentDescription === 'string'
            ? data.recentDescription
            : 'Aktivitas keuangan terakhir Anda',
        allTrxTitle:
          typeof data.allTrxTitle === 'string' ? data.allTrxTitle : 'Daftar Seluruh Transaksi',
        theme: data.theme === 'light' ? 'light' : 'dark',
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function savePreferencesInFirestore(
  userId: string,
  prefs: CloudPreferences
): Promise<void> {
  const safe = sanitizePreferencesPayload(prefs);
  const path = `users/${userId}/settings/preferences`;
  const prefRef = doc(db, 'users', userId, 'settings', 'preferences');
  try {
    const snap = await getDoc(prefRef);
    if (snap.exists()) {
      await updateDoc(prefRef, {
        appTitle: safe.appTitle,
        appDescription: safe.appDescription,
        cashflowTitle: safe.cashflowTitle,
        cashflowDescription: safe.cashflowDescription,
        expenseDistTitle: safe.expenseDistTitle,
        expenseDistDescription: safe.expenseDistDescription,
        recentTitle: safe.recentTitle,
        recentDescription: safe.recentDescription,
        allTrxTitle: safe.allTrxTitle,
        theme: safe.theme,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(prefRef, {
        userId,
        appTitle: safe.appTitle,
        appDescription: safe.appDescription,
        cashflowTitle: safe.cashflowTitle,
        cashflowDescription: safe.cashflowDescription,
        expenseDistTitle: safe.expenseDistTitle,
        expenseDistDescription: safe.expenseDistDescription,
        recentTitle: safe.recentTitle,
        recentDescription: safe.recentDescription,
        allTrxTitle: safe.allTrxTitle,
        theme: safe.theme,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
