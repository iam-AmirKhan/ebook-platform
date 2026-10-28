# Pustoka (পুস্তকা) — Bangladesh's Digital Ebook Marketplace & Publishing Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?logo=react)](https://react.js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_&_GridFS-green?logo=mongodb)](https://www.mongodb.com/)
[![Auth.js](https://img.shields.io/badge/Auth.js-v5_Beta-purple?logo=auth0)](https://authjs.dev/)

**Pustoka** (পুস্তকা) is a full-stack digital reading, ebook sales, and self-publishing marketplace engineered specifically for the Bangladeshi literary and digital publishing ecosystem. 

Built as a unified Next.js App Router application, Pustoka connects readers seeking authentic Bengali and English literature with independent authors and publishers. The platform incorporates local mobile financial service (MFS) workflows, protected in-browser reading environments with anti-piracy protections, author onboarding, chapter-level manuscript composition, and an immutable double-entry financial ledger for transparent royalty tracking.

---

## 📖 Table of Contents

- [Project Overview](#project-overview)
  - [The Problem](#the-problem)
  - [The Pustoka Solution](#the-pustoka-solution)
  - [Target Audience](#target-audience)
  - [Implementation Status](#implementation-status)
- [Key Features by Role](#key-features-by-role)
  - [For Readers](#1-for-readers)
  - [For Authors](#2-for-authors)
  - [For Administrators](#3-for-administrators)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Data Flow & Server Execution](#data-flow--server-execution)
- [Repository Structure](#repository-structure)
- [Core Workflows](#core-workflows)
  - [1. Reader Registration & Authentication](#1-reader-registration--authentication)
  - [2. Author Application & Admin Review](#2-author-application--admin-review)
  - [3. Manuscript Creation & Chapter Management](#3-manuscript-creation--chapter-management)
  - [4. Author Submission for Moderation](#4-author-submission-for-moderation)
  - [5. Admin Moderation & Book Publication](#5-admin-moderation--book-publication)
  - [6. Book Discovery, Cart & Checkout](#6-book-discovery-cart--checkout)
  - [7. Order Verification & Atomic Fulfillment](#7-order-verification--atomic-fulfillment)
  - [8. Protected In-Browser Reading](#8-protected-in-browser-reading)
- [Pricing & Business Validation Rules](#pricing--business-validation-rules)
- [Database Schema & Data Models](#database-schema--data-models)
  - [Entity-Relationship Diagram](#entity-relationship-diagram)
  - [Model Summaries](#model-summaries)
- [Security & Access Control](#security--access-control)
- [Getting Started & Local Development](#getting-started--local-development)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
  - [Database Seeding](#database-seeding)
  - [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Testing & Quality Verification](#testing--quality-verification)
- [Deployment Strategy](#deployment-strategy)
- [Troubleshooting & Common Issues](#troubleshooting--common-issues)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License & Credits](#license--credits)
- [Contact](#contact)

---

<a id="project-overview"></a>
## 🌟 Project Overview

### The Problem
Readers in Bangladesh often face significant hurdles when purchasing and reading digital books:
1. **Limited Payment Accessibility**: International credit card requirements exclude millions of local readers who rely on domestic Mobile Financial Services (bKash, Nagad, Rocket).
2. **Casual Piracy & Lack of Protection**: Authors hesitate to distribute digital manuscripts because unsecured PDF/EPUB files are effortlessly copied, shared, and redistributed without compensation.
3. **Absence of Local Author Self-Publishing**: Emerging writers lack direct, transparent channels to publish manuscripts, set fair pricing in Bangladeshi Taka (BDT), and track transparent royalties.

### The Pustoka Solution
Pustoka provides a modern digital ecosystem addressing these pain points:
- **Domestic Currency & MFS Support**: Pricing in Bangladeshi Taka (৳ BDT) with manual bKash and Nagad order submission and administrative payment verification.
- **Protected Web Reader**: A zero-download, in-browser reading application featuring focus-loss content obscuration, copy-paste prevention, server-side content withholding, and personalized dynamic SVG watermarking.
- **Double-Entry Financial Ledger**: Transparent royalty accounting ensuring every verified sale credits the author and platform accurately with full audit trails.
- **Admin-Moderated Publishing Pipeline**: Authors draft multi-chapter manuscripts and submit them for review; platform administrators verify content quality before public release.

### Target Audience
- **Readers**: Enthusiasts of Bengali fiction, non-fiction, academic literature, and translated works who want an accessible digital reading library.
- **Authors & Writers**: Independent creators, novelists, researchers, and poets seeking a platform to publish and monetize their manuscripts directly.
- **Publishers**: Local publication houses looking to digitize their back-catalogs with robust access controls.

### Implementation Status
Pustoka is currently a **fully functional full-stack MVP**. All core reader, author, administrative, image-storage (MongoDB GridFS), and financial ledger modules are implemented, type-checked, and verified via automated test suites.

---

<a id="key-features-by-role"></a>
## 🎯 Key Features by Role

### 1. For Readers
- **Account & Identity**:
  - Secure credential registration and login with bcrypt password hashing (12 rounds).
  - Google OAuth provider integration architecture.
  - Password reset request workflow with time-limited verification tokens.
- **Book Discovery & Catalog**:
  - Full-text search and category-filtered catalog (`/books`).
  - Sorting options: Featured ranking, newest arrivals, price (low-to-high / high-to-low).
  - Detailed book presentation pages (`/books/[slug]`): Synopsis, learning outcomes, chapter preview index, reader reviews, and author details.
  - Dedicated author directory (`/authors`) and individual author profile pages (`/authors/[slug]`).
- **Cart & Checkout**:
  - User-isolated client cart context (`CartContext`) with persistence across page reloads.
  - Single-book direct checkout (`/checkout/[slug]`) and multi-book cart checkout (`/checkout/cart`).
  - Manual payment submission for **bKash** and **Nagad** with sender phone number and transaction ID validation.
- **Personal Library & Reader**:
  - Authenticated reader dashboard (`/account`) listing purchased books, order history, and reading progress.
  - In-browser reading interface (`ProtectedReader.tsx`):
    - Instant access to free books and preview chapters.
    - Locked chapter delivery via access-controlled API (`/api/books/[slug]/chapters/[order]`).
    - Dynamic SVG watermark overlay showing reader name and account ID.
    - Automatic content blurring on window blur or screen capture tool activation.
    - Text selection and context menu restrictions.
- **Reviews & Ratings**:
  - 1–5 star rating and comment submission on purchased books.

### 2. For Authors
- **Onboarding & Application**:
  - "Become an Author" application form (`/become-author`) with form-data persistence across browser reloads.
  - Profile setup: Pen name, biography, contact information, occupation, and social links.
  - Application lifecycle visibility: `PENDING` (under review), `APPROVED`, or `REJECTED` (with admin reason).
- **Author Dashboard (`/author`)**:
  - **Financial Overview**: Real-time calculation of lifetime earnings, total payouts, pending balance, and current available balance.
  - **Sales Analytics**: Per-book units sold, gross sales, and net author royalties.
  - **Manuscript Studio**: Create books (`/author/books/new`), edit metadata, upload cover artwork, and organize chapters.
  - **Chapter Management**: Structured editor supporting chapter titles, teasers, full body text, and preview toggles (`isPreview`).
  - **Review Submission**: Authors submit completed drafts for administrative moderation. *Direct public publishing by authors is strictly prohibited by business logic.*
  - **Withdrawal Requests**: Submit payout requests via bKash or Nagad, validated against available ledger balance.

### 3. For Administrators
- **Administrative Control Center (`/admin`)**:
  - High-level metric aggregation: Pending author applications, pending books, category tallies, review counts, and platform earnings.
- **Author Application Review (`/admin/author-applications`)**:
  - Review applicant submissions with complete profile details.
  - Approve applications (atomically creating public author records and elevating user roles to `AUTHOR`).
  - Reject applications with structured feedback reasons.
  - Reactivate rejected author applications (`আবার সক্রিয় করুন`), restoring them to `PENDING` review status without duplicate records.
- **Book Catalog Moderation (`/admin/books`)**:
  - Review manuscripts submitted for publication.
  - Publish books that satisfy all quality gates (valid category, >= 10 character description, minimum 5 substantive chapters).
  - Unpublish books back to `DRAFT` status or `ARCHIVE` discontinued titles.
  - **Featured Books Curation**: Rank and reorder featured titles (slots 1–8) with drag-and-drop sequencing and quick toggles.
- **Category Taxonomy (`/admin/categories`)**:
  - Create, update, activate, and deactivate genre classifications with custom slugs and descriptions.
- **Financial & Order Moderation (`/admin/finance`)**:
  - **Order Verification (`/admin/finance/orders`)**: Audit incoming bKash/Nagad transactions, approve valid payments, and mark orders `PAID` (atomically minting `Purchase` records and unlocking library access).
  - **Payout Management (`/admin/finance/withdrawals`)**: Accept pending withdrawal requests (reserving funds) and mark completed payouts as `PAID`.
  - **Platform Settings (`/admin/finance/settings`)**: Configure platform commission percentage (default: 30%), toggle payment methods, and update bKash/Nagad receiving numbers.
- **Review Moderation (`/admin/reviews`)**:
  - Audit reader reviews; approve, reject, or hide inappropriate feedback.

---

<a id="technology-stack"></a>
## 💻 Technology Stack

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `16.3.8` | App Router architecture, Server Components, Server Actions, Turbopack, and API Route Handlers in a single repository. |
| **Runtime / UI** | React / React DOM | `19.2.8` | Concurrent rendering, `useActionState`, `useTransition`, and component composition. |
| **Language** | TypeScript | `^5` | Strict static typing across database schemas, server actions, validators, and component props. |
| **Styling** | Tailwind CSS | `^4` | Utility-first CSS configured with `@tailwindcss/postcss`; CSS variables for dynamic theme adaptation. |
| **Typography** | `next/font` | Built-in | Optimized font delivery: **Hind Siliguri** for Bengali prose and **Inter** for Latin UI/numerals. |
| **Database** | MongoDB Atlas | Cloud | Cloud document database connected through an optimized, hot-reload-safe connection pool. |
| **ODM** | Mongoose | `^9.11.0` | Strongly typed data modeling, validation schemas, indexing, and transactional operations. |
| **Media Storage** | MongoDB GridFS | Built-in | Distributed chunked storage (`book_covers` bucket) for cover images, eliminating ephemeral disk loss in serverless environments. |
| **Authentication** | Auth.js (`next-auth`) | `^5.0.0-beta.32` | JWT session strategy, credentials authentication, and role-based route protection. |
| **Cryptography** | bcryptjs | `^3.0.3` | Password hashing with 12 salt rounds. |
| **Validation** | Zod | `^4.6.5` | Strict schema validation for form payloads, server action arguments, and business logic constraints. |
| **Form Handling** | React Hook Form | `^7.89.0` | High-performance client-side form state management with `@hookform/resolvers`. |
| **Icons** | Lucide React | `^1.52.0` | Consistent, lightweight SVG icon system. |
| **Notifications** | Resend REST API | Native `fetch` | Transactional emails for password resets and publication alerts (fails gracefully when unconfigured). |
| **Analytics** | `@vercel/analytics` | `^2.0.1` | Real-time user performance and traffic metrics. |

---

<a id="system-architecture"></a>
## 🏛 System Architecture

### High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Tier (React 19)"]
        Browser["Web Browser (Next.js App)"]
        ReaderUI["Protected Reader (Canvas / Watermark)"]
        AuthorUI["Author Studio & Dashboard"]
        AdminUI["Admin Control Center"]
    end

    subgraph Server["Next.js Server (App Router)"]
        Actions["Server Actions (src/actions)"]
        Routes["API Route Handlers (src/app/api)"]
        AuthGuards["Role Guards (requireUser, requireAuthor, requireAdmin)"]
        ZodVal["Zod Validation & Business Rules"]
        DAL["Data Access Layer (src/lib/data)"]
        LedgerService["Financial Ledger Engine (src/lib/services)"]
    end

    subgraph Storage["Persistence Tier (MongoDB)"]
        MongoPool["Mongoose Cached Connection Pool"]
        MongoDocs["Core Collections (Users, Books, Orders, etc.)"]
        GridFSBucket["GridFS Bucket (book_covers.files / .chunks)"]
        DoubleEntry["FinancialLedger (Append-Only Audit Trail)"]
    end

    Browser -->|Form Submissions / Mutate| Actions
    Browser -->|Chapter Requests / Stream Covers| Routes
    Actions --> AuthGuards
    Routes --> AuthGuards
    AuthGuards --> ZodVal
    ZodVal --> DAL
    ZodVal --> LedgerService
    DAL --> MongoPool
    LedgerService --> MongoPool
    MongoPool --> MongoDocs
    MongoPool --> GridFSBucket
    MongoPool --> DoubleEntry
```

### Data Flow & Server Execution
1. **Server Actions First**: All data mutations (book editing, author application, order placement, reviews) execute through Next.js Server Actions.
2. **Server-Side Authorization**: Every action verifies authentication (`getCurrentUser()`) and enforces role requirements (`requireUser`, `requireAuthor`, `requireAdmin`) before processing input.
3. **Data Access Layer (DAL)**: Database reads are isolated in `src/lib/data/*`. React Server Components query the DAL directly, minimizing client-server network hops.
4. **Zero-Leakage Content Protection**: Full chapter content for locked chapters is stripped server-side before transmitting initial page props. Only authorized purchasers or admins can retrieve locked chapter bodies via `/api/books/[slug]/chapters/[order]`.
5. **Durable Cover Storage**: Cover uploads are validated for file size (<= 5MB) and binary magic bytes (JPEG/PNG/WebP), then written to MongoDB GridFS. Images are served via `/api/covers/[id]` with long-term immutable caching (`max-age=31536000, immutable`).

---

<a id="repository-structure"></a>
## 📂 Repository Structure

```text
ebook-platform/
├── public/                       # Static public assets (icons, fallback images)
│   ├── favicon.ico
│   ├── icon.png
│   └── uploads/                  # Local development file cache fallback
├── scripts/                      # Automated test scripts & database seed utilities
│   ├── seed-initial-categories.ts # Idempotent Bengali category seeder
│   ├── seed-demo-book.ts         # Sample book seed script
│   ├── test-admin-book-management.ts # Admin moderation test suite
│   ├── test-author-workflow.ts   # Author drafting & submission test suite
│   ├── test-financial-system.mjs # Double-entry ledger test suite
│   ├── test-content-protection.mjs # Protected reader test suite
│   └── test-manual-payment-flow.mjs # bKash/Nagad checkout test suite
├── src/
│   ├── actions/                  # Next.js Server Actions (mutations & workflows)
│   │   ├── admin-books.ts        # Admin book moderation & publishing actions
│   │   ├── admin-categories.ts   # Category CRUD actions
│   │   ├── admin-finance.ts      # Admin order verification & payout actions
│   │   ├── author-applications.ts# Author application, review, and reactivation
│   │   ├── author-finance.ts     # Author withdrawal request actions
│   │   ├── books.ts              # Author book creation, editing, and submission
│   │   ├── payments.ts           # Reader manual order placement actions
│   │   └── reviews.ts            # Reader review submission & moderation
│   ├── app/                      # Next.js App Router (pages & route handlers)
│   │   ├── (auth)/               # Authentication route group (login, register, reset)
│   │   ├── account/              # Reader personal dashboard & library
│   │   ├── admin/                # Admin control center & sub-modules
│   │   │   ├── author-applications/ # Review & reactivate author applications
│   │   │   ├── books/            # Book review, publishing & featured ordering
│   │   │   ├── categories/       # Taxonomy management
│   │   │   ├── finance/          # Orders, payouts, ledger & settings
│   │   │   └── reviews/          # Review moderation
│   │   ├── author/               # Author studio & analytics dashboard
│   │   │   └── books/            # Book authoring & chapter management
│   │   ├── authors/              # Public authors directory & profile pages
│   │   ├── become-author/        # Author onboarding application page
│   │   ├── books/                # Public book catalog & book details view
│   │   ├── cart/                 # Reader shopping cart page
│   │   ├── checkout/             # Single-book & cart checkout flows
│   │   ├── api/                  # API Route Handlers
│   │   │   ├── auth/[...nextauth]/# NextAuth route handler
│   │   │   ├── books/[slug]/chapters/[order]/ # Access-controlled chapter API
│   │   │   └── covers/[id]/      # MongoDB GridFS cover streaming endpoint
│   │   ├── layout.tsx            # Root HTML layout (fonts, providers, navbar, footer)
│   │   └── page.tsx              # Homepage (hero, featured books, categories, stats)
│   ├── components/               # React UI components
│   │   ├── account/              # Library cards, purchase history items
│   │   ├── admin/                # Admin lists, reorder tables, review cards
│   │   ├── author/               # Book form, chapter editor, status badges
│   │   ├── books/                # Book grid, catalog filters, ProtectedReader
│   │   ├── cart/                 # Add to cart buttons, cart view
│   │   ├── checkout/             # Checkout form with payment instructions
│   │   ├── layout/               # Header navbar, footer, messenger widget
│   │   └── ui/                   # Base UI primitives (buttons, dialogs, toasts)
│   ├── context/                  # React Client Contexts (CartContext)
│   ├── lib/                      # Core business logic, services & helpers
│   │   ├── auth/                 # Auth.js config, password hashing, role guards
│   │   ├── data/                 # Server-side Data Access Layer (DAL)
│   │   ├── db/                   # Mongoose cached connection pool
│   │   ├── notifications/        # Resend email notification dispatchers
│   │   ├── services/             # Financial ledger calculation engine
│   │   └── storage/              # MongoDB GridFS bucket upload & retrieval
│   ├── models/                   # Mongoose data models (13 schemas)
│   ├── types/                    # Shared TypeScript interfaces & declarations
│   └── validators/               # Zod validation schemas
├── next.config.ts                # Next.js configuration (serverAction body limit: 10MB)
├── package.json                  # Dependencies & npm scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

<a id="core-workflows"></a>
## 🔄 Core Workflows

### 1. Reader Registration & Authentication
```text
Visitor fills /register form
  → Zod validates email/password
  → Server action hashes password with bcrypt (12 rounds)
  → User document created (role: "USER", status: "ACTIVE")
  → User signs in via /login (Auth.js credentials provider)
  → Signed JWT session issued with user role and ID
```

### 2. Author Application & Admin Review
```text
Authenticated user visits /become-author
  → Submits pen name, bio, contact information, and writing motivation
  → Form data persists in browser storage to survive accidental reloads
  → AuthorApplication created with status: "PENDING"
  → Admin reviews application in /admin/author-applications:
      ├── APPROVE: Atomically creates Author record, elevates User.role to "AUTHOR",
      │            and marks application "APPROVED".
      ├── REJECT:  Marks application "REJECTED" with an audit explanation.
      └── REACTIVATE: Admin can click "আবার সক্রিয় করুন" to restore a rejected
                      application back to "PENDING" review status.
```

### 3. Manuscript Creation & Chapter Management
```text
Author navigates to /author/books/new
  → Fills title, Bengali category, summary, description, and pricing (BDT)
  → Attaches cover image (validated for <= 5MB and JPEG/PNG/WebP magic bytes)
  → Cover stream-uploaded to MongoDB GridFS (book_covers bucket)
  → Author adds chapters (order, title, teaser, full content, isPreview toggle)
  → Saves as "DRAFT" (status: "DRAFT")
```

### 4. Author Submission for Moderation
```text
Author clicks "পর্যালোচনার জন্য জমা দিন" (Submit for Review)
  → System validates substantive completeness:
      - Title and category must be valid
      - Description must be >= 10 characters
      - At least 5 substantive chapters (>= 50 chars content each, no placeholder text)
  → Book status transitions: "DRAFT" → "PENDING_REVIEW"
  → Author editing is locked while under review
  * Authors CANNOT publish books directly to the public catalog.
```

### 5. Admin Moderation & Book Publication
```text
Admin navigates to /admin/books?status=PENDING_REVIEW
  → Inspects manuscript details, cover artwork, and chapter contents
  → Admin clicks "প্রকাশ করুন" (Publish):
      - Verifies BookPublishSchema rules
      - Book status transitions: "PENDING_REVIEW" → "PUBLISHED"
      - Sets firstPublishedAt timestamp
      - Dispatches background email notifications
  → Book immediately surfaces on public homepage, catalog, and search indexes
```

### 6. Book Discovery, Cart & Checkout
```text
Reader browses /books or searches by title/genre
  → Adds one or more books to cart (stored in isolated user CartContext)
  → Navigates to /checkout/[slug] or /checkout/cart
  → System displays admin-configured bKash / Nagad instructions and receiving numbers
  → Reader sends money via their mobile wallet
  → Reader inputs sender mobile number and transaction ID (TxID)
  → Order created with status: "PENDING"
```

### 7. Order Verification & Atomic Fulfillment
```text
Admin reviews pending orders in /admin/finance/orders
  → Verifies payment evidence against actual MFS statement
  → Admin clicks "পেমেন্ট নিশ্চিত করুন" (Verify & Approve):
      - Order status transitions: "PENDING" → "PAID"
      - Purchase record created linking User and Book (status: "ACTIVE")
      - FinancialLedger records created atomically:
          1. SALE (gross amount)
          2. AUTHOR_EARNING (gross minus platform commission)
          3. PLATFORM_COMMISSION (platform cut retained)
  → Reader library immediately unlocks the book in /account
```

### 8. Protected In-Browser Reading
```text
Reader opens /books/[slug]?read=true or clicks "পড়া শুরু করুন" in /account
  → Initial Server Component renders chapter list with access control:
      - Free books / preview chapters: content included
      - Locked chapters: content stripped server-side (only title & teaser sent)
  → When reader selects a locked chapter:
      - Client requests GET /api/books/[slug]/chapters/[order]
      - Route handler verifies session and active Purchase record
      - Returns chapter text with "Cache-Control: private, no-store"
  → ProtectedReader component renders content:
      - Overlays personalized reader watermark (pustoka • Reader • #ID)
      - Blurs content if browser window loses focus
      - Disables right-click context menu and text selection
```

---

<a id="pricing--business-validation-rules"></a>
## 💰 Pricing & Business Validation Rules

All book pricing and publishing constraints are strictly enforced via Zod schemas (`src/validators/book.ts`) on both the client and server:

| Parameter | Validation Rule | Error Message / Enforcement |
| :--- | :--- | :--- |
| **Original Price (`price`)** | Minimum **৳100**, finite number, no maximum upper limit. | `"বইয়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)"` |
| **Discount Price (`discountPrice`)** | Optional. If provided, must be between **৳100** and **৳300** inclusive. | `"ছাড়ের মূল্য সর্বনিম্ন ১০০ টাকা হতে হবে (ন্যূনতম ৳১০০)"` / `"ছাড়ের মূল্য সর্বোচ্চ ৩০০ টাকা হতে হবে (সর্বোচ্চ ৳৩০০)"` |
| **Discount vs Price Constraint** | `discountPrice` cannot exceed original `price`. | `"ছাড়ের মূল্য মূল বইয়ের মূল্যের চেয়ে বেশি হতে পারবে না"` |
| **Currency** | Default: `"BDT"` (Bangladeshi Taka). | Enforced at model and schema levels. |
| **Substantive Chapters** | Minimum **5 substantive chapters** required to transition to `PUBLISHED`. | `"বই প্রকাশের জন্য কমপক্ষে ৫টি পূর্ণাঙ্গ ও অর্থপূর্ণ অধ্যায় থাকা আবশ্যক..."` |
| **Chapter Substantive Check** | Each chapter must have title >= 2 chars, content >= 50 chars, and must not contain placeholder text (e.g. "coming soon", "খসড়া", "lorem ipsum"). | Handled by `isSubstantiveChapter()` validator. |
| **Description Length** | Minimum **10 characters** before publication. | `"প্রকাশের আগে কমপক্ষে ১০ অক্ষরের বিবরণ দিন"` |
| **Publication Authorization** | **Admin Only**. Authors can only submit for review (`PENDING_REVIEW`). | Checked via `requireAdmin()` in publication server actions. |

---

<a id="database-schema--data-models"></a>
## 🗄 Database Schema & Data Models

The platform defines **13 Mongoose models** in `src/models/`, structured to maintain referential integrity and support serverless connection pooling.

### Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o| AUTHOR : "has profile"
    USER ||--o{ AUTHOR_APPLICATION : "submits"
    USER ||--o{ ORDER : "places"
    USER ||--o{ PURCHASE : "owns"
    USER ||--o{ REVIEW : "writes"
    USER ||--o{ READING_PROGRESS : "tracks"
    
    CATEGORY ||--o{ BOOK : "classifies"
    AUTHOR ||--o{ BOOK : "writes"
    
    BOOK ||--o{ PURCHASE : "fulfilled in"
    BOOK ||--o{ REVIEW : "reviewed by"
    BOOK ||--o{ READING_PROGRESS : "progress for"
    
    ORDER ||--o{ PURCHASE : "creates"
    ORDER ||--o{ FINANCIAL_LEDGER : "audited in"
    
    AUTHOR ||--o{ WITHDRAWAL : "requests"
    AUTHOR ||--o{ FINANCIAL_LEDGER : "credits / debits"
    
    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role "USER | AUTHOR | ADMIN"
        string status "ACTIVE | SUSPENDED | DELETED"
    }

    AUTHOR {
        ObjectId _id PK
        ObjectId user FK
        string penName
        string slug UK
        string bio
        string status "ACTIVE | INACTIVE | REJECTED"
    }

    BOOK {
        ObjectId _id PK
        string title
        string slug UK
        ObjectId author FK
        ObjectId category FK
        number price
        number discountPrice
        string status "DRAFT | PENDING_REVIEW | PUBLISHED | ARCHIVED"
        IChapter[] chapters
        number displayOrder
    }

    ORDER {
        ObjectId _id PK
        ObjectId user FK
        IOrderItem[] items
        number total
        string paymentMethod "BKASH | NAGAD | MOCK"
        string transactionId
        string status "PENDING | PAID | FAILED | CANCELLED"
    }

    PURCHASE {
        ObjectId _id PK
        ObjectId user FK
        ObjectId book FK
        ObjectId order FK
        string status "ACTIVE | REFUNDED | CANCELLED"
    }

    FINANCIAL_LEDGER {
        ObjectId _id PK
        ObjectId author FK
        ObjectId order FK
        string type "SALE | AUTHOR_EARNING | PLATFORM_COMMISSION | WITHDRAWAL_PAID"
        number amount
        string idempotencyKey UK
    }

    WITHDRAWAL {
        ObjectId _id PK
        ObjectId author FK
        number amount
        string payoutMethod "BKASH | NAGAD"
        string status "PENDING | ACCEPTED | PAID | REJECTED"
    }
```

### Model Summaries
1. **User (`src/models/User.ts`)**: Master account records with authentication details and roles (`USER`, `AUTHOR`, `ADMIN`).
2. **Author (`src/models/Author.ts`)**: Public author identity linked 1-to-1 to a User, storing pen names, biographies, and statuses (`ACTIVE`, `INACTIVE`, `REJECTED`).
3. **AuthorApplication (`src/models/AuthorApplication.ts`)**: Onboarding applications with audit tracking (`PENDING`, `APPROVED`, `REJECTED`).
4. **Category (`src/models/Category.ts`)**: Book genre classifications with unique URL slugs.
5. **Book (`src/models/Book.ts`)**: Ebook metadata, pricing, publication status, featured display order, and embedded chapter subdocuments.
6. **Order (`src/models/Order.ts`)**: Purchase transactions capturing items, totals, MFS transaction IDs, and review timestamps.
7. **Purchase (`src/models/Purchase.ts`)**: Permanent ownership records unlocking reader access to books.
8. **FinancialLedger (`src/models/FinancialLedger.ts`)**: Immutable double-entry ledger capturing gross sales, author royalties, platform commissions, and payout debits.
9. **Withdrawal (`src/models/Withdrawal.ts`)**: Author payout lifecycle records.
10. **PlatformSettings (`src/models/PlatformSettings.ts`)**: Singleton document controlling commission rates and payment instructions.
11. **Review (`src/models/Review.ts`)**: Reader book ratings (1–5) and feedback with administrative moderation states.
12. **ReadingProgress (`src/models/ReadingProgress.ts`)**: Per-book reader completion tracking and last-read timestamps.
13. **VerificationToken (`src/models/VerificationToken.ts`)**: One-time tokens for password reset and email verification workflows.

---

<a id="security--access-control"></a>
## 🔒 Security & Access Control

- **Server-Side Role Enforcement**:
  All protected actions and pages execute rigorous role checks on the server (`requireUser()`, `requireAuthor()`, `requireAdmin()`). Client-side state is never trusted for authorization decisions.
- **Fail-Closed Chapter Access**:
  Full chapter text for paid books is excluded from initial Server Component payloads. Only authorized purchasers, the book's author, or administrators can retrieve chapter content via the authenticated API handler.
- **Zero-Trust File Uploads**:
  Book covers are inspected for maximum byte size (<= 5MB), MIME types, and binary file signatures (magic bytes) to prevent executable file uploads.
- **Durable GridFS Storage**:
  Covers are stored directly within MongoDB GridFS chunks, ensuring image persistence is immune to ephemeral serverless container teardowns.
- **Idempotent Financial Ledger**:
  Double-entry ledger writes use compound unique idempotency keys (`sale-{orderId}-{bookId}-commission`, etc.) to guarantee that duplicate webhooks or concurrent clicks never double-credit balances.
- **Anti-Piracy Safeguards**:
  The protected reader features window focus-loss content blurring, right-click context menu blocking, copy event suppression, and personalized dynamic SVG watermarking.

---

<a id="getting-started--local-development"></a>
## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js**: `v20.x` or later (LTS recommended)
- **Package Manager**: `npm` (included with Node.js)
- **MongoDB**: A running MongoDB instance (local or MongoDB Atlas connection URI)

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/pustoka.git
   cd pustoka
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   *(Populate `.env.local` with your MongoDB connection string and a secret key as detailed in the [Environment Variables](#-environment-variables) section).*

4. **Seed initial categories**:
   ```bash
   npx tsx scripts/seed-initial-categories.ts
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open the application**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Starts the Next.js development server with Turbopack. |
| **Production Build** | `npm run build` | Compiles and optimizes all routes for production deployment. |
| **Production Start** | `npm run start` | Launches the compiled production application. |
| **Linting** | `npm run lint` | Runs ESLint across the codebase. |
| **Type Checking** | `npx tsc --noEmit` | Runs static TypeScript checks without emitting output files. |

---

<a id="environment-variables"></a>
## 🔑 Environment Variables

Create a `.env.local` file in the repository root. All sensitive keys are server-only and must never be prefixed with `NEXT_PUBLIC_`.

| Variable | Description | Required | Example / Placeholder |
| :--- | :--- | :---: | :--- |
| `MONGODB_URI` | MongoDB Atlas or local connection string. | **Yes** | `mongodb+srv://user:pass@cluster.mongodb.net/pustoka` |
| `AUTH_SECRET` | Secret key used by Auth.js for JWT session signing. | **Yes** | `generate-a-secure-random-32-byte-hex-string` |
| `NEXT_PUBLIC_APP_URL` | Public base URL used for absolute redirect URLs and sharing. | **Yes** | `http://localhost:3000` *(or your production domain)* |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for social authentication. | *Optional* | `your-google-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret. | *Optional* | `your-google-client-secret` |
| `RESEND_API_KEY` | Resend API key for transactional emails. | *Optional* | `re_123456789abcdef` *(gracefully skipped if omitted)* |
| `RESEND_FROM_EMAIL` | Verified sender address for transactional notifications. | *Optional* | `noreply@pustoka.com` |
| `NODE_ENV` | Application environment mode. | *Optional* | `development` / `production` / `test` |

> [!WARNING]
> Never commit real database credentials or API secrets to version control. Keep `.env.local` listed in `.gitignore`.

---

<a id="testing--quality-verification"></a>
## 🧪 Testing & Quality Verification

The repository maintains specialized test suites in `scripts/` validating key business logic, security barriers, and workflows against simulated or database backends:

```bash
# Verify TypeScript typing across the entire project
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Test author submission, validation gates, and publishing workflows
npx tsx scripts/test-author-workflow.ts

# Test admin book management, filtering, and featured reordering
npx tsx scripts/test-admin-book-management.ts

# Test MongoDB GridFS cover upload, persistence, and stream serving
npx tsx scripts/test-gridfs-persistence.ts

# Test double-entry financial ledger and balance calculations
node scripts/test-financial-system.mjs

# Test protected reader access control and anti-piracy mechanisms
node scripts/test-content-protection.mjs

# Test manual bKash/Nagad checkout and payment verification
node scripts/test-manual-payment-flow.mjs
```

---

<a id="deployment-strategy"></a>
## 🚢 Deployment Strategy

Pustoka is optimized for deployment on modern cloud platforms such as **Vercel** or standard Node.js container environments:

- **Serverless Ready**:
  By utilizing **MongoDB GridFS** for cover image storage rather than local disk storage, cover images and user uploads persist reliably across ephemeral serverless container lifecycles.
- **Turbopack Build Optimization**:
  Next.js 16 build scripts generate static pages where possible and dynamic server routes where authentication and real-time data access are required.
- **Server Action Payload Limits**:
  Configured in `next.config.ts` with `bodySizeLimit: "10mb"` to accommodate high-resolution book cover uploads seamlessly.
- **Cache Invalidation**:
  Server Actions employ selective path revalidation (`revalidatePath`) to ensure catalogs and dashboards update immediately after mutations while keeping database load minimal.

---

<a id="troubleshooting--common-issues"></a>
## 🛠 Troubleshooting & Common Issues

### 1. MongoDB Connection Error (`Missing MONGODB_URI`)
- **Cause**: `.env.local` is missing or does not contain `MONGODB_URI`.
- **Solution**: Ensure `.env.local` exists in the repository root and contains a valid MongoDB connection string. Restart the development server after creating or updating `.env.local`.

### 2. Cover Image Upload Validation Failure
- **Symptom**: `"শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি গ্রহণযোগ্য।"`
- **Cause**: Uploaded file is either over 5MB or its binary header does not match JPEG, PNG, or WebP magic bytes.
- **Solution**: Ensure cover images are standard JPEG, PNG, or WebP files under 5MB.

### 3. Book Publication Blocked
- **Symptom**: Admin publishing fails with chapter count or description errors.
- **Cause**: Pustoka enforces substantive publication standards: at least 5 chapters with non-placeholder titles and bodies of at least 50 characters, plus a description of at least 10 characters.
- **Solution**: Ensure the manuscript includes at least 5 complete chapters before submitting for admin review.

### 4. Email Notifications Skipped in Development
- **Symptom**: Console logs `[Notification] Skipped password reset email...`.
- **Cause**: `RESEND_API_KEY` is not set.
- **Solution**: This is intentional graceful degradation. Email dispatch is skipped without throwing an error if Resend credentials are not configured.

---

<a id="roadmap"></a>
## 🗺 Roadmap

### Implemented in Current Release
- [x] Full-stack Next.js 16 App Router architecture with React 19.
- [x] Complete Mongoose data models with cached serverless connection pool.
- [x] Credentials authentication and role-based authorization guards (`USER`, `AUTHOR`, `ADMIN`).
- [x] Public book catalog with search, category filtering, and sorting.
- [x] Author application, review, rejection feedback, and admin reactivation workflow.
- [x] Multi-chapter book editor with substantive quality validators.
- [x] Admin-only publication enforcement.
- [x] MongoDB GridFS durable cover storage and streaming endpoints.
- [x] User-isolated client shopping cart and checkout flows.
- [x] Manual bKash / Nagad payment verification system.
- [x] Double-entry financial ledger and author royalty calculation engine.
- [x] Protected in-browser web reader with watermark and focus-loss obscuration.

### Planned for Future Releases
- [ ] Automated payment gateway integration (SSLCOMMERZ for direct bKash, Nagad, and local card processing).
- [ ] Private Cloudflare R2 / S3 storage for full PDF/EPUB asset delivery via signed URLs.
- [ ] Reader font size, theme customization (dark, light, sepia), and reading bookmarks.
- [ ] Automated author royalty payouts via MFS disbursement APIs.
- [ ] Interactive reader bookmarks, highlights, and annotations.

---

<a id="contributing"></a>
## 🤝 Contributing

Contributions are welcome from developers interested in strengthening digital publishing in South Asia.

1. **Fork the Repository** on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** adhering to existing code conventions and TypeScript standards.
4. **Run Quality Checks**:
   ```bash
   npx tsc --noEmit
   npm run lint
   ```
5. **Commit your changes**:
   ```bash
   git commit -m "feat: describe your change cleanly"
   ```
6. **Push to your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request** explaining your implementation and test coverage.

---

<a id="license--credits"></a>
## 📜 License & Credits

### License
*The license for this repository has not yet been specified.* All rights are currently reserved by the project author and maintainers. An open-source or proprietary license will be declared prior to general public release.

### Credits & Acknowledgments
- Developed for the readers, authors, and digital book enthusiasts of Bangladesh.
- UI styling powered by [Tailwind CSS](https://tailwindcss.com/) and [Lucide Icons](https://lucide.dev/).
- Bengali typography supported by Google Fonts' [Hind Siliguri](https://fonts.google.com/specimen/Hind+Siliguri).

---

<a id="contact"></a>
## 📬 Contact

For inquiries regarding Pustoka or repository access:
- **Project Maintainer**: Pustoka Team
- **Repository**: `[GitHub Repository URL]` *(configured upon public release)*
- **Issue Tracker**: Please open an issue on the GitHub repository for bug reports or feature suggestions.
