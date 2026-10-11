# Manual Payment Verification System - Design Complete

## ✅ Design Document Generated

A comprehensive technical design has been created for the manual bKash/Nagad payment verification system at:
**.kiro/specs/payment-mock-provider/design.md**

### Key Architecture Changes

**From Automated → To Manual:**
- ❌ MockPaymentProvider with payment callbacks → ✅ Admin verification dashboard
- ❌ Payment attempt UUIDs → ✅ Reader-submitted transaction IDs
- ❌ Automatic verification flow → ✅ Human admin approval/rejection
- ❌ Mock simulator UI → ✅ External bKash/Nagad payments

### What's Included in Design

**1. Complete Architecture**
- Reader flow: Cart → Order → External Payment → Submit Details → Await Approval
- Admin flow: Dashboard → Review → External Verify → Approve/Reject
- State machine: PENDING → PAYMENT_SUBMITTED → PAID/REJECTED
- Security layers: Authentication, Authorization, Self-approval prevention

**2. Data Model Specifications**
- Order model enhancements (8 new fields)
- PaymentMethod enum: BKASH | NAGAD
- OrderStatus enum: +PAYMENT_SUBMITTED, +REJECTED
- Schema migrations with indexes

**3. Server Actions (7 total)**
- createOrderFromCart (preserved, enhanced)
- submitPaymentDetails (NEW, reader action)
- approvePayment (NEW, admin-only, atomic)
- rejectPayment (NEW, admin-only, with reason)
- listPendingPayments (NEW, admin dashboard)
- getOrderDetails (preserved, extended)
- checkUserOwnsBook (preserved utility)

**4. UI Components (5 pages)**
- /checkout/[orderId] - payment instructions + submission form
- /checkout/submitted/[orderId] - awaiting admin approval
- /checkout/success/[orderId] - approved confirmation
- /checkout/rejected/[orderId] - rejection notice
- /admin/payments - admin review dashboard

**5. Security Architecture**
- 10 defense-in-depth layers
- Self-approval prevention enforced
- Atomic transactions for fulfillment
- Concurrent approval protection
- Complete audit trail

**6. Implementation Phases**
8 phases: Schema Updates → Server Actions → Reader UI → Admin Dashboard → Testing → Integration → Staging → Production

### Preserved from Original Design

✅ Server-side price integrity
✅ Ownership validation
✅ Book eligibility checks
✅ Order expiration (24 hours)
✅ Purchase fulfillment pattern
✅ Idempotent operations
✅ Input validation with Zod
✅ Error handling patterns

### Removed Components

❌ MockPaymentProvider class/interface
❌ Payment attempt UUID system (paymentAttemptId field)
❌ Transaction ID parsing utilities
❌ Mock payment simulator UI
❌ verifyPaymentCallback server action
❌ MongoDB transaction verification utilities
❌ Payment URL generation logic

## 📋 Next Steps for Implementer

### Before Implementation

1. **Review Design Document**
   - Read complete design.md
   - Verify architecture aligns with business requirements
   - Confirm security boundaries are acceptable
   - Review admin workflow and separation of duties

2. **Requirements Alignment**
   - Verify requirements.md reflects manual payment architecture
   - Update any references to MockPaymentProvider
   - Ensure acceptance criteria match new design

3. **Environment Configuration**
   - Plan for payment instruction configuration:
     - BKASH_ACCOUNT_NUMBER
     - BKASH_ACCOUNT_NAME
     - NAGAD_ACCOUNT_NUMBER
     - NAGAD_ACCOUNT_NAME
     - PAYMENT_INSTRUCTIONS_TEXT

### Implementation Checklist

Phase 1: Schema Updates
- [ ] Update Order model with 8 new fields
- [ ] Update PaymentMethod enum (BKASH, NAGAD)
- [ ] Update OrderStatus enum (+PAYMENT_SUBMITTED, +REJECTED)
- [ ] Add indexes for dashboard queries
- [ ] Run migration script

Phase 2: Server Actions
- [ ] Implement createOrderFromCart (preserve + enhance)
- [ ] Implement submitPaymentDetails (reader submission)
- [ ] Implement approvePayment (atomic, admin-only)
- [ ] Implement rejectPayment (admin-only, with reason)
- [ ] Implement listPendingPayments (admin dashboard data)
- [ ] Implement getOrderDetails (extend for new fields)

Phase 3: Reader UI
- [ ] Build /checkout/[orderId] with payment instructions
- [ ] Build payment submission form
- [ ] Build /checkout/submitted/[orderId] status page
- [ ] Build /checkout/success/[orderId] confirmation
- [ ] Build /checkout/rejected/[orderId] rejection notice

Phase 4: Admin Dashboard
- [ ] Build /admin/payments listing page
- [ ] Implement payment review modal/detail view
- [ ] Add approve/reject action buttons
- [ ] Display order, reader, and payment details
- [ ] Add filters (status, date range, payment method)

Phase 5-8: Testing, Integration, Staging, Production
- [ ] Unit tests for server actions
- [ ] Integration tests for atomic fulfillment
- [ ] Security tests (self-approval, tampering, concurrent)
- [ ] Manual E2E test scenarios
- [ ] Staging deployment verification
- [ ] Production deployment

### Security Testing Priority

**Critical Tests:**
1. Reader cannot approve own payment
2. Non-admin cannot access approval actions
3. Admin cannot approve own orders (self-approval prevention)
4. Client-submitted prices rejected (server-side only)
5. Already-owned books rejected at checkout
6. Concurrent approvals don't duplicate purchases
7. PAID orders cannot be re-approved
8. Transaction audit trail complete

## 🚨 Important Notes

### Migration Considerations

**Existing Code to Preserve:**
- Authentication/authorization helpers (requireUser, requireAdmin)
- Book, User, Purchase models (no changes)
- Homepage, catalog, account pages
- Current routing structure

**Code to Remove/Skip:**
- Any MockPaymentProvider references
- Payment attempt UUID generation
- Transaction ID verification utilities
- Mock simulator components

### Configuration Required

**Environment Variables:**
