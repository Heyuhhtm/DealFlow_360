import prisma from '../src/lib/prisma';

async function main() {
  const quotes = await prisma.quotation.findMany({
    include: {
      customer: true,
      lines: { include: { product: true } },
      warehouseSplits: { include: { warehouse: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('=== Recent Quotations ===');
  for (const q of quotes) {
    console.log(`Quote: ${q.id} | Customer: ${q.customer.name} | Status: ${q.status} | Splits: ${q.warehouseSplits.length}`);
    for (const l of q.lines) {
      console.log(`   Product: ${l.product.name} | Qty: ${l.quantity} | Total: ${l.lineTotal}`);
    }
    for (const ws of q.warehouseSplits) {
      console.log(`   Split -> Warehouse: ${ws.warehouse.name} | QtyFulfilled: ${ws.quantityFulfilled}`);
    }
  }

  console.log('\n=== Warehouse Stock ===');
  const stocks = await prisma.warehouseStock.findMany({
    include: { product: true, warehouse: true },
    orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
  });
  for (const s of stocks) {
    console.log(`Warehouse: ${s.warehouse.name} | Product: ${s.product.name} | Quantity: ${s.quantity}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
