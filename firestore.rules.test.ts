/**
 * Payload-First Security TDD specification for Firestore rules validation.
 * Verifies that all "Dirty Dozen" payloads violate the blueprint invariants.
 */

export interface DirtyDozenCase {
  name: string;
  targetPath: string;
  payload: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    name: '1. Unauthenticated create',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'user1', type: 'income', amount: 1000 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified email token',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'user1', type: 'income', amount: 1000 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '3. Cross-tenant userId spoofing',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'victimUser', type: 'expense', amount: 500 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '4. Path ID poisoning',
    targetPath: '/users/user1/transactions/invalid$id',
    payload: { id: 'invalid$id', userId: 'user1', type: 'expense', amount: 500 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '5. Ghost field injection',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'user1', type: 'income', amount: 500, isAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '6. Immutable createdAt mutation on update',
    targetPath: '/users/user1/transactions/trx1',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '7. Negative transaction amount',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'user1', type: 'expense', amount: -100 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '8. Oversized description (>200 chars)',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'user1', type: 'expense', amount: 100, description: 'x'.repeat(201) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '9. Invalid date format',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'user1', type: 'expense', amount: 100, date: '25-11-2026' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '10. Client-forged timestamp',
    targetPath: '/users/user1/transactions/trx1',
    payload: { id: 'trx1', userId: 'user1', type: 'expense', amount: 100, createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '11. Cross-user list query',
    targetPath: '/users/otherUser/transactions',
    payload: {},
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '12. Oversized appTitle in preferences',
    targetPath: '/users/user1/settings/preferences',
    payload: { userId: 'user1', appTitle: 'A'.repeat(81), theme: 'dark' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
