import { PrismaClient, UserRole, CustomerTier, ProductCategory, BillingCycle, QuotationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DealFlow360 database seed...');

  // 1. Clean existing records (optional for idempotency)
  await prisma.dealHealthAlert.deleteMany();
  await prisma.portalComment.deleteMany();
  await prisma.subscriptionBilling.deleteMany();
  await prisma.warehouseSplit.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Warehouses
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      shippingCostBase: 15.0,
    },
  });

  const eastDepot = await prisma.warehouse.create({
    data: {
      name: 'East Depot',
      shippingCostBase: 25.0,
    },
  });
  console.log('✅ Created 2 Warehouses');

  // 3. Seed Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const salesRep = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Sales Rep)',
      email: 'rep@dealflow360.com',
      passwordHash,
      role: UserRole.SALES_REP,
    },
  });

  const salesManager = await prisma.user.create({
    data: {
      name: 'Michael Scott (Sales Manager)',
      email: 'manager@dealflow360.com',
      passwordHash,
      role: UserRole.SALES_MANAGER,
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      name: 'Angela Martin (Finance)',
      email: 'finance@dealflow360.com',
      passwordHash,
      role: UserRole.FINANCE,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      name: 'David Wallace (Admin)',
      email: 'admin@dealflow360.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Created 4 Users (rep, manager, finance, admin)');

  // 4. Seed Customers
  const bronzeCustomer = await prisma.customer.create({
    data: {
      name: 'Stark Logistics',
      email: 'contact@starklogistics.io',
      tier: CustomerTier.BRONZE,
    },
  });

  const silverCustomer = await prisma.customer.create({
    data: {
      name: 'Wayne Technologies',
      email: 'procurement@waynetech.com',
      tier: CustomerTier.SILVER,
    },
  });

  const goldCustomer = await prisma.customer.create({
    data: {
      name: 'Apex Enterprises',
      email: 'deals@apexenterprises.com',
      tier: CustomerTier.GOLD,
    },
  });
  console.log('✅ Created 3 Customers (Bronze, Silver, Gold)');

  // 5. Seed Products
  // Hardware
  const laptopPro = await prisma.product.create({
    data: {
      name: 'Laptop Pro 15',
      category: ProductCategory.HARDWARE,
      unitPrice: 1299.0,
      marginPercent: 35.0,
      discountCeiling: 15.0,
    },
  });

  const wirelessMouse = await prisma.product.create({
    data: {
      name: 'Wireless Mouse',
      category: ProductCategory.HARDWARE,
      unitPrice: 29.99,
      marginPercent: 45.0,
      discountCeiling: 15.0,
    },
  });

  const monitor4k = await prisma.product.create({
    data: {
      name: '4K Ultra Monitor 27"',
      category: ProductCategory.HARDWARE,
      unitPrice: 449.0,
      marginPercent: 32.0,
      discountCeiling: 15.0,
    },
  });

  // Services
  const onboardingSetup = await prisma.product.create({
    data: {
      name: 'Onboarding Setup & Training',
      category: ProductCategory.SERVICE,
      unitPrice: 1500.0,
      marginPercent: 55.0,
      discountCeiling: 10.0,
    },
  });

  const prioritySupport = await prisma.product.create({
    data: {
      name: 'Priority Support Plan',
      category: ProductCategory.SERVICE,
      unitPrice: 2400.0,
      marginPercent: 60.0,
      discountCeiling: 10.0,
    },
  });

  const customIntegration = await prisma.product.create({
    data: {
      name: 'Custom Integration Engineering',
      category: ProductCategory.SERVICE,
      unitPrice: 5000.0,
      marginPercent: 50.0,
      discountCeiling: 10.0,
    },
  });

  // Subscriptions
  const cloudStorage = await prisma.product.create({
    data: {
      name: 'Cloud Storage Plan (1TB)',
      category: ProductCategory.SUBSCRIPTION,
      unitPrice: 120.0,
      marginPercent: 75.0,
      discountCeiling: 12.0,
      billingCycle: BillingCycle.MONTHLY,
    },
  });

  const analyticsAddon = await prisma.product.create({
    data: {
      name: 'Analytics Insights Add-on',
      category: ProductCategory.SUBSCRIPTION,
      unitPrice: 299.0,
      marginPercent: 80.0,
      discountCeiling: 12.0,
      billingCycle: BillingCycle.MONTHLY,
    },
  });

  const enterpriseSub = await prisma.product.create({
    data: {
      name: 'Premium Support Subscription (Annual)',
      category: ProductCategory.SUBSCRIPTION,
      unitPrice: 3600.0,
      marginPercent: 70.0,
      discountCeiling: 12.0,
      billingCycle: BillingCycle.YEARLY,
    },
  });
  console.log('✅ Created 9 Products across Hardware, Service, and Subscription');

  // 6. Seed WarehouseStock
  // Laptop Pro 15: Low in Main (2), High in East (45)
  // Monitor 4K: Low in Main (1), High in East (30)
  const stockData = [
    { warehouseId: mainWarehouse.id, productId: laptopPro.id, quantity: 2 },
    { warehouseId: eastDepot.id, productId: laptopPro.id, quantity: 45 },

    { warehouseId: mainWarehouse.id, productId: wirelessMouse.id, quantity: 150 },
    { warehouseId: eastDepot.id, productId: wirelessMouse.id, quantity: 80 },

    { warehouseId: mainWarehouse.id, productId: monitor4k.id, quantity: 1 },
    { warehouseId: eastDepot.id, productId: monitor4k.id, quantity: 35 },

    { warehouseId: mainWarehouse.id, productId: onboardingSetup.id, quantity: 999 },
    { warehouseId: eastDepot.id, productId: onboardingSetup.id, quantity: 999 },

    { warehouseId: mainWarehouse.id, productId: prioritySupport.id, quantity: 999 },
    { warehouseId: eastDepot.id, productId: prioritySupport.id, quantity: 999 },

    { warehouseId: mainWarehouse.id, productId: customIntegration.id, quantity: 999 },
    { warehouseId: eastDepot.id, productId: customIntegration.id, quantity: 999 },

    { warehouseId: mainWarehouse.id, productId: cloudStorage.id, quantity: 999 },
    { warehouseId: eastDepot.id, productId: cloudStorage.id, quantity: 999 },

    { warehouseId: mainWarehouse.id, productId: analyticsAddon.id, quantity: 999 },
    { warehouseId: eastDepot.id, productId: analyticsAddon.id, quantity: 999 },

    { warehouseId: mainWarehouse.id, productId: enterpriseSub.id, quantity: 999 },
    { warehouseId: eastDepot.id, productId: enterpriseSub.id, quantity: 999 },
  ];

  for (const item of stockData) {
    await prisma.warehouseStock.create({ data: item });
  }
  console.log('✅ Created WarehouseStock records for both warehouses');

  // 7. Seed Sample Quotation in DRAFT for Apex Enterprises (Gold Customer)
  const line1Qty = 5;
  const line1Price = laptopPro.unitPrice;
  const line1Disc = 10; // within 15%
  const line1Total = line1Qty * line1Price * (1 - line1Disc / 100);

  const line2Qty = 2;
  const line2Price = prioritySupport.unitPrice;
  const line2Disc = 5; // within 10%
  const line2Total = line2Qty * line2Price * (1 - line2Disc / 100);

  const subtotal = line1Qty * line1Price + line2Qty * line2Price;
  const total = line1Total + line2Total;
  const totalDiscount = subtotal - total;

  const sampleQuotation = await prisma.quotation.create({
    data: {
      customerId: goldCustomer.id,
      repId: salesRep.id,
      status: QuotationStatus.DRAFT,
      blendedRiskScore: 0.0,
      requiresManagerApproval: false,
      requiresFinanceApproval: false,
      subtotal,
      totalDiscount,
      total,
      marginPercent: 43.5,
      lines: {
        create: [
          {
            productId: laptopPro.id,
            quantity: line1Qty,
            unitPrice: line1Price,
            discountPercent: line1Disc,
            lineTotal: line1Total,
          },
          {
            productId: prioritySupport.id,
            quantity: line2Qty,
            unitPrice: line2Price,
            discountPercent: line2Disc,
            lineTotal: line2Total,
          },
        ],
      },
    },
    include: {
      lines: true,
    },
  });

  console.log(`✅ Created Sample Quotation (${sampleQuotation.id}) with 2 QuotationLines in DRAFT`);
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
