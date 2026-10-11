# Design.md Implementation Fixes Summary

This document summarizes the 7 critical implementation-level inconsistencies that need to be fixed in design.md before task generation.

## Fix 1: Transaction ID Format and Order Lookup Inconsistency

**Issue**: Design shows transaction ID format as `MOCK_TXN_{paymentAttemptId}_{timestamp}` but Mock Payment Page code tries to extract orderId (not paymentAttemptId) from the transaction ID.

**Root Cause**: Transaction ID embeds paymentAttemptId (UUID), not orderId. Attempting to parse orderId from position [1] will extract a UUID, not an ObjectId.

**Solution**: 
- Mock Payment Page should extract paymentAttemptId from transaction ID
- Create new server action: `getOrderByPaymentAttemptId(attemptId)` that queries `Order.findOne({paymentAttemptId: attemptId})`
- Return `{success, orderId, error}` from this action
- Use returned orderId for subsequent `getOrderDetails(orderId)` call

**Changes Required**:
1. Update Mock Payment Page (`src/app/checkout/mock-payment/[transactionId]/page.tsx`):
   ```typescript
   // OLD (WRONG):
   const match = transactionId.match(/^MOCK_TXN_([0-9a-fA-F]{24})_(\d+)$/);
   const orderId = match[1]; // This extracts UUID, not orderId!
   
   // NEW (CORRECT):
   const match = transactionId.match(/^MOCK_TXN_([0-9a-f-]{36})_(\d+)$/);
   const paymentAttemptId = match[1];
   const orderResult = await getOrderByPaymentAttemptId(paymentAttemptId);
   const orderId = orderResult.orderId;
   ```

2. Add new server action to `src/actions/checkout.ts`:
   ```typescript
   export async function getOrderByPaymentAttemptId(attemptId: string): Promise<{
     success: boolean;
     orderId?: string;
     error?: string;
   }> {
     const user = await requireUser();
     const order = await Order.findOne({paymentAttemptId: attemptId});
     
     if (!order) {
       return {success: false, error: "Order not found for payment attempt"};
     }
     
     if (order.user.toString() !== user.id) {
       return {success: false, error: "Access denied"};
     }
     
     return {success: true, orderId: order._id.toString()};
   }
   ```

**Acceptance Criteria**:
- Transaction ID regex uses UUID pattern: `^MOCK_TXN_([0-9a-f-]{36})_(\\d+)$`
- `getOrderByPaymentAttemptId` server action exists and queries by attemptId
- Mock Payment Page uses attemptId to lookup orderId (not direct extraction)
- Test: Transaction ID with valid UUID returns correct orderId

---

## Fix 2: Fulfillment-Aware Idempotency

**Issue**: Idempotent success check only verifies `order.status === "PAID"` but doesn't verify that Purchase records were actually created. If order is marked PAID but fulfillment failed (transaction rollback race), repeated callbacks would return success without granting access.

**Root Cause**: Idempotency assumes PAID = fully fulfilled. But transaction rollback scenarios can leave order PAID with zero purchases.

**Solution**: Verify Purchase count matches order.items.length before returning idempotent success.

**Changes Required**:
Update `verifyPaymentCallback` idempotent check in `src/actions/checkout.ts`:

```typescript
// OLD (INCOMPLETE):
if (currentOrder.status === "PAID" && currentOrder.paymentAttemptId === validatedAttemptId) {
  console.log(`Idempotent success: Order ${orderId} already paid with attempt ${validatedAttemptId}`);
  return {success: true, orderId, status: "PAID", transactionId, message: "Already paid"};
}

// NEW (FULFILLMENT-AWARE):
if (currentOrder.status === "PAID" && currentOrder.paymentAttemptId === validatedAttemptId) {
  // Verify fulfillment completed: Purchase count must match order items
  const purchaseCount = await Purchase.countDocuments({
    order: orderId,
    status: "ACTIVE"
  });
  
  if (purchaseCount === currentOrder.items.length) {
    console.log(`Idempotent success: Order ${orderId} already paid and fulfilled (${purchaseCount} purchases)`);
    return {success: true, orderId, status: "PAID", transactionId, message: "Already paid"};
  } else {
    console.warn(`Order ${orderId} marked PAID but incomplete fulfillment: ${purchaseCount}/${currentOrder.items.length} purchases`);
    return {
      success: false,
      error: "Order fulfillment incomplete. Please contact support."
    };
  }
}
```

**Acceptance Criteria**:
- Idempotent PAID check queries `Purchase.countDocuments({order, status: "ACTIVE"})`
- Count must equal `order.items.length` for success response
- Mismatch returns error with support contact message
- Test: Order PAID with 2 items but 1 purchase returns error (not success)

---

## Fix 3: Concurrent Payment Initiation Handling

**Issue**: Design doesn't explicitly document how concurrent `initiatePayment` calls are handled. Should we return the existing attempt or create a new one?

**Root Cause**: Ambiguity in atomic update conditions for payment initiation.

**Solution**: Document the chosen policy: **new attempt invalidates old**. This matches the retry behavior (FAILED → initiate → new attemptId).

**Changes Required**:
Add documentation comment in `initiatePayment` atomic update section:

```typescript
const result = await Order.updateOne(
  {
    _id: orderId,
    status: {$in: ["PENDING", "FAILED", "CANCELLED"]}, // Retriable states only
    createdAt: {$gt: expirationDate},  // Atomic expiration check
    // Concurrent initiation policy: new attempt always wins
    // No paymentAttemptId condition = any request can overwrite
    // This allows retry/refresh but invalidates pending attempts
  },
  {
    $set: {
      paymentAttemptId: attemptId,
      transactionId: transactionId
    }
  }
);
```

**Alternative Considered**: Return existing attempt if paymentAttemptId already set.
**Rejected Because**: User hitting "refresh" or "try again" expects new payment URL, not stale one.

**Acceptance Criteria**:
- Atomic update in `initiatePayment` does NOT include `paymentAttemptId: null` condition
- Comment explains "new attempt invalidates old"
- Two concurrent `initiatePayment` calls both succeed with different attemptIds
- Last writer wins (MongoDB atomic update semantics)

---

## Fix 4: Deterministic Concurrent Success/Failure Handling

**Issue**: If two callbacks arrive simultaneously (one SUCCESS, one FAILED), which wins? Design doesn't specify deterministic resolution.

**Root Cause**: Atomic update uses status condition but outcome depends on timing.

**Solution**: Use conditional atomic update with `paymentAttemptId` in query. First request matching all conditions wins. Second request fails matchedCount check and returns idempotent response.

**Changes Required**:
Enhance `verifyPaymentCallback` atomic update comment:

```typescript
const updateResult = await Order.updateOne(
  {
    _id: orderId,
    status: "PENDING",                    // Must be pending
    paymentAttemptId: validatedAttemptId, // Must match current attempt (prevents stale)
    createdAt: {$gt: expirationDate}      // Must not be expired
    // This condition ensures only ONE concurrent request can transition to PAID
    // First request matching all conditions wins (matchedCount = 1)
    // Subsequent requests fail condition, fetch current order, return idempotent response
    // Race between SUCCESS and FAILED: whichever atomic update executes first wins
  },
  {
    $set: {status: targetStatus} // "PAID" | "FAILED" | "CANCELLED"
  },
  {session}
);
```

**Acceptance Criteria**:
- Atomic update includes paymentAttemptId in query conditions
- Comment explains "only ONE concurrent request can transition"
- Test: Two concurrent callbacks (both SUCCESS), one commits, one gets idempotent response
- Test: Concurrent SUCCESS + FAILED, first to execute wins

---

## Fix 5: Comprehensive Transaction Capability Verification

**Issue**: `verifyTransactionSupport()` only calls `startSession()` → `startTransaction()` → `commitTransaction()`. This doesn't verify MongoDB is actually a replica set or that transactions work.

**Root Cause**: Incomplete verification. `startSession()` succeeds even on standalone MongoDB (fails later during actual transaction usage).

**Solution**: Comprehensive three-step verification:
1. Check MongoDB version (4.0+ required)
2. Check replica set configuration via `isMaster` command
3. Execute actual test transaction with insert operation

**Changes Required**:
Replace `verifyTransactionSupport()` in `src/lib/db/transaction-support.ts`:

```typescript
export async function verifyTransactionSupport(): Promise<{
  supported: boolean;
  error?: string;
}> {
  try {
    const conn = await getMongooseConnection();
    
    // Step 1: Check MongoDB version (transactions require 4.0+)
    const adminDb = conn.db.admin();
    const serverInfo = await adminDb.serverInfo();
    const version = serverInfo.version;
    const majorVersion = parseInt(version.split(".")[0]);
    
    if (majorVersion < 4) {
      return {
        supported: false,
        error: `MongoDB ${version} does not support transactions (requires 4.0+)`
      };
    }
    
    // Step 2: Check replica set configuration
    const isMaster = await adminDb.command({isMaster: 1});
    const isReplicaSet = !!isMaster.setName;
    const isSharded = isMaster.msg === "isdbgrid";
    
    if (!isReplicaSet && !isSharded) {
      return {
        supported: false,
        error: "MongoDB deployment is not a replica set or sharded cluster (required for transactions)"
      };
    }
    
    // Step 3: Test actual transaction execution
    const session = await conn.startSession();
    await session.startTransaction();
    
    // Perform test operation within transaction
    const testCollection = conn.db.collection("_transaction_test");
    await testCollection.insertOne({test: true, timestamp: Date.now()}, {session});
    
    await session.commitTransaction();
    session.endSession();
    
    // Cleanup test document
    await testCollection.deleteOne({test: true});
    
    return {supported: true};
    
  } catch (error) {
    console.error('MongoDB transaction support check failed:', error);
    return {
      supported: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

**Acceptance Criteria**:
- Function checks MongoDB version >= 4.0
- Function checks replica set via `isMaster.setName` or sharded cluster via `isMaster.msg`
- Function executes test transaction with actual insert + commit
- Test document cleanup after verification
- Returns specific error messages for each failure type
- Test: Standalone MongoDB returns "not a replica set" error

---

## Fix 6: Migration Rollback Safety with Explicit Index Name

**Issue**: Migration creates unique index `{order: 1, book: 1}` but rollback calls `dropIndex({order: 1, book: 1})`. If MongoDB assigns a different default name, rollback will fail.

**Root Cause**: Relying on MongoDB's default index naming is non-deterministic.

**Solution**: Explicitly name the index during creation and reference by name during rollback.

**Changes Required**:
Update migration script in design.md and actual implementation:

```typescript
// Migration up():
await Purchase.collection.createIndex(
  {order: 1, book: 1},
  {unique: true, name: "unique_order_book_purchase"} // Explicit name
);
console.log('✓ Created unique index: unique_order_book_purchase');

// Migration down():
await Purchase.collection.dropIndex("unique_order_book_purchase"); // Drop by name
console.log('✓ Dropped unique index: unique_order_book_purchase');
```

**Acceptance Criteria**:
- Index creation includes `name: "unique_order_book_purchase"`
- Rollback drops by name: `dropIndex("unique_order_book_purchase")`
- Migration logs include explicit index name
- Test: Run up migration, verify index name in `getIndexes()`, run down migration, verify removal

---

## Fix 7: Add Testable Acceptance Criteria for Each Fix

**Issue**: Design document doesn't include explicit acceptance criteria for validating the implementation fixes.

**Root Cause**: Missing test-driven specification for fixes.

**Solution**: Add "Acceptance Criteria for Implementation Fixes" subsection to Testing Strategy section with 4-6 testable requirements per fix.

**Changes Required**:
Add new subsection after "Manual Testing Scenarios" in design.md:

```markdown
### Acceptance Criteria for Implementation Fixes

**Fix 1: Transaction ID Format and Order Lookup**
- [ ] Transaction ID parser uses UUID regex: `^MOCK_TXN_([0-9a-f-]{36})_(\\d+)$`
- [ ] Mock Payment Page calls `getOrderByPaymentAttemptId(attemptId)` server action
- [ ] Server action returns `{success, orderId, error}` based on attemptId lookup
- [ ] No client-side orderId extraction from transaction ID
- [ ] Test: Invalid UUID in transaction ID returns parse error

**Fix 2: Fulfillment-Aware Idempotency**
- [ ] Idempotent PAID response includes `Purchase.countDocuments({order, status: "ACTIVE"})` check
- [ ] Purchase count must equal `order.items.length` for success response
- [ ] Count mismatch returns error "Order fulfillment incomplete"
- [ ] Log warning with actual vs expected counts on mismatch
- [ ] Test: Order PAID with missing purchases returns error (not success)

**Fix 3: Concurrent Payment Initiation**
- [ ] `initiatePayment` atomic update includes comment: "new attempt always wins"
- [ ] No paymentAttemptId condition in initiation update query
- [ ] New attemptId generation invalidates pending attempts immediately
- [ ] Test: Two concurrent `initiatePayment` calls both succeed

**Fix 4: Deterministic Concurrent Success/Failure**
- [ ] `verifyPaymentCallback` atomic update includes `paymentAttemptId: validatedAttemptId` in query
- [ ] Comment explains "only ONE concurrent request can transition"
- [ ] First request matching all conditions wins (matchedCount = 1)
- [ ] Second request fetches current order, returns idempotent response
- [ ] Test: Two concurrent success callbacks, one commits, one idempotent

**Fix 5: Comprehensive Transaction Verification**
- [ ] `verifyTransactionSupport()` checks MongoDB version >= 4.0
- [ ] Function checks replica set or sharded cluster via `isMaster` command
- [ ] Function executes actual test transaction with insert + commit
- [ ] Test document cleanup after verification
- [ ] Returns specific error messages for each failure type
- [ ] Test: Standalone MongoDB returns "not a replica set" error

**Fix 6: Migration Rollback Safety**
- [ ] Unique index creation includes `name: "unique_order_book_purchase"`
- [ ] Migration `down()` drops by name: `dropIndex("unique_order_book_purchase")`
- [ ] Migration logs include explicit index name
- [ ] Test: Run up, verify index name, run down, verify removal

**Fix 7: Acceptance Criteria Documentation**
- [ ] This acceptance criteria section exists in design.md
- [ ] Each fix has 4-6 specific, testable criteria
- [ ] Criteria include both implementation requirements and test scenarios
- [ ] All 7 fixes documented with clear validation steps
```

**Acceptance Criteria**:
- Acceptance criteria subsection added to Testing Strategy
- Each of 7 fixes has its own checklist with 4-6 items
- Criteria are specific, testable, and implementation-focused
- Includes both code requirements and test scenarios

---

## Summary of Changes

| Fix # | Section | Type | Impact |
|-------|---------|------|--------|
| 1 | Mock Payment Page | Code Change | Critical - enables correct order lookup |
| 2 | verifyPaymentCallback | Logic Enhancement | High - prevents false idempotent success |
| 3 | initiatePayment | Documentation | Medium - clarifies concurrent behavior |
| 4 | verifyPaymentCallback | Documentation | Medium - explains determinism |
| 5 | verifyTransactionSupport | Code Change | High - prevents runtime transaction failures |
| 6 | Migration Script | Code Change | Medium - ensures rollback safety |
| 7 | Testing Strategy | Documentation | Low - improves validation process |

## Recommended Action

Apply all 7 fixes to design.md before proceeding to task generation. Fixes 1, 2, and 5 involve actual code changes that must be reflected in the design. Fixes 3, 4, 6, and 7 are documentation enhancements that clarify implementation intent and improve testability.

After fixes are applied, the design will be internally consistent and ready for task decomposition.
