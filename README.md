# DealFlow360 — Next-Gen B2B Quote & Deal Flow Orchestration Platform

DealFlow360 is a full-stack enterprise B2B quotation, discount risk management, and deal approval platform built with Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, React, and Tailwind CSS.

---

## 🚀 Key Features

1. **Intelligent Quotations Engine**: Real-time discount ceiling monitoring, margin calculations, and multi-line deal builder.
2. **Dynamic Risk Engine**: Evaluates blended risk scores across customer tier thresholds and flags manager/finance approval workflows.
3. **Sequential Approvals Workflow**: Multi-tier approvals (Sales Manager seq 1, Finance seq 2) with audit trail.
4. **Section B5 Cart Upsell & Cross-Sell**: Smart recommendations for complementary services and high-margin boosters to offset hardware discount concessions.
5. **Customer Negotiation Portal**: Secure client portal for real-time negotiation, line-item queries, discount counter-offers, and electronic quote acceptance.
6. **Multi-Warehouse Fulfillment Splitting**: Regional inventory availability checks and split shipping across warehouses (Main Tech Hub, East Coast Depot, West Hub).
7. **MRR/ARR Subscription Billing Engine**: Proration, ramp-up schedules, and recurring billing analytics.
8. **Deal Health Heatmaps & Reporting**: Executive analytics, discount overage charts, margin tracking, and rep performance KPIs.

---

## 🏗️ Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Zod, JWT, bcrypt
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons
- **Database**: PostgreSQL (Prisma schema with full relations & enums)

---

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL in .env
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run dev
```
Backend runs on `http://localhost:4000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

---

## 🔑 Demo Login Credentials

### Internal Accounts (Role-Based)
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@dealflow360.com` | `password123` |
| **Sales Rep** | `rep@dealflow360.com` | `password123` |
| **Sales Manager** | `manager@dealflow360.com` | `password123` |
| **Finance** | `finance@dealflow360.com` | `password123` |

### Customer Portal Accounts (Client Tiers)
| Account | Email | Tier | Max Ceiling |
| :--- | :--- | :--- | :--- |
| **Apex Enterprises** | `deals@apexenterprises.com` | Gold | 15% |
| **Wayne Technologies** | `procurement@waynetech.com` | Silver | 10% |
| **Stark Logistics** | `contact@starklogistics.io` | Bronze | 5% |
