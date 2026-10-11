# Requirements Document: Manual bKash/Nagad Payment Verification

## Introduction

The Manual Payment Verification System implements a complete checkout-to-ownership flow for purchasing digital ebooks through external bKash and Nagad mobile financial services (MFS), with manual administrative verification. This feature eliminates automated payment gateway integration during MVP phase while establishing robust order management, payment validation, and ownership granting patterns that prepare the platform for future automated gateway integration.

This specification strictly enforces the critical architectural principle: **Order ≠ Purchase**. An Order represents a transient payment lifecycle (PENDING → PAYMENT_SUBMITTED → PAID/REJECTED), while a Purchase represents a durable, auditable digital ownership entitlement. Purchases are created ONLY after administrative verification confirms an Order is PAID.

**Key Technical Approaches:**
- **MongoDB Transactions**: All critical operations (payment submission, approval, rejection) use `mongoose.startSession()` and `session.withTransaction()` for ACID compliance and automatic rollback
- **Unique Compound Indexes**: Database-level enforcement of transaction ID uniqueness and active purchase constraints using `partialFilterExpression`
- **Submission History Array**: Complete audit trail preservation in `Order.submissionHistory` documenting every submission attempt, approval, and rejection
- **Type-Safe Comparisons**: ObjectId.toString() comparisons for self-approval prevention ensuring referential integrity
- **Configuration-Based Instructions**: Customer-facing payment instructions via environment variables without API integration requirements

## Glossary

- **Manual_Verification**: Administrative process where a human admin manually verifies payment transactions against external bKash/Nagad merchant records before granting digital ownership
- **Payment_Submission**: Reader-initiated submission of external payment evidence including transaction ID, phone number, and payment method
- **Admin_Approval**: Administrator action verifying external payment and atomically creating Purchase records for ebook access using MongoDB transactions
- **Admin_Rejection**: Administrator action declining payment verification with documented reason, allowing reader resubmission
- **Order**: A transient database record tracking payment transaction lifecycle (status: PENDING → PAYMENT_SUBMITTED → PAID/REJECTED/CANCELLED/REFUNDED)
- **Purchase**: A durable database record granting permanent digital ownership of a specific book to a specific user
- **Ownership_Check**: Server-side validation verifying whether a user already owns a book via an ACTIVE Purchase record
- **Self-Approval_Prevention**: Security control preventing administrators from approving their own orders using type-safe ObjectId.toString() comparisons (separation of duties)
- **Idempotent_Approval**: Approval operation that produces consistent results regardless of retry attempts or concurrent executions using MongoDB transaction isolation
- **Duplicate_Detection**: Prevention mechanism using unique compound index with partialFilterExpression blocking resubmission of identical transaction IDs across different users
- **Audit_Trail**: Complete record of order status transitions including reviewer identity, timestamp, and rejection rationale preserved in submissionHistory array
- **Order_Item**: Server-validated order line item containing server-fetched book metadata (title, price) and quantity
- **Cart_Item**: Client-submitted book identifier (ObjectId) representing a book the user intends to purchase
- **Checkout_Page**: Protected UI where users review order summary, view payment instructions, and submit payment details
- **Admin_Dashboard**: Protected interface where administrators review pending payments, verify transactions, and approve/reject orders
- **Awaiting_Page**: Reader UI displaying pending approval status with order details and estimated review timeline
- **Success_Page**: Reader UI confirming payment approval and granting ebook access
- **Rejection_Page**: Reader UI explaining payment rejection with admin-provided reason and resubmission link
- **Price_Tampering**: Security attack where malicious client submits falsified prices to reduce payment amounts
- **Session_User**: Authenticated user identity obtained via `getCurrentUser()` or `requireUser()` session helpers
- **Server_Action**: Next.js server-side mutation function marked with "use server" processing client requests
- **Zod_Schema**: TypeScript-first validation schema that parses and validates input data structures
- **MongoDB_Transaction**: ACID-compliant database transaction using `mongoose.startSession()` and `session.withTransaction()` ensuring atomic operations with automatic rollback on failure
- **Submission_History**: Array field in Order model preserving chronological record of all payment submissions, approvals, and rejections with complete audit metadata

## Requirements

### Requirement 1: Order Creation from Cart

**User Story:** As a reader, I want to create payment orders from selected books, so that I can purchase multiple ebooks in one transaction.

#### Acceptance Criteria

1. WHEN a reader submits cart items with payment method selection, THE Checkout_System SHALL require authentication via `requireUser()` session helper
2. THE Checkout_System SHALL validate input using a Zod schema (CreateOrderInput) requiring: book ObjectIds array, payment method (BKASH or NAGAD), and quantity per item
3. FOR EACH cart item, THE Checkout_System SHALL fetch current price and discountPrice from the Book database model (server-side only)
4. THE Checkout_System SHALL reject any client-submitted prices, discounts, or totals
5. THE Checkout_System SHALL verify each book exists in database and status equals PUBLISHED; IF NOT, THEN reject checkout with "Book not available for purchase"
6. FOR EACH cart item, THE Checkout_System SHALL query Purchase collection for existing {user: Session_User.id, book: cart_item.book, status: ACTIVE} records
7. IF an ACTIVE Purchase exists for any cart item, THEN THE Checkout_System SHALL reject checkout with error "You already own: {book title}"
8. THE Checkout_System SHALL calculate subtotal as sum of (discountPrice OR price) multiplied by quantity for all items
9. THE Checkout_System SHALL calculate total = subtotal - discount (initially discount = 0)
10. WHEN all validations pass, THE Checkout_System SHALL create Order with status PENDING, set Order.paymentMethod to submitted value (BKASH or NAGAD), and return Order._id

### Requirement 2: Order Authorization and Access Control

**User Story:** As a reader, I want order access restricted to my account, so that other users cannot view or manipulate my payment orders.

#### Acceptance Criteria

1. WHEN a user requests order details, THE Checkout_System SHALL verify Session_User.id matches Order.user
2. IF Session_User.id does not match Order.user, THEN THE Checkout_System SHALL return HTTP 403 Forbidden
3. THE Checkout_System SHALL reject unauthenticated requests to order endpoints with redirect to /login
4. WHEN an admin views orders, THE Checkout_System SHALL allow access via `requireAdmin()` authorization helper
5. THE Checkout_System SHALL use compound index {user: 1, createdAt: -1} for efficient user order history queries

### Requirement 3: Payment Submission by Reader

**User Story:** As a reader, I want to submit external payment evidence, so that I can progress toward order approval after making bKash/Nagad payment.

#### Acceptance Criteria

1. WHEN a reader initiates payment submission, THE Checkout_System SHALL require authentication via `requireUser()` and order ownership verification
2. THE Checkout_System SHALL validate input via Zod schema requiring: orderId (valid ObjectId), submittedTransactionId (string 5-100 chars), submittedPhoneNumber (Bangladesh mobile format 01XXXXXXXXX)
3. THE Checkout_System SHALL verify order exists; IF NOT, THEN return error "Order not found"
4. THE Checkout_System SHALL verify order status is PENDING or REJECTED (allowing resubmission); IF other status, THEN return appropriate error
5. THE Checkout_System SHALL verify order is not expired (created more than 24 hours ago); IF expired, THEN return error "Order expired (created {hours}h ago). Please create a new order."
6. THE Checkout_System SHALL use MongoDB transactions with `mongoose.startSession()` and `session.withTransaction()` for atomic payment submission
7. WITHIN the transaction, THE system SHALL check for duplicate transaction IDs across different users and return error if found
8. WITHIN the transaction, THE system SHALL atomically update Order status to PAYMENT_SUBMITTED, set submittedTransactionId, submittedPhoneNumber, and submittedAt timestamp
9. WITHIN the transaction, THE system SHALL append new entry to submissionHistory array with transactionId, phoneNumber, submittedAt, and status "SUBMITTED"
10. IF MongoDB transaction fails due to concurrent modifications or constraint violations, THE system SHALL rollback all changes and return appropriate error
11. WHEN payment submission succeeds, THE reader SHALL be shown "Awaiting Admin Approval" status with order details and estimated review timeline

### Requirement 4: Admin Payment Review Dashboard

**User Story:** As an administrator, I want a dashboard listing pending payments, so that I can review and verify payment transactions.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL be accessible at protected route `/admin/payments` requiring `requireAdmin()` authorization
2. THE Dashboard SHALL list all orders with status PAYMENT_SUBMITTED, sorted by submittedAt (oldest first)
3. FOR EACH pending order, THE Dashboard SHALL display: Order ID, reader info (name, email), books purchased, payment method, transaction ID, sender phone, submission timestamp
4. THE Dashboard SHALL provide clickable order rows opening detailed review UI
5. THE Dashboard SHALL display estimated admin approval volume and response time expectations
6. THE Dashboard SHALL provide search/filter by: order ID, reader email, payment method (BKASH/NAGAD)
7. THE Dashboard SHALL display pagination supporting 25, 50, or 100 orders per page

### Requirement 5: Admin Payment Approval with Atomic Fulfillment

**User Story:** As an administrator, I want to approve verified payments and grant ebook ownership, so that readers gain access to purchased books.

#### Acceptance Criteria

1. THE Admin_Approval action SHALL require `requireAdmin()` authorization; IF not admin, THEN redirect to /forbidden
2. WHEN admin attempts approval, THE system SHALL verify order status is PAYMENT_SUBMITTED; IF other status, THEN return appropriate error
3. THE system SHALL prevent self-approval using type-safe ObjectId comparison: IF reviewedBy.toString() equals order.user.toString(), THEN return error "Cannot approve your own order. Separation of duties required."
4. THE system SHALL use MongoDB transactions with `mongoose.startSession()` and `session.withTransaction()` for atomic approval and fulfillment
5. WITHIN the transaction, THE system SHALL use conditional update: `{_id: orderId, status: "PAYMENT_SUBMITTED"}` to atomically change status to PAID
6. IF conditional update returns 0 matched documents (concurrent modification detected), THE system SHALL check current order status within transaction for idempotent handling
7. WITHIN the transaction, THE system SHALL atomically record admin review metadata: reviewedBy (admin ObjectId), reviewedAt (timestamp), rejectionReason = null
8. WITHIN the transaction, THE system SHALL append approval entry to submissionHistory array with status "APPROVED", reviewedBy, reviewedAt
9. FOR EACH Order_Item within the transaction, THE system SHALL create one Purchase record with: user=Order.user, book=Order_Item.book, order=Order._id, price=Order_Item.price, status=ACTIVE, purchasedAt=current timestamp
10. WITHIN the transaction, THE system SHALL check for existing ACTIVE purchases with {user, book, status: ACTIVE} and skip creation if found (idempotent duplicate prevention)
11. IF any step fails during the MongoDB transaction, THE system SHALL automatically rollback entire transaction and return error directing admin to contact support
12. ON successful transaction commit, THE system SHALL log: Order ID, admin ID, reader ID, purchase count, total amount

### Requirement 6: Admin Payment Rejection with Documented Reason

**User Story:** As an administrator, I want to reject unverified payments with clear reason, so that readers understand why payment failed and can resubmit.

#### Acceptance Criteria

1. THE Admin_Rejection action SHALL require `requireAdmin()` authorization; IF not admin, THEN redirect to /forbidden
2. WHEN admin attempts rejection, THE system SHALL validate input: orderId and rejectionReason (10-500 chars, required)
3. THE system SHALL verify order status is PAYMENT_SUBMITTED; IF other status, THEN return appropriate error
4. THE system SHALL prevent self-rejection using type-safe ObjectId comparison: IF reviewedBy.toString() equals order.user.toString(), THEN return error "Cannot reject your own order. Separation of duties required."
5. THE system SHALL use MongoDB transactions with `mongoose.startSession()` and `session.withTransaction()` for atomic rejection
6. WITHIN the transaction, THE system SHALL use conditional update: `{_id: orderId, status: "PAYMENT_SUBMITTED"}` to atomically change status to REJECTED
7. WITHIN the transaction, THE system SHALL atomically record reviewedBy, reviewedAt, and rejectionReason fields
8. WITHIN the transaction, THE system SHALL append rejection entry to submissionHistory array with status "REJECTED", rejectionReason, reviewedBy, reviewedAt
9. THE system SHALL NOT create any Purchase records for rejected orders within or outside the transaction
10. IF MongoDB transaction fails due to concurrent modifications, THE system SHALL rollback all changes and return appropriate error
11. WHEN rejection transaction succeeds, THE system SHALL log: Order ID, admin ID, reader ID, rejection reason
12. THE reader SHALL receive notification explaining rejection reason and providing link to resubmit payment with new transaction ID

### Requirement 7: Reader Resubmission After Rejection

**User Story:** As a reader, I want to resubmit payment after rejection, so that I can correct transaction details and complete purchase.

#### Acceptance Criteria

1. WHEN an order status is REJECTED, THE Checkout_Page SHALL display rejection reason provided by admin from submissionHistory array
2. THE Checkout_Page SHALL provide "Resubmit Payment" button returning to payment submission form
3. WHEN reader resubmits with new transaction ID, THE system SHALL accept submission using MongoDB transaction (allows REJECTED → PAYMENT_SUBMITTED transition)
4. THE system SHALL require NEW transaction ID (different from previous submission) enforced by unique compound index to prevent re-processing identical failed payments
5. THE system SHALL allow unlimited resubmission attempts until approval or order expiration, with each attempt recorded in submissionHistory array
6. EACH resubmission SHALL append new entry to submissionHistory preserving complete chronological audit trail of attempts

### Requirement 8: Duplicate Transaction ID Detection

**User Story:** As a security engineer, I want duplicate transaction IDs detected, so that duplicate payment processing is prevented.

#### Acceptance Criteria

1. THE Checkout_System SHALL create unique compound index on Order collection: `{submittedTransactionId: 1, paymentMethod: 1, status: 1}` with `partialFilterExpression` for non-null transaction IDs and status in ["PAYMENT_SUBMITTED", "PAID"]
2. WHEN reader submits payment details within MongoDB transaction, THE system SHALL check for existing orders from different users with same transaction ID and payment method
3. IF duplicate detected on SAME order (idempotent resubmission), THE system SHALL return success within the transaction
4. IF duplicate detected on DIFFERENT user's order, THE system SHALL return error "Transaction ID already used by another user" and rollback transaction
5. THE unique compound index SHALL enforce constraint at database level, preventing concurrent duplicate submissions across multiple application instances
6. THE system SHALL log all duplicate detection attempts for audit trail with user IDs and transaction outcomes

### Requirement 9: Idempotent Admin Approval Operations

**User Story:** As a platform engineer, I want idempotent approval operations, so that concurrent admin actions or retries do not duplicate purchases.

#### Acceptance Criteria

1. WHEN admin approves order already in PAID status, THE system SHALL verify Purchase records exist matching order items count within transaction context
2. IF Purchase records match exactly, THE system SHALL return success response indicating "Order already approved and fulfilled" without modifying data
3. IF Purchase count mismatch (less than order items), THE system SHALL return error directing admin to contact support indicating data inconsistency
4. THE system SHALL use MongoDB transaction conditional updates to prevent race conditions during concurrent approval attempts
5. THE system SHALL handle transaction rollback gracefully when concurrent modifications are detected, returning appropriate status messages
6. THE system SHALL log idempotent operation detections with transaction outcomes for audit purposes
7. THE system SHALL NOT raise errors when legitimate idempotent conditions are detected during transaction processing

### Requirement 10: Concurrent Admin Approval Handling

**User Story:** As a platform engineer, I want protection against concurrent admin approval, so that race conditions do not create duplicate purchases.

#### Acceptance Criteria

1. WHEN multiple admins attempt simultaneous approval of same order, THE system SHALL use MongoDB transactions with conditional updates: `{_id: orderId, status: "PAYMENT_SUBMITTED"}`
2. IF conditional update within transaction affects 0 documents, THE system SHALL immediately check current order status within same transaction session
3. IF status is already PAID within transaction, THE system SHALL verify Purchase count matches order items and return idempotent success
4. THE system SHALL use `session.withTransaction()` to ensure all operations (status update, Purchase creation, history recording) are atomic
5. THE MongoDB transaction SHALL automatically rollback on any failure, preventing partial state updates
6. THE system SHALL NOT create duplicate Purchases regardless of retry count or concurrent attempts due to transaction isolation
7. THE system SHALL log concurrent approval attempts with transaction outcomes and timestamps from each admin for audit trail

### Requirement 11: Audit Trail Recording

**User Story:** As an administrator, I want complete audit trail of payment decisions, so that I can review historical approvals/rejections and investigate disputes.

#### Acceptance Criteria

1. EVERY order status transition SHALL record: current timestamp via Order.updatedAt, transition type (PENDING→PAYMENT_SUBMITTED, PAYMENT_SUBMITTED→PAID, etc.)
2. EVERY admin action (approval/rejection) SHALL record: admin user ObjectId (reviewedBy), action timestamp (reviewedAt), action type (approval/rejection)
3. EVERY payment submission and admin action SHALL append entry to Order.submissionHistory array with: transactionId, phoneNumber, submittedAt, status, reviewedBy, reviewedAt, rejectionReason
4. THE submissionHistory array SHALL preserve complete chronological record of all submission attempts, approvals, and rejections for each order
5. EVERY rejection SHALL include admin-provided reason (rejectionReason field, 10-500 chars) in both order fields and submissionHistory entry
6. THE Checkout_System SHALL log: order ID, user ID, admin ID, action type, timestamp for all payment lifecycle events outside sensitive transaction data
7. THE system SHALL NOT log sensitive details (full transaction IDs, complete phone numbers, bank account info) in application logs
8. AUDIT records SHALL be queryable by admin for: date range, order ID, reader ID, reviewer ID, action type using appropriate indexes

### Requirement 12: Secure Server-Side Price Validation

**User Story:** As a security engineer, I want all prices fetched server-side, so that malicious clients cannot tamper with book prices.

#### Acceptance Criteria

1. WHEN client submits cart items, THE Checkout_System SHALL accept ONLY book ObjectId values
2. THE Checkout_System SHALL reject any client-submitted prices, discounts, totals, or currency values
3. FOR EACH cart item, THE Checkout_System SHALL fetch current Book record and use ONLY server-fetched price fields
4. THE Checkout_System SHALL calculate totals using ONLY server-fetched prices; IF price fetch fails for ANY item, THEN reject entire checkout
5. THE Checkout_System SHALL store calculated prices in Order_Item records, never client-provided values
6. THE system SHALL verify no price modification between checkout display and order creation

### Requirement 13: Book Eligibility Validation at Checkout

**User Story:** As a platform owner, I want checkout to validate book eligibility, so that users cannot purchase invalid or unpublished books.

#### Acceptance Criteria

1. FOR EACH cart item, THE Checkout_System SHALL verify book exists in database
2. FOR EACH cart item, THE Checkout_System SHALL verify book.status is PUBLISHED
3. IF any cart item references non-existent book, THEN reject with error "Book not found: {bookId}"
4. IF any cart item references DRAFT/ARCHIVED book, THEN reject with error "Book not available for purchase: {title}"
5. THE Checkout_System SHALL populate Order_Item.title with server-fetched Book.title value

### Requirement 14: Input Validation and Error Handling

**User Story:** As a security engineer, I want strict input validation, so that malformed requests are rejected before processing.

#### Acceptance Criteria

1. THE Checkout_System SHALL define Zod schemas for: CreateOrderInput, SubmitPaymentInput, ApprovePaymentInput, RejectPaymentInput
2. ALL inputs at entry points (Server Actions) SHALL be validated against schemas before database operations
3. IF validation fails, THE system SHALL return formatted error messages derived from Zod validation
4. THE system SHALL validate ObjectId format matching 24-character hexadecimal pattern before MongoDB queries
5. THE system SHALL handle database operation failures gracefully with generic error messages (no sensitive details exposed)
6. WHEN Order/Book not found, THE system SHALL return "Order not found" or "Book not found" respectively
7. WHEN payment verification fails, THE system SHALL NOT expose external payment gateway details; return generic "Payment could not be verified"

### Requirement 15: Order Expiration

**User Story:** As a platform owner, I want pending orders to expire, so that stale payment sessions do not accumulate.

#### Acceptance Criteria

1. THE Checkout_System SHALL define order expiration threshold of 24 hours
2. WHEN displaying PENDING order older than 24 hours, THE Checkout_Page SHALL display "Order Expired" message
3. THE Checkout_Page SHALL prevent payment submission for expired orders
4. THE system SHALL NOT automatically delete expired orders (preserve audit trail)
5. THE system SHALL NOT allow payment submission for expired orders even if submission is attempted
6. FOR PAYMENT_SUBMITTED orders, THE system SHALL enforce 24-hour expiration to encourage timely admin review

### Requirement 16: Checkout UI - Order Review

**User Story:** As a reader, I want a checkout page, so that I can review my order and complete payment.

#### Acceptance Criteria

1. THE Checkout_Page SHALL display at route `/checkout/[orderId]`
2. THE Checkout_Page SHALL require authentication via `requireUser()` and verify order ownership
3. THE Checkout_Page SHALL display order items with: book title, price (formatted ৳{amount}), quantity, line total
4. THE Checkout_Page SHALL display: subtotal, discount, total in Bangladesh Taka (BDT) with ৳ symbol
5. THE Checkout_Page SHALL display payment method (BKASH or NAGAD) and payment instructions for selected method
6. THE Checkout_Page SHALL prevent navigation until all required payment details collected
7. IF order is not PENDING, THE Checkout_Page SHALL display appropriate status message (PAYMENT_SUBMITTED: "Awaiting Admin Review", PAID: "Already Paid", REJECTED: "Payment Rejected")

### Requirement 17: Checkout UI - Payment Submission Form

**User Story:** As a reader, I want to submit payment evidence, so that I can progress toward payment approval.

#### Acceptance Criteria

1. THE Payment_Submission_Form SHALL collect: transaction ID (text input), sender phone number (text input with Bangladesh format hint)
2. THE Form SHALL display payment instructions for selected method: bKash/Nagad account number, reference code, expected amount
3. THE Form SHALL validate inputs client-side (phone format, transaction ID length) and display validation errors
4. WHEN form is submitted, THE Form SHALL send submitPaymentDetails Server Action
5. UPON success, THE Form SHALL redirect to `/checkout/submitted/[orderId]` (awaiting approval page)
6. UPON error, THE Form SHALL display error message and allow retry
7. THE Form SHALL display estimated admin review timeline (e.g., "Usually reviewed within 2-24 hours")

### Requirement 18: Checkout UI - Awaiting Approval Status

**User Story:** As a reader, I want to see payment approval status, so that I know when my purchase is complete.

#### Acceptance Criteria

1. THE Awaiting_Page SHALL display at route `/checkout/submitted/[orderId]`
2. THE Awaiting_Page SHALL display: "Payment Under Review" heading, order details (items, total), submission timestamp
3. THE Awaiting_Page SHALL display estimated review timeline and explanation of admin verification process
4. THE Awaiting_Page SHALL provide: "Check Status" button refreshing page, "View Catalog" button linking to /books
5. WHEN order transitions to PAID, THE Page SHALL automatically update or provide link to `/checkout/success/[orderId]`
6. WHEN order transitions to REJECTED, THE Page SHALL automatically update or provide link to `/checkout/rejected/[orderId]` with rejection reason

### Requirement 19: Checkout UI - Payment Success Page

**User Story:** As a reader, I want confirmation after successful payment, so that I know my purchase is complete and can access books.

#### Acceptance Criteria

1. THE Success_Page SHALL display at route `/checkout/success/[orderId]`
2. THE Success_Page SHALL display success message "Payment Approved!" with confirmation details
3. THE Success_Page SHALL display order summary: purchased books (titles, authors), total paid in BDT
4. THE Success_Page SHALL display: "View My Library" button linking to `/account` (or `/library` if implemented), "Continue Shopping" button linking to `/books`
5. THE Success_Page SHALL verify order status is PAID before rendering success UI
6. IF order status is not PAID, THE Page SHALL redirect to appropriate status page

### Requirement 20: Checkout UI - Payment Rejection Page

**User Story:** As a reader, I want clear explanation of payment rejection, so that I understand what went wrong and can resubmit.

#### Acceptance Criteria

1. THE Rejection_Page SHALL display at route `/checkout/rejected/[orderId]`
2. THE Rejection_Page SHALL display: "Payment Not Approved" heading with admin-provided rejection reason
3. THE Rejection_Page SHALL explain: "The payment could not be verified. Please review the reason above and resubmit with correct details."
4. THE Rejection_Page SHALL display order summary (items, total, rejection timestamp)
5. THE Rejection_Page SHALL provide: "Resubmit Payment" button returning to `/checkout/[orderId]`, "Back to Catalog" button linking to `/books`
6. THE Rejection_Page SHALL verify order status is REJECTED before rendering rejection UI

### Requirement 21: Payment Method Support (BKASH and NAGAD)

**User Story:** As a reader, I want to choose between bKash and Nagad, so that I can pay using my preferred MFS provider.

#### Acceptance Criteria

1. THE Checkout_System SHALL support payment methods: BKASH, NAGAD (Phase 6 MVP), MOCK (development/testing), SSLCOMMERZ (reserved for Phase 12)
2. THE CreateOrderInput schema SHALL require paymentMethod parameter with enum validation to BKASH or NAGAD
3. THE Checkout_Page SHALL display radio buttons or dropdown allowing reader to select BKASH or NAGAD
4. THE Payment_Instructions SHALL vary by payment method: different bKash account vs. Nagad account numbers, reference codes, instructions
5. EXISTING orders with paymentMethod=MOCK SHALL remain valid and backward-compatible (do not block existing MOCK orders)
6. THE system SHALL NOT allow selection of MOCK method for new orders in production (reserved for development)

### Requirement 22: Payment Configuration Management

**User Story:** As an administrator, I want to configure payment account details, so that I can update bKash/Nagad merchant information without code changes.

#### Acceptance Criteria

1. THE Payment_Instructions_Configuration SHALL include: bKash account number, Nagad account number, reference codes, customer payment descriptions, merchant names
2. Configuration SHALL be manageable via environment variables (BKASH_ACCOUNT, NAGAD_ACCOUNT, PAYMENT_REFERENCE, etc.) for MVP Phase 6
3. THE Checkout_Page SHALL fetch configuration values at render time and display current merchant account details to customers
4. THE Payment_Instructions SHALL display method-specific customer instructions: account numbers to send money to, reference codes to include, expected amounts
5. Configuration changes SHALL take effect on next page render without requiring server restart (environment variable refresh)
6. THE system SHALL NOT store or manage any payment gateway API keys, webhook endpoints, or external service credentials (manual verification only)

### Requirement 23: Purchase Fulfillment and Ownership Verification

**User Story:** As a reader, I want permanent book access after payment approval, so that I can read purchased books indefinitely.

#### Acceptance Criteria

1. WHEN admin approves payment (Order → PAID), THE system SHALL create one Purchase record for EACH Order_Item within MongoDB transaction
2. FOR EACH Purchase within transaction: user=Order.user, book=Order_Item.book, order=Order._id, price=Order_Item.price, status=ACTIVE, purchasedAt=timestamp
3. THE Purchase collection SHALL use unique compound index `{user: 1, book: 1}` with `partialFilterExpression: {status: "ACTIVE"}` to allow historical refunds while preventing duplicate active ownership
4. THE Checkout_System SHALL expose utility `checkUserOwnsBook(userId, bookId): boolean` querying for {user, book, status: "ACTIVE"} Purchase records
5. THE system SHALL prevent duplicate ACTIVE Purchases within transaction: IF {user, book, status: "ACTIVE"} exists, skip creation (idempotent)
6. THE system SHALL NOT create Purchase records until order reaches PAID status via successful transaction completion
7. THE Purchase collection indexes SHALL support efficient ownership queries: `{user: 1, status: 1, purchasedAt: -1}` and `{order: 1}`

### Requirement 24: Concurrent Order Processing Protection

**User Story:** As a platform engineer, I want protection against concurrent processing, so that race conditions do not create data inconsistencies.

#### Acceptance Criteria

1. WHEN updating order status, THE system SHALL use MongoDB transactions with conditional updates including current status in filter: `{_id: orderId, status: CURRENT_STATUS}`
2. IF conditional update within transaction affects 0 documents, THE system SHALL check current order status within same transaction session and handle idempotently
3. THE system SHALL use `mongoose.startSession()` and `session.withTransaction()` for all critical operations ensuring ACID compliance
4. THE system SHALL NOT assume MongoDB multi-document transactions are unavailable; implement proper transaction handling with automatic rollback
5. IF Purchase creation fails after Order status change within transaction, THE system SHALL rely on automatic transaction rollback to maintain consistency
6. THE transaction isolation SHALL prevent phantom reads and dirty writes during concurrent order processing across multiple application instances
7. THE system SHALL log transaction outcomes (commit/rollback) with operation details for debugging concurrent processing issues

### Requirement 25: Logging and Auditability

**User Story:** As a platform administrator, I want comprehensive payment logging, so that I can audit transactions and debug issues.

#### Acceptance Criteria

1. WHEN order created: log user ID, order ID, item count, total amount, payment method
2. WHEN payment submitted: log order ID, user ID, transaction ID (hashed for security), phone number (last 4 digits only)
3. WHEN payment approved: log order ID, admin ID, user ID, purchase count, total amount, transaction outcome (commit/rollback)
4. WHEN payment rejected: log order ID, admin ID, user ID, rejection reason, transaction outcome
5. WHEN duplicate detected: log operation type, order ID, user IDs involved, duplicate detection reason (same order / different user)
6. WHEN idempotent operation: log operation type, order ID, reason, transaction session details
7. WHEN MongoDB transaction fails: log transaction session ID, operation type, rollback reason, affected order ID
8. THE system SHALL NOT log: complete phone numbers, complete transaction IDs, passwords, admin session tokens, sensitive payment details
9. ALL logs SHALL include transaction context (session ID, operation sequence) for debugging concurrent processing issues
10. ALL logs SHALL be queryable by admin for audit/investigation purposes with appropriate log aggregation and search capabilities

### Requirement 26: Type Safety and Data Structures

**User Story:** As a developer, I want strict TypeScript types, so that I catch errors at compile time.

#### Acceptance Criteria

1. THE Checkout_System SHALL define TypeScript interfaces: CreateOrderInput, SubmitPaymentInput, ApprovePaymentInput, RejectPaymentInput, OrderResponse
2. THE system SHALL use Mongoose document types (IOrderDocument, IPurchaseDocument) for database operations
3. THE system SHALL avoid `any` types in payment-related code
4. THE system SHALL export types from shared type definition files for reuse across modules
5. THE system SHALL pass strict TypeScript compilation without errors (`npx tsc --noEmit`)

### Requirement 27: Testing Strategy

**User Story:** As a quality assurance engineer, I want a comprehensive testing approach, so that payment logic is verifiable and reliable.

#### Acceptance Criteria

1. Manual testing scenarios: successful purchase (approve), failed payment (reject), rejected payment resubmission, duplicate transaction ID detection, concurrent approvals, self-approval prevention
2. Integration test scenarios: order creation validation, ownership checks, price integrity, order expiration, concurrent admin actions, idempotent approval
3. Property-based testing: cart validation (varying item counts), price calculation (varying quantities/discounts), transaction ID format validation
4. Documentation: verification commands (`npx tsc --noEmit`, `npm run lint`, `npm run build`), test database seeding requirements
5. Test infrastructure: Vitest for unit tests, MSW for mocking external services (if applicable), MongoDB Memory Server for isolated DB tests

### Requirement 28: Security Headers and Session Protection

**User Story:** As a security engineer, I want CSRF protection on payment endpoints, so that malicious sites cannot forge payment requests.

#### Acceptance Criteria

1. THE Checkout_System SHALL rely on Next.js built-in CSRF protection for Server Actions
2. THE system SHALL verify session authentication before processing any payment action
3. THE system SHALL NOT expose payment endpoints as unprotected public APIs
4. THE Payment_Submission_Form SHALL include anti-CSRF tokens in form submissions (automatic via Next.js)
5. WHEN admin approves/rejects, THE system SHALL verify ADMIN role and active session

### Requirement 29: Currency and Localization

**User Story:** As a platform owner, I want consistent currency handling, so that prices are displayed correctly for Bangladesh market.

#### Acceptance Criteria

1. THE Checkout_System SHALL enforce currency = BDT (Bangladesh Taka) for all orders
2. THE Checkout_Page SHALL display prices with ৳ symbol (Bengali Taka) formatted as: ৳{amount}
3. THE system SHALL store prices as numbers with up to 2 decimal precision
4. THE Checkout_Page SHALL format prices with thousand separators (e.g., ৳1,500.00)
5. THE system SHALL reject orders with currency other than BDT

### Requirement 30: Backwards Compatibility

**User Story:** As a platform maintainer, I want existing orders to remain valid, so that I can safely migrate from test data to manual verification.

#### Acceptance Criteria

1. EXISTING orders with paymentMethod=MOCK SHALL remain queryable and accessible
2. EXISTING orders with any status SHALL NOT be affected by new PAYMENT_SUBMITTED/REJECTED status introduction
3. THE system SHALL allow new orders to use BKASH/NAGAD methods
4. THE Migration to manual verification SHALL NOT delete or modify existing order records
5. ADMIN dashboards SHALL handle both old (MOCK) and new (BKASH/NAGAD) orders gracefully

