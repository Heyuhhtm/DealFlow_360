import prisma from '../src/lib/prisma';
import { calculateWarehouseSplit } from '../src/services/fulfillment.service';

async function main() {
  console.log('🔄 Checking all CONFIRMED quotations for unreserved stock...');

  const confirmedQuotes = await prisma.quotation.findMany({
    where: { status: 'CONFIRMED' },
    include: {
      lines: { include: { product: true } },
      warehouseSplits: { include: { warehouse: true } },
      auditEntries: true,
    },
  });

  const warehouses = await prisma.warehouse.findMany({
    include: { stock: true },
    orderBy: { shippingCostBase: 'asc' },
  });

  for (const quote of confirmedQuotes) {
    const hasReservation = quote.auditEntries.some((a) => a.action === 'STOCK_RESERVED');

    if (!hasReservation) {
      console.log(`\n📦 Processing unreserved confirmed quote: ${quote.id} (${quote.lines.length} lines)`);

      let splitsToApply: {
        warehouseId: string;
        lines: { productId: string; quantity: number }[];
        estimatedShipmentCost: number;
      }[] = [];

      if (quote.warehouseSplits.length > 0) {
        // Use existing splits
        for (const ws of quote.warehouseSplits) {
          const splitLines = quote.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          }));

          splitsToApply.push({
            warehouseId: ws.warehouseId,
            lines: splitLines,
            estimatedShipmentCost: ws.estimatedShipmentCost,
          });
        }
      } else {
        // Calculate auto split
        const linesInput = quote.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        }));
        const warehouseInput = warehouses.map((w) => ({
          id: w.id,
          name: w.name,
          shippingCostBase: w.shippingCostBase,
          stock: w.stock.map((s) => ({
            productId: s.productId,
            quantity: s.quantity,
          })),
        }));

        const calc = calculateWarehouseSplit(linesInput, warehouseInput);
        splitsToApply = calc.splits;

        // Persist split records
        for (const s of splitsToApply) {
          const totalUnits = s.lines.reduce((acc, l) => acc + l.quantity, 0);
          await prisma.warehouseSplit.create({
            data: {
              quotationId: quote.id,
              warehouseId: s.warehouseId,
              quantityFulfilled: totalUnits,
              estimatedShipmentCost: s.estimatedShipmentCost,
            },
          });
        }
      }

      // Deduct warehouse stock
      for (const split of splitsToApply) {
        for (const line of split.lines) {
          const stockRecord = await prisma.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: split.warehouseId,
                productId: line.productId,
              },
            },
            include: { product: true, warehouse: true },
          });

          if (stockRecord) {
            const oldQty = stockRecord.quantity;
            const newQty = Math.max(0, oldQty - line.quantity);
            await prisma.warehouseStock.update({
              where: {
                warehouseId_productId: {
                  warehouseId: split.warehouseId,
                  productId: line.productId,
                },
              },
              data: { quantity: newQty },
            });
            console.log(`   📉 Deducted ${line.quantity} of "${stockRecord.product.name}" from "${stockRecord.warehouse.name}": ${oldQty} -> ${newQty}`);
          }
        }
      }

      // Write STOCK_RESERVED audit entry
      await prisma.auditLogEntry.create({
        data: {
          quotationId: quote.id,
          userId: quote.repId,
          action: 'STOCK_RESERVED',
          detail: JSON.stringify(
            splitsToApply.map((s) => ({
              warehouseId: s.warehouseId,
              lines: s.lines,
            }))
          ),
        },
      });

      console.log(`   ✅ Quote ${quote.id} stock reservation logged.`);
    } else {
      console.log(`✓ Quote ${quote.id} already has STOCK_RESERVED.`);
    }
  }

  console.log('\n=== Updated Laptop Stock Levels ===');
  const laptopStocks = await prisma.warehouseStock.findMany({
    where: { product: { name: { contains: 'Laptop' } } },
    include: { warehouse: true, product: true },
  });
  for (const s of laptopStocks) {
    console.log(`   Warehouse: ${s.warehouse.name} | ${s.product.name} | In Stock: ${s.quantity}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
