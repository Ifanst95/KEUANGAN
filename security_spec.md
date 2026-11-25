# Security Specification & Payload-First TDD

## 1. Data Invariants
1. Every transaction document under `/users/{userId}/transactions/{transactionId}` belongs exclusively to `userId` (`request.auth.uid`), with `request.auth.token.email_verified == true`.
2. `id` and `userId` are immutable after creation and match their path variables.
3. `type` is strictly `'income'` or `'expense'`, `amount` is a positive number `<= 1000000000000`, `date` matches `YYYY-MM-DD`, and `description` / `category` enforce bounded string lengths.
4. `createdAt` and `updatedAt` are strictly server timestamps (`request.time`); `createdAt` is immutable on update.
5. User preferences under `/users/{userId}/settings/preferences` enforce strict field allowlists, bounded string lengths on all editable titles/descriptions, valid `theme` (`dark` | `light`), and server `updatedAt == request.time`.
6. Ghost/shadow fields are rejected on every create and update via `hasOnly` and `affectedKeys().hasOnly(...)`.

## 2. Dirty Dozen Adversarial Payloads
1. Unauthenticated read/write to `/users/{uid}/transactions/{id}`
2. Unverified email token (`email_verified: false`) attempting create/update
3. Cross-tenant ID spoofing (`userId` in payload != `request.auth.uid`)
4. Path ID poisoning (`transactionId` > 128 chars or containing invalid symbols)
5. Ghost field injection (`{ ..., isAdmin: true }`) on transaction create
6. Shadow update changing `createdAt` or `userId` on transaction update
7. Negative or zero `amount` (`amount: -500`)
8. Oversized `description` (> 200 chars) denial-of-wallet payload
9. Invalid `date` format (`"11/25/2026"`)
10. Client-forged timestamp (`createdAt` != `request.time`)
11. Unauthorized collection listing (`list` without matching `request.auth.uid`)
12. Oversized title/description (> 80 / > 160 chars) or unknown field in `/users/{uid}/settings/preferences`
