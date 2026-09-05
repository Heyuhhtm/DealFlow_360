# DealFlow360 — Backend Build Prompts + PostgreSQL/Prisma Documentation

Use these prompts yourself (paste into your AI coding tool one at a time, in order — same pattern as the frontend prompts). The database section below is documentation you should read first, since Prompt 1 generates the schema from it.

---

# PART A — PostgreSQL / Prisma Database Documentation

## 1. Why this setup

- **Database**: PostgreSQL, hosted on **Supabase** (free tier gives you a hosted Postgres instance + connection string in under 2 minutes, no local install needed).
- **ORM**: **Prisma** — you write one schema file, it generates a fully-typed client and handles migrations for you. This matters under time pressure because you never hand-write SQL for basic CRUD, and schema changes (which will happen a lot in the first few hours) are a one-line command.

## 2. One-time setup steps

1. Go to supabase.com → New Project → note down the **connection string** (Settings → Database → Connection String → URI, use the "Transaction" pooler string for serverless-friendly connections).
2. In your backend project:
   ```
   npm install prisma @prisma/client
   npx prisma init
   ```
   This creates a `prisma/schema.prisma` file and a `.env` file.
3. In `.env`, set:
   ```
   DATABASE_URL="your-supabase-connection-string-here"
   ```
4. Paste the schema (Prompt 1 below generates this) into `prisma/schema.prisma`.
5. Run:
   ```
   npx prisma migrate dev --name init
   ```
   This creates the actual tables in your Supabase Postgres instance and generates the typed Prisma Client.
6. Run:
   ```
   npx prisma studio
   ```
   This opens a local GUI in your browser where you can see/edit every table's rows directly — extremely useful for debugging without writing SQL, and for eyeballing your seed data.

## 3. Data model overview (plain language, before the schema)

| Table | What it stores |
|---|---|
| `User` | Internal users (Sales Rep, Sales Manager, Finance, Admin) and their role |
| `Customer` | Companies/people who receive quotations, with their discount tier |
| `Product` | Catalog items, tagged Hardware/Service/Subscription, with category discount ceiling and margin |
| `Warehouse` | Physical stock locations |
| `WarehouseStock` | How many units of each product sit in each warehouse (join table) |
| `Quotation` | The core deal record — status, blended risk score, total, links to customer |
| `QuotationLine` | Each product line on a quotation — quantity, discount, price |
| `ApprovalStep` | Manager/Finance approval records tied to a quotation |
| `AuditLogEntry` | Every approve/reject/edit action, for the audit trail |
| `WarehouseSplit` | How a quotation's fulfillment is split across warehouses |
| `SubscriptionBilling` | Recurring billing schedule entries tied to subscription lines |
| `PortalComment` | Customer's line-level comments/negotiation messages |
| `DealHealthAlert` | Stalled/anomaly alerts shown on the dashboard |

## 4. Full Prisma Schema (reference copy — Prompt 1 will also generate this)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SALES_REP
  SALES_MANAGER
  FINANCE
  ADMIN
}

enum CustomerTier {
  BRONZE
  SILVER
  GOLD
}

enum ProductCategory {
  HARDWARE
  SERVICE
  SUBSCRIPTION
}

enum QuotationStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  UNDER_NEGOTIATION
  CONFIRMED
}

enum ApprovalRole {
  SALES_MANAGER
  FINANCE
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  RETURNED
}

enum BillingCycle {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum AlertType {
  STALLED
  DISCOUNT_ANOMALY
  DELIVERY_SLIPPAGE
}

model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  passwordHash  String
  role          UserRole
  createdAt     DateTime  @default(now())

  quotations    Quotation[]      @relation("RepQuotations")
  approvalSteps ApprovalStep[]
  auditEntries  AuditLogEntry[]
}

model Customer {
  id         String        @id @default(uuid())
  name       String
  email      String        @unique
  tier       CustomerTier
  createdAt  DateTime      @default(now())

  quotations Quotation[]
}

model Product {
  id                String           @id @default(uuid())
  name              String
  category          ProductCategory
  unitPrice         Float
  marginPercent     Float
  discountCeiling   Float            // max allowed discount % for this product's category
  billingCycle      BillingCycle?    // only set if category = SUBSCRIPTION
  createdAt         DateTime         @default(now())

  quotationLines    QuotationLine[]
  warehouseStock    WarehouseStock[]
}

model Warehouse {
  id                String            @id @default(uuid())
  name              String
  shippingCostBase  Float             @default(10)
  createdAt         DateTime          @default(now())

  stock             WarehouseStock[]
  splits            WarehouseSplit[]
}

model WarehouseStock {
  id           String     @id @default(uuid())
  warehouseId  String
  productId    String
  quantity     Int

  warehouse    Warehouse  @relation(fields: [warehouseId], references: [id])
  product      Product    @relation(fields: [productId], references: [id])

  @@unique([warehouseId, productId])
}

model Quotation {
  id                      String            @id @default(uuid())
  customerId              String
  repId                   String
  status                  QuotationStatus   @default(DRAFT)
  blendedRiskScore         Float            @default(0)
  requiresManagerApproval  Boolean          @default(false)
  requiresFinanceApproval  Boolean          @default(false)
  subtotal                Float             @default(0)
  totalDiscount           Float             @default(0)
  total                   Float             @default(0)
  marginPercent           Float             @default(0)
  lastActivityAt          DateTime          @default(now())
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt

  customer                Customer          @relation(fields: [customerId], references: [id])
  rep                     User              @relation("RepQuotations", fields: [repId], references: [id])
  lines                   QuotationLine[]
  approvalSteps           ApprovalStep[]
  auditEntries            AuditLogEntry[]
  warehouseSplits         WarehouseSplit[]
  subscriptionBillings    SubscriptionBilling[]
  portalComments          PortalComment[]
  dealHealthAlerts        DealHealthAlert[]
}

model QuotationLine {
  id               String      @id @default(uuid())
  quotationId      String
  productId        String
  quantity         Int
  unitPrice        Float
  discountPercent  Float       @default(0)
  lineTotal        Float

  quotation        Quotation   @relation(fields: [quotationId], references: [id])
  product          Product     @relation(fields: [productId], references: [id])
}

model ApprovalStep {
  id             String          @id @default(uuid())
  quotationId    String
  approverRole   ApprovalRole
  status         ApprovalStatus  @default(PENDING)
  actedById      String?
  reason         String?
  sequence       Int             // 1 = Sales Manager, 2 = Finance
  createdAt      DateTime        @default(now())
  actedAt        DateTime?

  quotation      Quotation       @relation(fields: [quotationId], references: [id])
  actedBy        User?           @relation(fields: [actedById], references: [id])
}

model AuditLogEntry {
  id            String     @id @default(uuid())
  quotationId   String
  userId        String
  action        String     // e.g. "APPROVED", "REJECTED", "EDITED_LINE", "COUNTER_DISCOUNT"
  detail        String?
  createdAt     DateTime   @default(now())

  quotation     Quotation  @relation(fields: [quotationId], references: [id])
  user          User       @relation(fields: [userId], references: [id])
}

model WarehouseSplit {
  id                    String      @id @default(uuid())
  quotationId           String
  warehouseId           String
  quantityFulfilled     Int
  estimatedShipmentCost Float

  quotation             Quotation   @relation(fields: [quotationId], references: [id])
  warehouse             Warehouse   @relation(fields: [warehouseId], references: [id])
}

model SubscriptionBilling {
  id              String        @id @default(uuid())
  quotationId     String
  productId       String
  billingCycle    BillingCycle
  nextBillingDate DateTime
  amount          Float

  quotation       Quotation     @relation(fields: [quotationId], references: [id])
}

model PortalComment {
  id           String     @id @default(uuid())
  quotationId  String
  lineId       String?
  author       String
  message      String
  createdAt    DateTime   @default(now())

  quotation    Quotation  @relation(fields: [quotationId], references: [id])
}

model DealHealthAlert {
  id           String     @id @default(uuid())
  quotationId  String
  type         AlertType
  message      String
  createdAt    DateTime   @default(now())

  quotation    Quotation  @relation(fields: [quotationId], references: [id])
}
```

## 5. Seeding data (instead of building admin CRUD screens)

Create `prisma/seed.ts` that inserts: 2 warehouses, 8-10 products across all 3 categories, 3 customers (one per tier), 4 internal users (one per role), and stock levels per warehouse. Wire it into `package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Run with `npx prisma db seed`. This is covered in full in Prompt 2 below — you don't need to hand-write this, just run the prompt.

## 6. Quick command reference

| Command | What it does |
|---|---|
| `npx prisma migrate dev --name <desc>` | Apply schema changes to DB, create migration file |
| `npx prisma generate` | Regenerate the typed client after schema changes (auto-runs with migrate) |
| `npx prisma studio` | Visual DB browser in your local browser |
| `npx prisma db seed` | Run your seed script |
| `npx prisma migrate reset` | Wipe DB and re-run all migrations + seed (use if data gets messy mid-hackathon) |

---

# PART B — Backend Build Prompts (paste one at a time, in order)

## PROMPT 0 — Project Setup

```
Create a Node.js backend project using Express and TypeScript.

Requirements:
- Initialize with npm, set up TypeScript (tsconfig.json targeting ES2020, strict mode on, outDir "dist", rootDir "src").
- Install: express, cors, dotenv, zod, bcrypt, jsonwebtoken, @prisma/client
- Install as dev dependencies: typescript, ts-node, ts-node-dev, @types/express, @types/node, @types/cors, @types/bcrypt, @types/jsonwebtoken, prisma
- Set up npm scripts: "dev" (ts-node-dev --respawn src/index.ts), "build" (tsc), "start" (node dist/index.js)
- Create folder structure under src/:
  - src/index.ts (app entry point)
  - src/routes/ (one file per resource: auth.routes.ts, quotations.routes.ts, products.routes.ts, warehouses.routes.ts, approvals.routes.ts, portal.routes.ts, dashboard.routes.ts)
  - src/controllers/ (matching controller files)
  - src/services/ (business logic: pricing.service.ts, risk.service.ts, fulfillment.service.ts, approval.service.ts)
  - src/middleware/ (auth.middleware.ts for JWT verification, error.middleware.ts for centralized error handling, role.middleware.ts for role-based route guards)
  - src/lib/prisma.ts (exports a single shared PrismaClient instance)
  - src/types/ (shared TypeScript interfaces/DTOs)
- In src/index.ts: set up Express app, cors() with origin from env var FRONTEND_URL, express.json() body parser, mount all route files under /api/<resource>, a health check route GET /api/health returning { status: "ok" }, and centralized error middleware mounted last.
- Set up .env with: DATABASE_URL, JWT_SECRET, FRONTEND_URL, PORT (default 4000).
- Do not implement any route logic yet — just scaffold the structure with empty route files that export an Express Router, and a placeholder controller function for each route returning a 501 "Not implemented" response.

Then run `npx prisma init` and paste in this exact schema.prisma content:

[PASTE THE FULL PRISMA SCHEMA FROM PART A, SECTION 4 HERE]

After pasting, run the migration to create all tables in the connected Postgres database.
```

---

## PROMPT 1 — Seed Data Script

```
Create prisma/seed.ts for the DealFlow360 database using the existing Prisma schema.

Seed the following:
- 2 Warehouses: "Main Warehouse" and "East Depot"
- 4 Users: one each with role SALES_REP, SALES_MANAGER, FINANCE, ADMIN — use bcrypt to hash a simple shared password "password123" for all of them, with realistic names and emails
- 3 Customers: one BRONZE tier, one SILVER tier, one GOLD tier, realistic company names
- 9 Products total, 3 per category:
  - Hardware (discountCeiling 15): e.g. Laptop Pro 15, Wireless Mouse, 4K Monitor
  - Service (discountCeiling 10): e.g. Onboarding Setup, Priority Support Plan, Custom Integration
  - Subscription (discountCeiling 12, with billingCycle MONTHLY or YEARLY): e.g. Cloud Storage Plan, Analytics Add-on, Premium Support Subscription
  - Give each product a realistic unitPrice and marginPercent (Hardware higher margin ~30-40%, Service ~50-60%, Subscription ~70-80%)
- WarehouseStock: distribute realistic stock quantities for each product across both warehouses — make at least 2 products intentionally low-stock in "Main Warehouse" but well-stocked in "East Depot", so the warehouse-split logic has something real to demonstrate
- 1 sample Quotation in DRAFT status for the GOLD customer with 2-3 QuotationLines already added, to have something to open immediately when testing the frontend

Wire this into package.json under a "prisma.seed" key using ts-node, and run it to confirm it populates the database (I should see the confirmation output of how many of each record was created, logged to console).
```

---

## PROMPT 2 — Auth Routes (Signup, Login, JWT Middleware)

```
Implement authentication for the DealFlow360 backend.

In src/services/ and src/controllers/, build:

POST /api/auth/signup
- Body: { name, email, password, role } — validate with zod (email format, password min 6 chars, role must be one of the enum values)
- Hash password with bcrypt before storing
- Create the User record via Prisma
- Return a JWT (signed with JWT_SECRET, 7 day expiry) containing { userId, role }, plus the created user (excluding passwordHash) in the response

POST /api/auth/login
- Body: { email, password }
- Look up user by email, compare password with bcrypt
- If valid, return same JWT shape as signup
- If invalid, return 401 with a generic "Invalid credentials" message (don't leak whether email exists)

POST /api/auth/portal-magic-link
- Body: { email }
- For this hackathon scope, simulate a magic link: look up or create a Customer by email if not exists, generate a short-lived JWT (1 hour expiry) containing { customerId, type: "portal" }, and return it directly in the response as { magicLinkToken } instead of actually emailing it (log a comment in code explaining this is simulated for demo purposes, and in production this token would be emailed as a link)

In src/middleware/auth.middleware.ts:
- Create a requireAuth middleware that reads the Authorization: Bearer <token> header, verifies the JWT, and attaches the decoded payload to req.user; returns 401 if missing/invalid
- Create a requireRole(...allowedRoles) middleware factory that checks req.user.role is in the allowed list, returns 403 otherwise
- Create a requirePortalAuth middleware for portal-only routes that checks the JWT payload has type: "portal"

Apply requireAuth to all internal routes going forward (quotations, approvals, dashboard) except auth routes themselves, and requirePortalAuth to portal routes.
```

---

## PROMPT 3 — Products & Warehouses Read Endpoints

```
Implement read endpoints for products and warehouses (no create/update UI needed for these — they're seeded directly).

GET /api/products
- Returns all products, optional query param ?category=HARDWARE|SERVICE|SUBSCRIPTION to filter
- Include discountCeiling and marginPercent in the response since the frontend needs these for the risk score and margin indicator

GET /api/products/:id
- Returns a single product by id, 404 if not found

GET /api/warehouses
- Returns all warehouses with their stock levels, structured as: { id, name, stock: [{ productId, productName, quantity }] }

Protect all three with requireAuth. Write the Prisma queries efficiently (use include/select to avoid over-fetching — only join what's needed for each response shape).
```

---

## PROMPT 4 — Quotations CRUD + Pricing/Risk Engine (Most Important Prompt)

```
This is the core business logic of DealFlow360. Implement it carefully.

First, in src/services/pricing.service.ts, write these pure functions:

calculateLineTotal(quantity, unitPrice, discountPercent): number
- Returns quantity * unitPrice * (1 - discountPercent/100)

calculateOrderTotals(lines: {quantity, unitPrice, discountPercent}[]): { subtotal, totalDiscount, total }
- subtotal = sum of quantity*unitPrice before discount
- total = sum of each line's calculateLineTotal
- totalDiscount = subtotal - total

calculateOrderMargin(lines: {quantity, unitPrice, discountPercent, marginPercent}[]): number
- For each line, effective margin = marginPercent - discountPercent (a bigger discount eats directly into margin)
- Return the weighted average effective margin across all lines, weighted by each line's revenue (quantity*unitPrice*(1-discount/100))

Then in src/services/risk.service.ts, write:

calculateBlendedRiskScore(lines: {quantity, unitPrice, discountPercent, discountCeiling}[]): number
- For each line: overage = max(0, discountPercent - discountCeiling)
- lineWeight = quantity * unitPrice (that line's revenue contribution)
- weightedOverage = overage * lineWeight
- blendedScore = (sum of all weightedOverage) / (sum of all lineWeight) — this gives a revenue-weighted average overage percentage across the whole order
- Return this as a number (e.g. 0 = no overage anywhere, higher = worse)

determineApprovalRequirements(blendedScore: number): { requiresManagerApproval: boolean, requiresFinanceApproval: boolean }
- If blendedScore > 0: requiresManagerApproval = true
- If blendedScore > 5 (i.e. average weighted overage exceeds 5 percentage points): requiresFinanceApproval = true
- (Document these thresholds clearly with a comment — they're tunable, and 0/5 are reasonable defaults for demo purposes)

Now implement the Quotation routes and controllers:

POST /api/quotations
- Body: { customerId, lines: [{productId, quantity, discountPercent}] }
- Look up each product to get unitPrice, marginPercent, discountCeiling
- Compute lineTotal, order totals, margin, and blended risk score using the services above
- Compute requiresManagerApproval/requiresFinanceApproval
- Create the Quotation + QuotationLine records in a single Prisma transaction
- If requiresManagerApproval is true, also create an ApprovalStep (sequence 1, role SALES_MANAGER, status PENDING), and if requiresFinanceApproval also create a second ApprovalStep (sequence 2, role FINANCE, status PENDING); set Quotation status to PENDING_APPROVAL in that case, otherwise DRAFT (or the caller can pass an explicit "confirm" flag to move straight to a fulfillment-ready state — keep this simple, default new quotations to DRAFT unless the body includes submitForApproval: true)
- Return the full created quotation with lines and any approval steps included

GET /api/quotations
- Optional query params: ?status=, ?repId=
- Return list of quotations with customer name, tier, total, status, blendedRiskScore, lastActivityAt (don't include full line details in the list view, keep it light)

GET /api/quotations/:id
- Return full quotation detail: all lines with product info joined, approval steps, audit entries, warehouse splits, subscription billings, portal comments — everything needed to render the full quotation detail page

PATCH /api/quotations/:id
- Body: { lines: [...] } to update lines (e.g. add/remove/edit a line), or { status } to change status directly for simple transitions
- If lines are updated, recompute totals/margin/blended risk score and requiresManagerApproval/requiresFinanceApproval exactly like on create, and update the Quotation record accordingly
- Also update lastActivityAt to now() on every PATCH (needed later for the "stalled deals" dashboard logic)
- Write an AuditLogEntry for this action (action: "EDITED_LINES" or "STATUS_CHANGED", with a detail string summarizing what changed)

POST /api/quotations/:id/submit-for-approval
- Explicitly moves a DRAFT quotation into PENDING_APPROVAL, creating the appropriate ApprovalStep(s) based on its current blended risk score (recompute at this moment in case lines changed since draft creation)
- If blendedScore is 0 (no approval needed), instead set status directly to APPROVED and skip creating approval steps

Protect all routes with requireAuth. Use Prisma transactions (prisma.$transaction) anywhere multiple related records are created/updated together, so partial writes can't happen.
```

---

## PROMPT 5 — Approval Workflow Endpoints

```
Implement the approval action endpoints.

GET /api/quotations/:id/approvals
- Return all ApprovalStep records for a quotation, ordered by sequence, each including actedBy user info if acted

POST /api/quotations/:id/approvals/:stepId/action
- Body: { action: "APPROVE" | "REJECT" | "RETURN", reason?: string }
- Guard: only allow this if req.user.role matches the step's approverRole (SALES_MANAGER can only act on SALES_MANAGER steps, FINANCE only on FINANCE steps) — return 403 otherwise
- Guard: only allow acting on a step whose status is currently PENDING — return 400 otherwise
- Update the ApprovalStep: status = APPROVED/REJECTED/RETURNED, actedById = req.user.userId, actedAt = now(), reason
- Create an AuditLogEntry recording this action
- Business logic on what happens next:
  - If action is REJECT or RETURN: set the Quotation status to REJECTED (for REJECT) or DRAFT (for RETURN, so the rep can revise and resubmit)
  - If action is APPROVE: check if there's a next sequence step (e.g. this was Sales Manager and Finance step exists) — if so, do nothing else (that step is already PENDING and now becomes actionable); if this was the last/only step, set Quotation status to APPROVED
- Return the updated ApprovalStep and the updated Quotation status

GET /api/quotations/:id/audit-log
- Return all AuditLogEntry records for a quotation, ordered newest first, each including the acting user's name

Protect all with requireAuth. Use requireRole appropriately where the guard logic above applies (though the fine-grained "does this step belong to this role" check needs to happen inside the controller since it depends on which step, not just a static role check).
```

---

## PROMPT 6 — Upsell Suggestions Endpoint

```
Implement a simple upsell/cross-sell suggestion endpoint.

GET /api/quotations/:id/upsell-suggestions
- Look at the products currently in the quotation's lines
- For this hackathon scope, implement simple rule-based matching rather than real ML: hardcode a small "pairing map" in src/services/upsell.service.ts, e.g. { "Laptop Pro 15": ["Wireless Mouse", "Priority Support Plan"], "Cloud Storage Plan": ["Analytics Add-on"] } etc — extend this map to cover most of your seeded products with at least one sensible pairing
- For each matched suggestion not already in the quotation, calculate marginDelta as the suggested product's unitPrice * marginPercent (the margin dollars it would add if added at full price)
- Mark isPromoted: true for 1-2 hardcoded "currently promoted" products (add a simple boolean flag you can set on specific seed products, or just hardcode product names in the service)
- Return an array of { productId, productName, marginDelta, isPromoted }, sorted by marginDelta descending, limited to top 3

Protect with requireAuth.
```

---

## PROMPT 7 — Warehouse Fulfillment Split Endpoint

```
Implement the warehouse auto-split logic.

In src/services/fulfillment.service.ts, write:

calculateWarehouseSplit(quotationLines: {productId, quantity}[], warehouses: {id, name, shippingCostBase, stock: {productId, quantity}[]}[]): SplitResult
- For each line, try to fulfill fully from the first warehouse (by array order, or you can order warehouses by which has more total stock overlap with this order — keep it simple: just try warehouse[0] first, then warehouse[1], etc)
- If warehouse[0] has insufficient stock for that product, take what it has, then take the remainder from warehouse[1], and so on
- If total stock across all warehouses is insufficient, mark the shortfall as backorder (quantity that could not be assigned to any warehouse)
- Group the result by warehouse: for each warehouse used, list which products/quantities it's fulfilling, and calculate an estimatedShipmentCost as warehouse.shippingCostBase + (0.5 * total units shipped from that warehouse) — a simple mock formula, document it with a comment
- Return: { splits: [{warehouseId, warehouseName, lines: [{productId, quantity}], estimatedShipmentCost}], backorders: [{productId, quantity}], totalEstimatedShipments, totalEstimatedCost }

Then implement:

POST /api/quotations/:id/fulfillment/calculate
- Fetch the quotation's lines and all warehouses with current stock
- Run calculateWarehouseSplit
- Return the result WITHOUT persisting it yet (this is the "preview" the frontend shows before the user clicks Accept)

POST /api/quotations/:id/fulfillment/confirm
- Body: either { useCalculated: true } to persist the last-calculated split, or { manualSplit: [{warehouseId, productId, quantity}] } for a manual override
- Persist as WarehouseSplit records (delete any existing ones for this quotation first, then create new ones)
- Write an AuditLogEntry noting whether it was auto-calculated or manually overridden
- Return the persisted split

GET /api/quotations/:id/fulfillment
- Return the currently persisted WarehouseSplit records for a quotation, if any

Protect all with requireAuth.
```

---

## PROMPT 8 — Subscription Billing Endpoint

```
Implement subscription/recurring billing endpoints.

POST /api/quotations/:id/billing/generate-schedule
- For each quotation line whose product has a billingCycle set (i.e. it's a SUBSCRIPTION product), calculate the next 3 billing dates based on the cycle (MONTHLY = +1 month each, QUARTERLY = +3 months, YEARLY = +12 months) starting from today, using date manipulation (install and use date-fns if not already present)
- Create SubscriptionBilling records for each (productId, billingCycle, nextBillingDate, amount = that line's current lineTotal)
- Return the created billing schedule entries grouped by product

GET /api/quotations/:id/billing
- Return: { oneTimeLines: [...lines where product category != SUBSCRIPTION with product info joined...], recurringLines: [...lines where product category = SUBSCRIPTION...], billingSchedule: [...SubscriptionBilling records for this quotation, ordered by nextBillingDate...] }

PATCH /api/quotations/:id/billing/lines/:lineId
- Body: { quantity } — for changing a recurring line's quantity mid-cycle
- Update the QuotationLine quantity and recompute its lineTotal
- Return a mock prorationNote in the response like: "Prorated adjustment: +$X for remaining billing period" where X = (new lineTotal - old lineTotal) * (a simple fraction like 0.5 to represent "half the cycle remaining" — document this is simplified for demo purposes, not full day-accurate proration)
- Write an AuditLogEntry

Protect with requireAuth.
```

---

## PROMPT 9 — Customer Portal Endpoints

```
Implement the customer-facing portal endpoints. These use requirePortalAuth instead of requireAuth (from the auth middleware built earlier), since the customer is not an internal user.

GET /api/portal/quotations/:id
- Verify the JWT's customerId matches this quotation's customerId — return 403 if not (a customer must only ever see their own quotation)
- Return the quotation with lines, product info, current status, and existing PortalComments

POST /api/portal/quotations/:id/comments
- Body: { lineId?: string, message: string }
- Verify customer ownership as above
- Create a PortalComment record with author set to the customer's name/email from the JWT
- Return the created comment

POST /api/portal/quotations/:id/counter-discount
- Body: { proposedDiscountPercent, justification, lineId? } (lineId optional if it's an order-level counter rather than line-specific)
- Verify customer ownership
- If a lineId is given, update that QuotationLine's discountPercent to the proposed value; otherwise apply proportionally is out of scope — just support the line-level case for the demo
- Recompute the quotation's blended risk score and approval requirements exactly like the internal PATCH endpoint does (reuse the same service functions from pricing.service.ts and risk.service.ts — don't duplicate logic)
- If it now requires approval, set status to PENDING_APPROVAL and create the appropriate ApprovalStep(s) (same logic as submit-for-approval); if not, keep status as UNDER_NEGOTIATION or set to APPROVED if it was previously approved and stays within limits
- Write an AuditLogEntry with action "COUNTER_DISCOUNT" and detail describing the proposed change
- Return the updated quotation status and whether it re-entered approval

POST /api/portal/quotations/:id/confirm
- Verify customer ownership and that current status allows confirmation (not already CONFIRMED, not PENDING_APPROVAL — a quotation with an active approval requirement should not be confirmable by the customer; return 400 with a clear message if so)
- Set status to CONFIRMED
- Write an AuditLogEntry
- Return the updated quotation

Reuse pricing/risk service functions rather than rewriting the risk logic here — this endpoint must produce identical blended-score results to the internal quotation endpoints.
```

---

## PROMPT 10 — Dashboard Endpoint

```
Implement the deal health dashboard data endpoint.

GET /api/dashboard/summary
- Optional query params: ?periodDays=30 (default 30)
- Return:
  {
    kpis: {
      activeQuotations: count of quotations with status not in [REJECTED, CONFIRMED],
      pendingApprovals: count of quotations with status = PENDING_APPROVAL,
      avgDiscountGiven: average discountPercent across all QuotationLines in the period,
      atRiskDeals: count of quotations with blendedRiskScore > 5 that are not yet CONFIRMED or REJECTED
    },
    discountByRep: [{ repName, avgDiscount }] — grouped by rep, across quotations in the period,
    volumeOverTime: [{ date, count }] — quotation creation count per day for the period,
    stalledDeals: quotations where lastActivityAt is older than 5 days AND status not in [CONFIRMED, REJECTED], each with { id, customerName, daysStalled, total },
    discountAnomalies: for each rep, compute their average discountPercent historically, then find any quotation line where that rep gave a discount more than 1.5x their own average — return these as { quotationId, repName, discountGiven, repAverage }
  }

Write the anomaly and stalled-deal queries as raw logic in the controller (fetch the needed rows with Prisma, then compute in JS) rather than complex raw SQL, since this is easier to get right quickly and the data volume in a hackathon demo is tiny.

Protect with requireAuth.
```

---

## PROMPT 11 — Error Handling, Validation & CORS Polish

```
Do a final backend consistency pass:

1. In src/middleware/error.middleware.ts, build a centralized error handler that catches thrown errors from any route, checks if it's a known error type (create a small custom AppError class with statusCode + message that services/controllers can throw), and returns a consistent JSON shape: { error: { message, statusCode } }. Unknown errors should return 500 with a generic message (don't leak stack traces to the client) but log the full error to console for debugging.

2. Go through every controller built in previous prompts and wrap the body in try/catch, passing errors to next(err) so they reach the centralized handler — or convert routes to use an async wrapper helper (asyncHandler) that does this automatically, to avoid repetitive try/catch blocks.

3. Add zod validation schemas for every POST/PATCH endpoint's request body if not already present from earlier prompts, and return 400 with clear validation error messages when a request fails validation (use a validate(schema) middleware factory that runs before the controller).

4. Double check CORS is configured to allow the frontend's URL (from FRONTEND_URL env var) with credentials if needed, and that the Authorization header is allowed.

5. Add a simple request logger middleware (method, path, status code, response time) for debugging during development — console.log is fine, no need for a logging library.

Do not add new features in this pass — only error handling, validation, and stability.
```

---

## PROMPT 12 — Quick API Smoke Test Script

```
Write a simple Node.js script (scripts/smoke-test.ts) that, when run with ts-node, exercises the full happy path against the running local backend using axios:

1. Login as the seeded Sales Rep user
2. Create a new quotation for the seeded Gold customer with one Hardware line at a discount above its ceiling
3. Confirm the response shows requiresManagerApproval = true and a non-zero blendedRiskScore
4. Submit it for approval
5. Login as the seeded Sales Manager and approve the pending step
6. Confirm the quotation status becomes APPROVED
7. Calculate and confirm a warehouse fulfillment split
8. Generate a subscription billing schedule (skip if the sample quotation has no subscription line — log a note instead)
9. Log a magic link token for the portal, use it to fetch the quotation via the portal endpoint, and submit a counter-discount that pushes it back into PENDING_APPROVAL
10. Print a clear PASS/FAIL summary for each of these 9 steps to the console

This script should be runnable any time during development to instantly verify the whole backend flow still works end-to-end after changes, without needing the frontend running.
```

---

## Notes for you (backend owner)

- **Endpoint list your friend needs** (share this once you're a couple prompts in): every route path listed above is your API contract. Your friend's `lib/api.ts` axios calls should target these exact paths with these exact request/response shapes.
- **Priority order if time runs short**, matching the frontend priority: Prompt 4 (Quotations + Risk Engine) → Prompt 5 (Approvals) → Prompt 9 (Portal) → Prompt 7 (Warehouse) → Prompt 10 (Dashboard) → Prompt 6 (Upsell) → Prompt 8 (Billing).
- Run Prompt 12's smoke test script early and often — it's your safety net for catching regressions without needing the frontend up.
