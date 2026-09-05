# DealFlow360 — API Contract Reference

Base URL: `http://localhost:4000/api` (set as `NEXT_PUBLIC_API_URL` on frontend)

All internal endpoints require header: `Authorization: Bearer <token>`
Portal endpoints require a portal token (from magic link) in the same header.

All error responses share this shape:
```json
{ "error": { "message": "string", "statusCode": 400 } }
```

---

## Auth

### POST /auth/signup
**Body:**
```json
{ "name": "string", "email": "string", "password": "string", "role": "SALES_REP | SALES_MANAGER | FINANCE | ADMIN" }
```
**Response 201:**
```json
{ "token": "jwt", "user": { "id": "uuid", "name": "string", "email": "string", "role": "string" } }
```

### POST /auth/login
**Body:** `{ "email": "string", "password": "string" }`
**Response 200:** same shape as signup
**Response 401:** `{ "error": { "message": "Invalid credentials", "statusCode": 401 } }`

### POST /auth/portal-magic-link
**Body:** `{ "email": "string" }`
**Response 200:** `{ "magicLinkToken": "jwt" }`
*(Simulated for demo — normally emailed, here returned directly.)*

---

## Products & Warehouses

### GET /products?category=HARDWARE|SERVICE|SUBSCRIPTION
**Response 200:**
```json
[{ "id": "uuid", "name": "string", "category": "string", "unitPrice": 0, "marginPercent": 0, "discountCeiling": 0, "billingCycle": "MONTHLY|QUARTERLY|YEARLY|null" }]
```

### GET /products/:id
**Response 200:** single product object (same shape as above)
**Response 404** if not found

### GET /warehouses
**Response 200:**
```json
[{ "id": "uuid", "name": "string", "stock": [{ "productId": "uuid", "productName": "string", "quantity": 0 }] }]
```

---

## Quotations

### POST /quotations
**Body:**
```json
{
  "customerId": "uuid",
  "lines": [{ "productId": "uuid", "quantity": 0, "discountPercent": 0 }],
  "submitForApproval": false
}
```
**Response 201:** full quotation object (see GET /quotations/:id shape below)

### GET /quotations?status=&repId=
**Response 200:**
```json
[{ "id": "uuid", "customerName": "string", "customerTier": "string", "total": 0, "status": "string", "blendedRiskScore": 0, "lastActivityAt": "iso-date" }]
```

### GET /quotations/:id
**Response 200:**
```json
{
  "id": "uuid",
  "customer": { "id": "uuid", "name": "string", "tier": "string" },
  "rep": { "id": "uuid", "name": "string" },
  "status": "string",
  "blendedRiskScore": 0,
  "requiresManagerApproval": false,
  "requiresFinanceApproval": false,
  "subtotal": 0, "totalDiscount": 0, "total": 0, "marginPercent": 0,
  "lines": [{ "id": "uuid", "productId": "uuid", "productName": "string", "category": "string", "quantity": 0, "unitPrice": 0, "discountPercent": 0, "lineTotal": 0, "discountCeiling": 0 }],
  "approvalSteps": [{ "id": "uuid", "approverRole": "string", "status": "string", "sequence": 0, "actedBy": "string|null", "actedAt": "iso-date|null", "reason": "string|null" }],
  "auditEntries": [{ "id": "uuid", "action": "string", "detail": "string|null", "userName": "string", "createdAt": "iso-date" }],
  "warehouseSplits": [ ... see /fulfillment shape ... ],
  "subscriptionBillings": [ ... see /billing shape ... ],
  "portalComments": [{ "id": "uuid", "lineId": "uuid|null", "author": "string", "message": "string", "createdAt": "iso-date" }],
  "lastActivityAt": "iso-date", "createdAt": "iso-date", "updatedAt": "iso-date"
}
```

### PATCH /quotations/:id
**Body (either or both):**
```json
{ "lines": [{ "productId": "uuid", "quantity": 0, "discountPercent": 0 }], "status": "string" }
```
**Response 200:** updated full quotation object (same shape as GET /:id)

### POST /quotations/:id/submit-for-approval
**Body:** none
**Response 200:** updated quotation with status + approvalSteps populated

---

## Approvals

### GET /quotations/:id/approvals
**Response 200:** array of approval step objects (see nested shape above)

### POST /quotations/:id/approvals/:stepId/action
**Body:**
```json
{ "action": "APPROVE | REJECT | RETURN", "reason": "string (optional)" }
```
**Response 200:**
```json
{ "step": { ...updated ApprovalStep... }, "quotationStatus": "string" }
```
**Response 403** if acting user's role doesn't match step's approverRole
**Response 400** if step is not currently PENDING

### GET /quotations/:id/audit-log
**Response 200:**
```json
[{ "id": "uuid", "action": "string", "detail": "string|null", "userName": "string", "createdAt": "iso-date" }]
```

---

## Upsell

### GET /quotations/:id/upsell-suggestions
**Response 200:**
```json
[{ "productId": "uuid", "productName": "string", "marginDelta": 0, "isPromoted": false }]
```
*(Top 3, sorted by marginDelta descending.)*

---

## Fulfillment

### POST /quotations/:id/fulfillment/calculate
**Body:** none
**Response 200:**
```json
{
  "splits": [{ "warehouseId": "uuid", "warehouseName": "string", "lines": [{ "productId": "uuid", "quantity": 0 }], "estimatedShipmentCost": 0 }],
  "backorders": [{ "productId": "uuid", "quantity": 0 }],
  "totalEstimatedShipments": 0,
  "totalEstimatedCost": 0
}
```
*(Preview only — not persisted.)*

### POST /quotations/:id/fulfillment/confirm
**Body (one of):**
```json
{ "useCalculated": true }
```
or
```json
{ "manualSplit": [{ "warehouseId": "uuid", "productId": "uuid", "quantity": 0 }] }
```
**Response 200:** persisted split records, same shape as `splits` array above

### GET /quotations/:id/fulfillment
**Response 200:** currently persisted split records (empty array if none yet)

---

## Billing

### POST /quotations/:id/billing/generate-schedule
**Body:** none
**Response 200:**
```json
[{ "productId": "uuid", "productName": "string", "billingCycle": "string", "schedule": [{ "nextBillingDate": "iso-date", "amount": 0 }] }]
```

### GET /quotations/:id/billing
**Response 200:**
```json
{
  "oneTimeLines": [{ ...line with product info... }],
  "recurringLines": [{ ...line with product info + billingCycle... }],
  "billingSchedule": [{ "productId": "uuid", "productName": "string", "nextBillingDate": "iso-date", "amount": 0 }]
}
```

### PATCH /quotations/:id/billing/lines/:lineId
**Body:** `{ "quantity": 0 }`
**Response 200:**
```json
{ "line": { ...updated QuotationLine... }, "prorationNote": "string" }
```

---

## Customer Portal

*(All require portal token; customerId in token must match the quotation's customer.)*

### GET /portal/quotations/:id
**Response 200:** quotation object scoped to what a customer should see (lines, totals, status, comments — no internal fields like repId or audit log)
**Response 403** if token's customerId doesn't match

### POST /portal/quotations/:id/comments
**Body:** `{ "lineId": "uuid (optional)", "message": "string" }`
**Response 201:** `{ "id": "uuid", "lineId": "uuid|null", "author": "string", "message": "string", "createdAt": "iso-date" }`

### POST /portal/quotations/:id/counter-discount
**Body:** `{ "proposedDiscountPercent": 0, "justification": "string", "lineId": "uuid" }`
**Response 200:**
```json
{ "quotationStatus": "string", "reenteredApproval": false, "blendedRiskScore": 0 }
```

### POST /portal/quotations/:id/confirm
**Body:** none
**Response 200:** `{ "quotationStatus": "CONFIRMED" }`
**Response 400** if status doesn't allow confirmation (e.g. still PENDING_APPROVAL)

---

## Dashboard

### GET /dashboard/summary?periodDays=30
**Response 200:**
```json
{
  "kpis": {
    "activeQuotations": 0,
    "pendingApprovals": 0,
    "avgDiscountGiven": 0,
    "atRiskDeals": 0
  },
  "discountByRep": [{ "repName": "string", "avgDiscount": 0 }],
  "volumeOverTime": [{ "date": "iso-date", "count": 0 }],
  "stalledDeals": [{ "id": "uuid", "customerName": "string", "daysStalled": 0, "total": 0 }],
  "discountAnomalies": [{ "quotationId": "uuid", "repName": "string", "discountGiven": 0, "repAverage": 0 }]
}
```

---

## Status & Enum Reference

Keep these string values identical on both frontend and backend — copy-paste, don't retype.

| Enum | Values |
|---|---|
| UserRole | `SALES_REP`, `SALES_MANAGER`, `FINANCE`, `ADMIN` |
| CustomerTier | `BRONZE`, `SILVER`, `GOLD` |
| ProductCategory | `HARDWARE`, `SERVICE`, `SUBSCRIPTION` |
| QuotationStatus | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `UNDER_NEGOTIATION`, `CONFIRMED` |
| ApprovalRole | `SALES_MANAGER`, `FINANCE` |
| ApprovalStatus | `PENDING`, `APPROVED`, `REJECTED`, `RETURNED` |
| BillingCycle | `MONTHLY`, `QUARTERLY`, `YEARLY` |
| AlertType | `STALLED`, `DISCOUNT_ANOMALY`, `DELIVERY_SLIPPAGE` |

---

## Integration checklist for the frontend dev

1. Set `NEXT_PUBLIC_API_URL` to the running backend URL.
2. Store the JWT from login/signup (localStorage or an httpOnly cookie if time allows — localStorage is fine for a hackathon) and attach it as `Authorization: Bearer <token>` on every request via an axios interceptor in `lib/api.ts`.
3. Replace `lib/mock-data.ts` calls with real calls to the endpoints above, using the exact enum string values from the table.
4. For the portal screens, use the `magicLinkToken` returned from `/auth/portal-magic-link` the same way — attach it as the Bearer token for all `/portal/*` calls.
5. Test each screen against a real backend response once its endpoint is done — don't wait until everything is built to do the swap, integrate screen-by-screen as each endpoint prompt finishes.
