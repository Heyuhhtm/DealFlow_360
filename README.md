# DealFlow360 — B2B Quote & Deal Flow Orchestration Platform

DealFlow360 is an enterprise-grade B2B quotation, discount risk governance, and deal negotiation platform. It streamlines the entire revenue workflow from quotation authoring, real-time margin risk scoring, and multi-tier approval routing to warehouse fulfillment splitting, recurring EMI billing, and customer portal negotiation.

---

## 1. Executive Summary

In high-volume B2B commerce, sales representatives frequently offer discretionary discounts to win competitive deals. Without automated governance, excessive discounting erodes operating margins, creates inventory bottlenecks across regional warehouses, and results in delayed approval cycles.

DealFlow360 solves these challenges through an end-to-end orchestration platform that bridges sales velocity with financial discipline:
- **Instant Risk Guardrails**: Evaluates customer tier limits, product categories, and blended gross margins in real time.
- **Sequential Multi-Tier Approvals**: Automatically routes high-risk deals through Sales Management and Finance with immutable audit trails.
- **Supply Chain Fulfillment Optimization**: Splits multi-item orders dynamically across regional fulfillment depots to minimize shipping costs and prevent stock-outs.
- **Real-Time Customer Negotiation**: Scoped customer deal room enabling live negotiation threads, counter-offers, and instant quotation acceptance.
- **Equated Monthly Installment (EMI) Billing**: Configurable recurring payment schedules with automated PDF invoice generation and Ethereal email payment reminders.

---

## 2. Key Problem Solved & Core Value Proposition

| Traditional B2B Sales Pain Point | DealFlow360 Automated Solution |
| :--- | :--- |
| **Uncontrolled Discounting**: Reps apply arbitrary price cuts without margin transparency. | **Tiered Ceilings & Risk Engine**: Automatically calculates Blended Risk Score and enforces role-based approval gates. |
| **Approval Bottlenecks**: Deal reviews get lost in email chains and spreadsheets. | **Sequential Workflow**: Level 1 (Sales Manager) and Level 2 (Finance) review queues with audit trails. |
| **Margin Erosion**: Discounting hardware wipes out deal profitability. | **Smart Cross-Sell/Upsell**: Rule-based recommendation engine suggesting high-margin services to offset discounts. |
| **Disconnected Fulfillment**: Orders approved without validating multi-site inventory. | **Multi-Warehouse Allocation**: Dynamic split calculation across depots with atomic inventory deductions. |
| **Opaque Customer Negotiations**: Friction in sending revised quotes back and forth. | **Interactive Deal Room**: Customer portal with counter-offers, line-item queries, and official PDF documents. |
| **Rigid Payment Terms**: Lack of flexibility in handling recurring or financed orders. | **EMI & Subscription Schedules**: Configurable 3, 6, or 12-month billing cycles with official A4 invoice generation. |

---

## 3. System Architecture & Workflow

DealFlow360 utilizes a decoupled client-server architecture powered by Express, TypeScript, Prisma ORM, PostgreSQL, React 19, and Tailwind CSS, supplemented with real-time Socket.io websockets for instant stock updates and negotiation messages.

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client (React 19 + TypeScript + Vite)"]
        UI["DealFlow360 Sales Workspace"]
        Portal["Customer Negotiation Portal"]
        WSClient["Socket.io WebSocket Client"]
    end

    subgraph MiddlewareLayer["Security & Gateway"]
        AuthMiddleware["JWT Authentication Middleware"]
        RoleGuard["Role-Based Access Control (RBAC)"]
        Validator["Zod Schema Request Validation"]
    end

    subgraph ServiceLayer["Business Logic & Domain Services"]
        PricingEngine["Pricing & Margin Service"]
        RiskEngine["Blended Risk Scoring Engine"]
        ApprovalService["Sequential Approval Service"]
        UpsellEngine["Cart Upsell & Margin Booster"]
        FulfillmentService["Multi-Warehouse Split Service"]
        BillingService["EMI & Subscription Engine"]
        PDFService["PDFKit Commercial Document Generator"]
        EmailService["Nodemailer & Ethereal Dispatcher"]
        WSServer["Socket.io Real-Time Hub"]
    end

    subgraph DataLayer["Persistence Layer"]
        PrismaClient["Prisma ORM Client"]
        PostgreSQL[("PostgreSQL Database")]
    end

    UI -->|"REST API Requests"| AuthMiddleware
    Portal -->|"Portal Magic Link / REST"| AuthMiddleware
    AuthMiddleware --> RoleGuard
    RoleGuard --> Validator

    Validator --> PricingEngine
    Validator --> ApprovalService
    Validator --> FulfillmentService
    Validator --> BillingService

    PricingEngine --> RiskEngine
    PricingEngine --> UpsellEngine
    ApprovalService --> WSServer
    FulfillmentService --> WSServer
    BillingService --> PDFService
    BillingService --> EmailService

    PricingEngine --> PrismaClient
    ApprovalService --> PrismaClient
    FulfillmentService --> PrismaClient
    BillingService --> PrismaClient
    PrismaClient --> PostgreSQL

    WSServer -.->|"Live Stock & Chat Events"| WSClient
```

---

## 4. Key Features & Business Logic

### Intelligent Quotation Builder
- Real-time gross margin calculation: $\text{Margin \%} = \frac{\text{Line Total} - \text{Line Cost}}{\text{Line Total}} \times 100$.
- Dynamic customer discount ceilings: **Gold (15%)**, **Silver (10%)**, **Bronze (5%)**.
- Automatic calculation of blended order risk scores from discount concessions and transaction volume.

### Sequential Approval Workflows
- **Level 1 (Sales Manager)**: Enforced whenever discounts exceed the customer's tier ceiling or margin drops below target.
- **Level 2 (Finance)**: Enforced when blended risk score exceeds 40% or critical gross margins are compromised.
- Complete action audit logs recording approver ID, timestamp, approval status, and justification comments.

### Real-Time Margin Booster (Cart Upsell Engine)
- Heuristic algorithm analyzing hardware concessions and proposing high-margin recurring subscriptions or services.
- Real-time gross margin delta preview showing how accepting an upsell restores deal profitability.

### Multi-Warehouse Split Optimization
- Checks inventory across all regional distribution centers (e.g. *Main Warehouse*, *East Depot*).
- Simulates optimized fulfillment splits to fulfill multi-line hardware orders while minimizing freight costs.
- Executes atomic stock deduction and automated rollback transactions upon deal changes.

### Equated Monthly Installments (EMI) & Subscription Schedules
- Flexible installment tenure configuration: **3 Installments** (Quarterly), **6 Installments** (Semi-Annual), or **12 Installments** (Annual).
- Supports both recurring software subscriptions and full commercial hardware order EMI financing.
- Generates official A4 installment invoice bills (PDF) complete with bank wire remittance details.
- One-click customer due date payment reminder email dispatch with PDF attachment and live Ethereal test preview URLs.

### Interactive Customer Deal Room (Portal)
- Scoped multi-company customer login with enterprise isolation.
- Real-time two-way messaging and line-item clarification comments.
- Customer-initiated counter-discount proposals requiring business justification, automatically re-entering internal approval loops upon submission.
- Electronic quotation confirmation and commercial PDF download.

---

## 5. Technology Stack

### Backend
- **Runtime**: Node.js (v20+ LTS)
- **Framework**: Express 5
- **Language**: TypeScript 5.9
- **ORM**: Prisma ORM 6.19
- **Database**: PostgreSQL
- **Authentication**: JSON Web Tokens (JWT) & bcrypt password hashing
- **Validation**: Zod schema validation
- **Document Generation**: PDFKit
- **Email Delivery**: Nodemailer with Ethereal SMTP test transport
- **Real-Time Communication**: Socket.io 4.8

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 8.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4 & PostCSS
- **Component Icons**: Lucide React
- **HTTP Client**: Axios
- **Real-Time Client**: Socket.io Client

---

## 6. Repository & Project Structure

```
DealFlow_360/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Data models, relations, enums, and indexes
│   │   └── seed.ts                    # Idempotent seed script for users, tiers, products, and depots
│   ├── scripts/
│   │   └── smoke-test.ts              # 9-step automated end-to-end integration test runner
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── approvals.controller.ts    # Sequence approval step review, rejection, and audit log
│   │   │   ├── auth.controller.ts         # User JWT login, demo aliases, and customer magic links
│   │   │   ├── billing.controller.ts      # EMI installment generation, bill PDFs, and email reminders
│   │   │   ├── customers.controller.ts    # Customer CRUD and tier limit management
│   │   │   ├── dashboard.controller.ts    # Top-level operational metrics and pipeline analytics
│   │   │   ├── fulfillment.controller.ts  # Multi-warehouse allocation algorithms and inventory deduction
│   │   │   ├── portal.controller.ts       # Customer deal room, negotiation threads, and counter-offers
│   │   │   ├── products.controller.ts     # Product catalog, categories, pricing, and stock levels
│   │   │   ├── quotations.controller.ts   # Quote lifecycle, versioning, line items, and audit entries
│   │   │   ├── upsell.controller.ts       # Margin booster recommendation algorithms
│   │   │   └── warehouses.controller.ts   # Depot registration, base shipping rates, and inventory stock
│   │   ├── lib/
│   │   │   ├── errors.ts                  # Centralized application error classes and status codes
│   │   │   ├── prisma.ts                  # Singleton Prisma Client database connection instance
│   │   │   └── socket.ts                  # Socket.io server initialization and event emitters
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts         # JWT bearer token verification and user extraction
│   │   │   ├── error.middleware.ts        # Global Express exception handler and formatted JSON response
│   │   │   ├── role.middleware.ts         # Role-based access control guard (RBAC)
│   │   │   └── validate.middleware.ts     # Zod payload validation middleware
│   │   ├── routes/
│   │   │   ├── approvals.routes.ts        # Routes for multi-tier quotation approvals
│   │   │   ├── auth.routes.ts             # Routes for authentication and portal session tokens
│   │   │   ├── customers.routes.ts        # Routes for customer directory operations
│   │   │   ├── dashboard.routes.ts        # Routes for dashboard analytics and KPI rollups
│   │   │   ├── portal.routes.ts           # Protected customer negotiation portal endpoints
│   │   │   ├── products.routes.ts         # Routes for product catalog queries
│   │   │   ├── quotations.routes.ts       # Routes for quotations, PDF streaming, and email delivery
│   │   │   └── warehouses.routes.ts       # Routes for depot management and warehouse stock updates
│   │   ├── services/
│   │   │   ├── approval.service.ts        # Approval step sequencing and trigger logic
│   │   │   ├── email.service.ts           # SMTP email dispatcher with PDF attachment handling
│   │   │   ├── fulfillment.service.ts     # Regional warehouse split optimization algorithms
│   │   │   ├── pdf.service.ts             # PDFKit generator for quotations and installment bills
│   │   │   ├── pricing.service.ts         # Line totals, margin formulas, and proration math
│   │   │   ├── risk.service.ts            # Blended discount risk score calculation
│   │   │   └── upsell.service.ts          # Margin recovery recommendations based on discount volume
│   │   ├── types/
│   │   │   └── index.ts                   # Express request extensions and shared backend interfaces
│   │   └── index.ts                       # HTTP server entrypoint and socket initialization
│   ├── .env.example                       # Template for backend environment variables
│   ├── package.json                       # Backend scripts and runtime dependencies
│   └── tsconfig.json                      # TypeScript compiler configuration
├── frontend/
│   ├── src/
│   │   ├── assets/                        # Static brand assets and SVGs
│   │   ├── components/
│   │   │   ├── Footer.tsx                 # System footer and version notice
│   │   │   ├── Header.tsx                 # Top navigation bar, search, and notification bell
│   │   │   ├── NegotiationThread.tsx      # Real-time negotiation chat thread component
│   │   │   ├── NotificationToast.tsx      # Toast notifications for real-time alerts
│   │   │   ├── PortalLayout.tsx           # Dedicated layout wrapper for Customer Deal Room
│   │   │   ├── RoleGuard.tsx              # Route protection component enforcing user role permissions
│   │   │   ├── Sidebar.tsx                # Dynamic navigation menu mapped to authenticated role
│   │   │   └── StatusBadge.tsx            # Color-coded badges for quotation and approval statuses
│   │   ├── context/
│   │   │   ├── AuthContext.tsx            # Global authentication state, JWT storage, and switch account
│   │   │   └── NotificationContext.tsx    # Live notification badge state and Socket.io listener
│   │   ├── lib/
│   │   │   └── socket.ts                  # Client Socket.io connection manager
│   │   ├── pages/
│   │   │   ├── ApprovalsPage.tsx          # Multi-stage approval management and review queue
│   │   │   ├── ChooseLoginPage.tsx        # Unified login hub for staff roles and client deal rooms
│   │   │   ├── CustomerPortalPage.tsx     # Client-side deal room for terms review and counter-offers
│   │   │   ├── CustomersPage.tsx          # Customer directory, tier assignment, and deal history
│   │   │   ├── DashboardPage.tsx          # Executive pipeline analytics, revenue KPIs, and quick actions
│   │   │   ├── DealHealthPage.tsx         # Blended risk radar, stalled deal tracking, and margin analysis
│   │   │   ├── FulfillmentPage.tsx        # Multi-depot stock allocation, split simulator, and manifests
│   │   │   ├── HelpCenterPage.tsx         # Platform documentation, pricing guide, and FAQ accordion
│   │   │   ├── InvoicesPage.tsx           # Accounts receivable invoices and Admin deletion controls
│   │   │   ├── LoginPage.tsx              # Standard staff credential authentication screen
│   │   │   ├── PrivacyPolicyPage.tsx      # Enterprise data protection and privacy terms
│   │   │   ├── ProductsPage.tsx           # Live product catalog with multi-depot stock indicators
│   │   │   ├── QuotationsPage.tsx         # Core quotation authoring, PDF preview, and customer email
│   │   │   ├── ReportsPage.tsx            # Performance analytics, margin breakdown, and export options
│   │   │   ├── SubscriptionsPage.tsx      # Recurring MRR/ARR management, EMI schedule, and reminder emails
│   │   │   ├── TermsOfServicePage.tsx     # B2B platform terms of commercial service
│   │   │   └── WarehousesPage.tsx         # Warehouse depot configuration and stock adjustments
│   │   ├── services/
│   │   │   ├── api.ts                     # Axios API client covering all backend endpoints
│   │   │   └── socket.ts                  # Socket client subscriber helper
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript interfaces matching backend contracts
│   │   ├── utils/
│   │   │   └── formatters.ts              # Currency (INR), date, percentage, and badge formatters
│   │   ├── App.tsx                        # Main application router and role-guarded page switchboard
│   │   ├── index.css                      # Tailwind base styles and design system variables
│   │   └── main.tsx                       # React application bootstrap entrypoint
│   ├── .env.example                       # Template for frontend environment variables
│   ├── package.json                       # Frontend scripts and runtime dependencies
│   ├── tailwind.config.js                 # Tailwind CSS theme configuration
│   └── vite.config.ts                     # Vite bundler and dev server configuration
├── docs/
│   └── screenshots/                       # Captured UI screenshots for review and presentation
└── README.md                              # Comprehensive project documentation
```

---

## 7. User Roles & Access

DealFlow360 implements strict Role-Based Access Control (RBAC) across both the backend Express middleware and the frontend navigation switchboard:

| Role | What They Can Do | Sidebar / Navigation Access |
| :--- | :--- | :--- |
| **Administrator** (`ADMIN`) | Full administrative governance: manage users, view all operational workspaces, adjust inventory depots, configure product pricing, and delete invoices with safety confirmations. | `Dashboard`, `Quotations`, `Approvals`, `Fulfillment`, `Subscriptions`, `Invoices`, `Deal Health`, `Customers`, `Warehouses`, `Reports`, `Products` |
| **Sales Rep** (`SALES_REP`) | Create and draft deal quotations, configure line item discounts up to customer tier limits, accept margin-boosting upsells, reserve fulfillment stock, and monitor deal health. | `Dashboard`, `Quotations`, `Fulfillment`, `Subscriptions`, `Deal Health` |
| **Sales Manager** (`SALES_MANAGER`) | Review quotations exceeding standard discount ceilings, execute Level 1 approvals or rejections with feedback comments, oversee customer directory accounts, and inspect revenue reports. | `Dashboard`, `Quotations`, `Approvals` *(Seq 1)*, `Deal Health`, `Customers`, `Reports` |
| **Finance** (`FINANCE`) | Review quotations with high blended risk scores, execute Level 2 approvals (Sequence 2) for margin protection, manage invoice payment states, adjust mid-cycle subscription proration, and inspect financial metrics. | `Dashboard`, `Approvals` *(Seq 2)*, `Invoices`, `Subscriptions`, `Reports` |
| **Customer Portal** (`CUSTOMER`) | Access scoped, isolated deal rooms via JWT authentication, inspect commercial PDF quotes, propose line-item discount counter-offers with justifications, participate in negotiation chat, and electronically confirm orders. | Dedicated Customer Deal Room route (`/portal`) |

---

## 8. Getting Started (Local Setup)

Follow these step-by-step instructions to run DealFlow360 locally on your workstation.

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local instance running on port 5432 **OR** a cloud-hosted connection (e.g. Supabase, Neon)

### 1. Clone the Repository
```bash
git clone https://github.com/Heyuhhtm/DealFlow_360.git
cd DealFlow_360
```

### 2. Database Setup
Choose one of the following options:

#### Option A: Local PostgreSQL
Create a dedicated database using the PostgreSQL interactive terminal:
```bash
psql -U postgres -c "CREATE DATABASE dealflow360;"
```
Your local connection string will be:
`postgresql://postgres:postgres@localhost:5432/dealflow360?schema=public`

#### Option B: Cloud-Hosted PostgreSQL (Supabase / Neon)
Create a new project on [Supabase](https://supabase.com) or [Neon](https://neon.tech) and copy your provided transaction pooler connection URL.

### 3. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Ensure your `backend/.env` file is configured with valid values:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dealflow360?schema=public"
JWT_SECRET="dealflow360-enterprise-jwt-super-secret-key-2026"
CORS_ORIGIN="http://localhost:3000"

# Ethereal Test SMTP (Pre-configured for instant out-of-the-box email testing)
ETHEREAL_USER="marianne.leffler@ethereal.email"
ETHEREAL_PASS="2Z1s42zC2WzVvT5m4S"
ETHEREAL_HOST="smtp.ethereal.email"
ETHEREAL_PORT=587
```

Run database migrations and seed the initial dataset:
```bash
# Apply Prisma schema migrations
npx prisma migrate dev --name init

# Seed demo users, customers, products, and warehouses
npx prisma db seed

# Start backend server with auto-reload
npm run dev
```
The backend API server will start on `http://localhost:4000`.

### 4. Frontend Setup
Open a new terminal window in the project root:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Ensure your `frontend/.env` points to your backend instance:
```env
VITE_API_URL="http://localhost:4000/api"
VITE_SOCKET_URL="http://localhost:4000"
```

Start the Vite development server:
```bash
npm run dev
```
The frontend web application will start on `http://localhost:3000`.

### 5. Automated System Verification
You can verify the entire backend integration suite in one command:
```bash
cd backend
npm run smoke-test
```
This executes all 9 end-to-end integration steps (Authentication, Quotation Builder, Risk Scoring, Approvals, Fulfillment, Subscriptions, and Portal Negotiation) and confirms `🎉 ALL TESTS PASSED`.

---

## 9. Demo Credentials

All demo accounts are pre-seeded in the database via [`backend/prisma/seed.ts`](file:///e:/ODOO/backend/prisma/seed.ts) with the password: `password123`.

### Internal Staff Accounts
| Name | Role | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **David Wallace** | Administrator | `admin@dealflow360.com` *(alias: `david@dealflow360.com`)* | `password123` | Master dashboard, delete invoices, inspect all data |
| **Sarah Connor** | Sales Rep | `rep@dealflow360.com` *(alias: `sarah@dealflow360.com`)* | `password123` | Quote authoring, upsell drawers, fulfillment |
| **Michael Scott** | Sales Manager | `manager@dealflow360.com` *(alias: `michael@dealflow360.com`)* | `password123` | Level 1 discount threshold approval queue |
| **Angela Martin** | Finance | `finance@dealflow360.com` *(alias: `angela@dealflow360.com`)* | `password123` | Level 2 gross margin approval queue, invoices |

### Customer Portal Accounts (Client Tiers)
| Client Company | Account Tier | Portal Login Email | Password | Commercial Terms & Limits |
| :--- | :--- | :--- | :--- | :--- |
| **Apex Enterprises** | `GOLD` Tier | `deals@apexenterprises.com` | `password123` | 15% auto-approved discount ceiling • Net 30 terms |
| **Wayne Technologies** | `SILVER` Tier | `procurement@waynetech.com` | `password123` | 10% auto-approved discount ceiling • Net 45 terms |
| **Stark Logistics** | `BRONZE` Tier | `contact@starklogistics.io` | `password123` | 5% auto-approved discount ceiling • Net 15 terms |
| **Academic** | `BRONZE` Tier | `academiccom@123.in` | `password123` | 5% auto-approved discount ceiling • Net 15 terms |

---

## 10. Screenshots

<!-- Replace these placeholder image paths with real screenshots before submitting. Recommended: 1280x800px, PNG format, stored in docs/screenshots/ -->

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/screenshots/dashboard.png" alt="Executive Dashboard" width="100%" /><br />
      <b>Executive Dashboard</b><br />
      <sub>Real-time deal pipeline KPIs, quotation status distribution, and quick operational workflows.</sub>
    </td>
    <td width="50%" align="center">
      <img src="./docs/screenshots/quotation-builder.png" alt="Quotation Builder & EMI Engine" width="100%" /><br />
      <b>Quotation Builder & EMI Schedule</b><br />
      <sub>Live margin monitoring, risk scoring, and 3/6/12-month installment payment projections.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/screenshots/approval-flow.png" alt="Sequential Approvals" width="100%" /><br />
      <b>Sequential Multi-Tier Approvals</b><br />
      <sub>Sequential Sales Manager and Finance approval gates with granular audit justification logs.</sub>
    </td>
    <td width="50%" align="center">
      <img src="./docs/screenshots/portal-negotiation.png" alt="Customer Deal Room" width="100%" /><br />
      <b>Customer Negotiation Portal</b><br />
      <sub>Scoped B2B deal room for real-time negotiation chat, counter-offers, and official PDF downloads.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/screenshots/fulfillment-split.png" alt="Fulfillment Splitting" width="100%" /><br />
      <b>Multi-Warehouse Fulfillment</b><br />
      <sub>Automated multi-depot stock allocation, freight optimization, and atomic inventory reduction.</sub>
    </td>
    <td width="50%" align="center">
      <img src="./docs/screenshots/deal-health-dashboard.png" alt="Product Catalog & Live Depot Stock" width="100%" /><br />
      <b>Product Catalog & Live Depot Stock</b><br />
      <sub>Real-time depot stock indicators across regional facilities synchronized via WebSockets.</sub>
    </td>
  </tr>
</table>

---

## 11. Quick Test Flow (For Judges)

Evaluate the core functionality of DealFlow360 in under 5 minutes:

1. **Authenticate as Sales Rep**:
   - Navigate to `http://localhost:3000` and select **Sales Rep** (`rep@dealflow360.com` / `password123`).
2. **Create a Quotation with an Over-Limit Discount**:
   - Click **Quotations** -> **New Quotation**.
   - Select customer **Apex Enterprises** (*Gold Tier — 15% discount limit*).
   - Add **Laptop Pro 15** and set discount to **25%** (exceeding ceiling).
   - Notice the **Blended Risk Score** indicator immediately elevates and flags that approvals are required.
3. **Accept a Margin-Boosting Upsell**:
   - Notice the **Recommended Upsells & Cross-Sells** drawer recommending *Priority Support Plan* (High-Margin Service).
   - Click **Add to Deal** to observe gross margin recovery.
4. **Submit for Approval**:
   - Click **Submit Quotation**. The quotation status transitions to `PENDING_APPROVAL`.
5. **Execute Multi-Tier Sequential Approvals**:
   - Switch user to **Sales Manager** (`manager@dealflow360.com` / `password123`) -> Navigate to **Approvals** -> Click **Approve Step 1**.
   - Switch user to **Finance** (`finance@dealflow360.com` / `password123`) -> Click **Approve Step 2**.
   - The quotation status now updates to `APPROVED`.
6. **Simulate Multi-Warehouse Fulfillment Split**:
   - Navigate to **Fulfillment** -> Select the quotation -> Click **Simulate Multi-Site Split**.
   - Review the split between *Main Warehouse* and *East Depot* and click **Lock & Confirm Allocation**.
   - Observe that warehouse stock is deducted atomically in real time.
7. **Generate EMI Billing Schedule & Send Payment Reminder**:
   - Navigate to **Subscriptions & Billing** -> Select the quotation.
   - Choose **6 Installments (6-Month Semi-Annual)** -> Click **Generate 6-Cycle Billing Schedule**.
   - Click **View EMI Bill** on Installment #1 to view the generated official A4 invoice PDF.
   - Click **Send Reminder** to email the customer; click the green banner's **View Sent Email (Ethereal)** link to inspect the dispatched email.
8. **Customer Negotiation & Re-Approval Cycle**:
   - Open `/choose-login` -> Click **Apex Enterprises Deal Room** (or navigate to `/portal`).
   - Propose a **counter-discount** on a line item with a comment (*e.g., "Requesting extra 2% for quarterly volume commitment"*).
   - Confirm submission: observe that the deal automatically re-enters `UNDER_NEGOTIATION` and routes back into the internal approval queue with full audit history.

---

## 12. What We'd Build Next

The following capabilities represent deliberate scope decisions for the hackathon timeframe and form our immediate product roadmap:

- **Multi-Currency & International Tax Localization**: Live foreign exchange (FX) rate conversion across USD, EUR, and GBP alongside automated tax calculation (GST, VAT, State Sales Tax).
- **Administrative Configuration Studio**: Self-service UI allowing administrators to dynamically register products, create custom price lists, and define complex customer discount tiers without database seed scripts.
- **Automated SLA Escalation Nudges**: Background cron monitoring to trigger automated Slack, Microsoft Teams, and email alerts when deal approval requests sit pending for over 24 hours.
- **Spreadsheet Export Engine**: One-click native Microsoft Excel (`.xlsx`) and CSV export for commercial invoices, quotation line items, and fulfillment dispatch manifests.
- **Predictive Delivery Slippage & Route Optimization**: Integration with third-party logistics APIs to calculate live transit times and dynamically reroute shipments when regional depots experience backorders.

---

## 13. Team & Credits

- **Developer**: Uttam Kumar Gupta {(uttamgupta86039@gmail.com (`Heyuhhtm`)} && Ranjan Kumar ..
- **Project**: DealFlow360 B2B Commercial Sales Orchestration Platform
- **Event**: Built with precision for the **Odoo Combat Hackathon 2026**.
