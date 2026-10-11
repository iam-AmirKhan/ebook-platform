# Manual Payment Verification Architecture - Analysis Summary

## Current State Assessment

### ✅ Completed Work (Must Preserve)
1. **Authentication & Authorization**
   - Auth.js v5 with credentials + Google OAuth configured
   - Session helpers: \getCurrentUser()\, \equireUser()\
   - Role-based authorization: \equireAdmin()\, \equireAuthor()\, \equireRole()\
   - Protected routes: /account, /admin-test, /author-test

2. **Database Models**
   - All 8 core Mongoose models implemented
   - Order model: status enum includes PENDING, PAID, FAILED, CANCELLED, REFUNDED
   - Purchase model: compound index {user: 1, book: 1} for ownership lookups
   - Order ≠ Purchase separation principle already established

3. **Existing Routes**
   - Homepage, login, register, account
   - /books and /books/[slug] exist (need to verify implementation)
   - /forbidden page exists
   - Test pages: /admin-test, /author-test

4. **Project Infrastructure**
   - Next.js 16 App Router with Server Actions
   - MongoDB Atlas with Mongoose ODM
   - TypeScript with strict typing
   - Zod for validation
   - Tailwind CSS + shadcn/ui

### ❌ Obsolete/Incompatible Items from Old Design
1. **MockPaymentProvider Architecture**
   - Payment attempt UUID system
   - Transaction ID format: \MOCK_TXN_{attemptId}_{timestamp}\
   - Mock payment simulator UI with Success/Failure/Cancel buttons
   - PaymentProvider interface abstraction
   - Automatic verification flow

2. **Automated Payment Callbacks**
   - \erifyPaymentCallback\ server action
   - Provider.verifyPayment() method
   - Transaction ID validation logic
   - Payment URL generation

3. **ACID Transaction Requirements**
   - MongoDB transaction verification utility
   - Atomic order fulfillment with session management
   - \erifyTransactionSupport()\ startup check

4. **Payment Attempt ID System**
   - \paymentAttemptId\ field on Order model
   - UUID v4 generation for payment attempts
   - Stale attempt rejection logic

## New Manual Payment Architecture

### Reader Flow
1. Reader selects books → \createOrderFromCart\ creates PENDING order
2. Checkout page displays:
   - Order summary (items, prices, total)
   - Payment instructions (configurable bKash/Nagad details)
   - Payment submission form
3. Reader submits payment details:
   - Payment method: BKASH | NAGAD
   - Transaction ID (from their payment app)
   - Sender phone number (optional)
4. Order status: PENDING → PAYMENT_SUBMITTED
5. Reader sees "Awaiting Admin Approval" status
6. After admin approval: Order PAYMENT_SUBMITTED → PAID, Purchases created
7. Reader gains ebook access

### Admin Flow
1. Admin dashboard lists PAYMENT_SUBMITTED orders
2. Admin reviews:
   - Order ID, reader info, books, amount
   - Payment method, transaction ID, sender phone
   - Submission timestamp
3. Admin verifies transaction manually (external to app)
4. Admin approves or rejects:
   - **Approve**: Order → PAID, create Purchases atomically
   - **Reject**: Order → REJECTED, record reason
5. Audit trail: reviewer ID, review timestamp, rejection reason

### Required Changes

#### 1. Order Model Enhancements
\\\	ypescript
// Add new fields
paymentMethod: "BKASH" | "NAGAD" | "MOCK" | "SSLCOMMERZ"
submittedTransactionId?: string | null  // Reader-provided txn ID
submittedPhoneNumber?: string | null    // Reader-provided sender phone
submittedAt?: Date | null                // Payment submission timestamp
reviewedBy?: ObjectId | null             // Admin who reviewed
reviewedAt?: Date | null                 // Review timestamp
rejectionReason?: string | null          // Why admin rejected

// Add new status
status: "PENDING" | "PAYMENT_SUBMITTED" | "PAID" | "REJECTED" | "FAILED" | "CANCELLED" | "REFUNDED"
\\\

#### 2. Server Actions Needed
\\\	ypescript
// src/actions/checkout.ts
createOrderFromCart(input)              // ✅ Already planned
getOrderDetails(orderId)                // ✅ Already planned
submitPaymentDetails(orderId, details)  // 🆕 Reader submits payment
approvePayment(orderId)                 // 🆕 Admin approves (creates Purchases)
rejectPayment(orderId, reason)          // 🆕 Admin rejects
listPendingPayments()                   // 🆕 Admin dashboard data
checkUserOwnsBook(userId, bookId)       // ✅ Already planned
\\\

#### 3. Pages Needed
- \/checkout/[orderId]\ - Order review + payment instructions + submission form
- \/checkout/submitted/[orderId]\ - Awaiting approval status
- \/checkout/success/[orderId]\ - Payment approved confirmation
- \/checkout/rejected/[orderId]\ - Payment rejected with reason
- \/admin/payments\ - Admin payment review dashboard (ADMIN only)

#### 4. Security Requirements
- ✅ Price integrity: All prices fetched server-side (already planned)
- ✅ Order ownership: Session user must own order (already planned)
- ✅ Admin authorization: \equireAdmin()\ for approval/rejection
- ✅ Duplicate prevention: Check existing ACTIVE Purchases before creation
- 🆕 Concurrent approval protection: Atomic status check + update
- 🆕 Self-approval prevention: Reject if reviewer === order.user
- 🆕 Idempotent approval: Skip if order already PAID

#### 5. Status Transitions
\\\
PENDING
  ↓ (reader submits payment)
PAYMENT_SUBMITTED
  ↓ (admin approves)        ↓ (admin rejects)
PAID                       REJECTED
\\\

Valid transitions:
- PENDING → PAYMENT_SUBMITTED (reader action)
- PAYMENT_SUBMITTED → PAID (admin approval)
- PAYMENT_SUBMITTED → REJECTED (admin rejection)
- REJECTED → PAYMENT_SUBMITTED (reader resubmits with new txn ID)

Invalid:
- PAID → any status (except REFUNDED by admin)
- PENDING → PAID (must go through PAYMENT_SUBMITTED)
- Reader cannot transition order to PAID

## Migration Strategy

### Preserve
- All existing Order and Purchase model structure
- \createOrderFromCart\ logic (validation, ownership checks, price calculation)
- Purchase fulfillment logic (iterate items, create ACTIVE purchases)
- Idempotent purchase creation pattern
- Order expiration (24 hours for PENDING orders)

### Remove/Skip
- MockPaymentProvider class and interface
- Payment attempt UUID system
- Transaction ID parsing utilities
- MongoDB transaction verification (optional for manual flow)
- Mock payment simulator UI
- Automatic payment callbacks

### Add
- Payment submission fields on Order model
- PAYMENT_SUBMITTED and REJECTED statuses
- \submitPaymentDetails\ server action
- \pprovePayment\ server action with admin auth + atomic fulfillment
- \ejectPayment\ server action with admin auth
- Admin payment review dashboard
- Payment instructions configuration (environment variables or database config)

## Implementation Risks

### Low Risk
- Schema migrations (adding optional fields to Order model)
- Admin authorization (helpers already exist)
- Payment submission form validation

### Medium Risk
- Concurrent admin approval handling (need atomic status checks)
- Idempotent approval logic (must not duplicate purchases)
- Order expiration for PAYMENT_SUBMITTED status (extend expiration?)

### High Risk
- None identified (manual verification simpler than automated gateway)

## Testing Checklist
- [ ] Reader cannot approve own payment
- [ ] Admin cannot approve without ADMIN role
- [ ] Concurrent approvals don't duplicate purchases
- [ ] Price tampering rejected (client prices ignored)
- [ ] Already-owned books rejected at checkout
- [ ] Expired orders cannot be submitted
- [ ] Rejected orders can be resubmitted
- [ ] Transaction ID required for submission
- [ ] Approval creates exact number of purchases matching order items
- [ ] PAID orders cannot be re-approved
