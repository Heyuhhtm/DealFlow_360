import PDFDocument from 'pdfkit';

interface PDFQuotationData {
  id: string;
  status: string;
  createdAt: string | Date;
  subtotal: number;
  totalDiscount: number;
  total: number;
  customer: {
    name: string;
    email: string;
    tier: string;
  };
  lines: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
    product?: {
      name: string;
      category?: string;
    };
  }[];
  warehouseSplits?: {
    warehouseName: string;
    quantityFulfilled: number;
    estimatedShipmentCost?: number;
  }[];
  subscriptionBillings?: {
    productId: string;
    billingCycle: string;
    nextBillingDate: string | Date;
    amount: number;
    product?: {
      name: string;
    };
  }[];
}

export const generateQuotationPDF = async (
  quotation: PDFQuotationData,
  lines?: any[],
  warehouseSplits?: any[],
  subscriptionBillings?: any[]
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const formatCurrency = (val: number) => {
        return `INR ${Number(val || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      const quoteLines = lines || quotation.lines || [];
      const splits = warehouseSplits || quotation.warehouseSplits || [];
      const subs = subscriptionBillings || quotation.subscriptionBillings || [];

      // =========================================================================
      // 1. BRAND HEADER & DOCUMENT TITLE
      // =========================================================================
      doc.rect(40, 40, 515, 60).fill('#0B2B68');

      doc
        .fillColor('#FFFFFF')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('DealFlow360', 55, 52);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#93C5FD')
        .text('Enterprise Sales Operations & CPQ Platform', 55, 78);

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('COMMERCIAL QUOTATION', 330, 52, { align: 'right', width: 210 });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#E2E8F0')
        .text(`Ref: #${quotation.id.slice(0, 8).toUpperCase()}`, 330, 72, {
          align: 'right',
          width: 210,
        });

      doc.moveDown(3);

      // =========================================================================
      // 2. METADATA & CUSTOMER SUMMARY
      // =========================================================================
      const metaY = 115;
      doc.rect(40, metaY, 250, 75).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.rect(305, metaY, 250, 75).fillAndStroke('#F8FAFC', '#E2E8F0');

      // Left Box: Customer Info
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#64748B')
        .text('PREPARED FOR / CLIENT:', 50, metaY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0F172A')
        .text(quotation.customer.name, 50, metaY + 24);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text(quotation.customer.email, 50, metaY + 40);

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0369A1')
        .text(`Account Tier: ${quotation.customer.tier || 'STANDARD'}`, 50, metaY + 54);

      // Right Box: Quotation Meta
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#64748B')
        .text('DOCUMENT DETAILS:', 315, metaY + 10);

      const createdDate = new Date(quotation.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#0F172A')
        .text(`Date Issued: ${createdDate}`, 315, metaY + 24);

      doc.text(`Status: ${quotation.status}`, 315, metaY + 40);
      doc.text('Currency: Indian Rupees (INR)', 315, metaY + 54);

      // =========================================================================
      // 3. LINE ITEMS TABLE
      // =========================================================================
      let tableY = 210;
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0F172A')
        .text('Itemized Quotation Lines', 40, tableY);

      tableY += 18;

      // Table Header Row
      doc.rect(40, tableY, 515, 22).fill('#F1F5F9');
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#334155')
        .text('PRODUCT / DESCRIPTION', 50, tableY + 6, { width: 190 })
        .text('QTY', 245, tableY + 6, { width: 40, align: 'center' })
        .text('UNIT PRICE', 290, tableY + 6, { width: 75, align: 'right' })
        .text('DISCOUNT', 370, tableY + 6, { width: 60, align: 'right' })
        .text('LINE TOTAL', 440, tableY + 6, { width: 105, align: 'right' });

      tableY += 22;

      // Table Rows
      doc.font('Helvetica').fontSize(8);
      quoteLines.forEach((line, index) => {
        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, tableY, 515, 22).fill(rowBg);

        const productName = line.product?.name || `Product SKU (${line.productId.slice(0, 8)})`;
        const qty = line.quantity;
        const unitPrice = formatCurrency(line.unitPrice);
        const discountStr = line.discountPercent > 0 ? `${line.discountPercent}%` : '0%';
        const lineTotalStr = formatCurrency(line.lineTotal);

        doc
          .fillColor('#0F172A')
          .text(productName, 50, tableY + 6, { width: 190, lineBreak: false })
          .text(String(qty), 245, tableY + 6, { width: 40, align: 'center' })
          .text(unitPrice, 290, tableY + 6, { width: 75, align: 'right' })
          .text(discountStr, 370, tableY + 6, { width: 60, align: 'right' })
          .font('Helvetica-Bold')
          .text(lineTotalStr, 440, tableY + 6, { width: 105, align: 'right' })
          .font('Helvetica');

        tableY += 22;
      });

      doc.rect(40, tableY, 515, 1).fill('#E2E8F0');
      tableY += 10;

      // =========================================================================
      // 4. FINANCIAL SUMMARY (CONFIDENTIAL MARGINS OMITTED STRICTLY)
      // =========================================================================
      const summaryY = tableY;
      doc.rect(340, summaryY, 215, 70).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text('Subtotal:', 350, summaryY + 10)
        .text('Discount Savings:', 350, summaryY + 26)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('Total Amount Payable:', 350, summaryY + 46);

      doc
        .font('Helvetica')
        .fillColor('#0F172A')
        .text(formatCurrency(quotation.subtotal), 440, summaryY + 10, {
          align: 'right',
          width: 105,
        })
        .fillColor('#059669')
        .text(`- ${formatCurrency(quotation.totalDiscount)}`, 440, summaryY + 26, {
          align: 'right',
          width: 105,
        })
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0B2B68')
        .text(formatCurrency(quotation.total), 440, summaryY + 44, {
          align: 'right',
          width: 105,
        });

      let nextSectionY = summaryY + 85;

      // =========================================================================
      // 5. FULFILLMENT DETAILS (IF WAREHOUSE SPLITS EXIST)
      // =========================================================================
      if (splits.length > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#0F172A')
          .text('Fulfillment & Dispatch Logistics', 40, nextSectionY);

        nextSectionY += 14;

        doc.rect(40, nextSectionY, 515, 18).fill('#F1F5F9');
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#475569')
          .text('DISPATCH LOCATION', 50, nextSectionY + 5, { width: 220 })
          .text('QUANTITY FULFILLED', 280, nextSectionY + 5, { width: 130, align: 'center' })
          .text('ESTIMATED FREIGHT', 420, nextSectionY + 5, { width: 125, align: 'right' });

        nextSectionY += 18;

        doc.font('Helvetica').fontSize(8).fillColor('#0F172A');
        splits.forEach((split) => {
          doc.rect(40, nextSectionY, 515, 18).fill('#FFFFFF');
          doc
            .text(split.warehouseName, 50, nextSectionY + 5, { width: 220 })
            .text(`${split.quantityFulfilled} units`, 280, nextSectionY + 5, {
              width: 130,
              align: 'center',
            })
            .text(
              split.estimatedShipmentCost ? formatCurrency(split.estimatedShipmentCost) : 'Included',
              420,
              nextSectionY + 5,
              { width: 125, align: 'right' }
            );

          nextSectionY += 18;
        });

        nextSectionY += 8;
      }

      // =========================================================================
      // 6. RECURRING SUBSCRIPTION BILLING (IF APPLICABLE)
      // =========================================================================
      if (subs.length > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#0F172A')
          .text('Recurring Subscription Schedules', 40, nextSectionY);

        nextSectionY += 14;

        doc.rect(40, nextSectionY, 515, 18).fill('#F1F5F9');
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#475569')
          .text('SUBSCRIPTION PRODUCT', 50, nextSectionY + 5, { width: 200 })
          .text('CADENCE', 260, nextSectionY + 5, { width: 80, align: 'center' })
          .text('NEXT BILLING DATE', 350, nextSectionY + 5, { width: 100, align: 'center' })
          .text('RECURRING AMOUNT', 460, nextSectionY + 5, { width: 85, align: 'right' });

        nextSectionY += 18;

        doc.font('Helvetica').fontSize(8).fillColor('#0F172A');
        subs.forEach((sub) => {
          const subDate = new Date(sub.nextBillingDate).toLocaleDateString('en-IN');
          const pName = sub.product?.name || `Subscription (${sub.productId.slice(0, 8)})`;

          doc.rect(40, nextSectionY, 515, 18).fill('#FFFFFF');
          doc
            .text(pName, 50, nextSectionY + 5, { width: 200 })
            .text(sub.billingCycle, 260, nextSectionY + 5, { width: 80, align: 'center' })
            .text(subDate, 350, nextSectionY + 5, { width: 100, align: 'center' })
            .text(formatCurrency(sub.amount), 460, nextSectionY + 5, {
              width: 85,
              align: 'right',
            });

          nextSectionY += 18;
        });

        nextSectionY += 8;
      }

      // =========================================================================
      // 7. FOOTER
      // =========================================================================
      const footerY = 770;
      doc.rect(40, footerY - 10, 515, 1).fill('#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0B2B68')
        .text('Thank you for your business!', 40, footerY, { align: 'center', width: 515 });

      const nowStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#94A3B8')
        .text(
          `Generated on ${nowStr} • System Powered by DealFlow360 • Document ID: ${quotation.id}`,
          40,
          footerY + 12,
          { align: 'center', width: 515 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export interface InstallmentInvoiceData {
  quotationId: string;
  billingId: string;
  customer: {
    name: string;
    email: string;
    tier?: string;
  };
  productName: string;
  billingCycle: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string | Date;
  amount: number;
}

export const generateInstallmentInvoicePDF = async (
  data: InstallmentInvoiceData
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const formatCurrency = (val: number) => {
        return `INR ${Number(val || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      const refId = data.quotationId.slice(0, 8).toUpperCase();
      const invoiceNo = `INV-EMI-${data.billingId ? data.billingId.slice(0, 8).toUpperCase() : refId}`;
      const dueDateStr = new Date(data.dueDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // 1. BRAND HEADER
      doc.rect(40, 40, 515, 65).fill('#0B2B68');

      doc
        .fillColor('#FFFFFF')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('DealFlow360', 55, 52);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#93C5FD')
        .text('Enterprise Subscription & Recurring Billing Operations', 55, 78);

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('INSTALLMENT INVOICE (EMI)', 310, 52, { align: 'right', width: 230 });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#E2E8F0')
        .text(`Invoice: ${invoiceNo}`, 310, 70, { align: 'right', width: 230 });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#93C5FD')
        .text(`Ref Quote: #${refId}`, 310, 84, { align: 'right', width: 230 });

      // 2. METADATA & RECIPIENT
      const infoY = 125;
      doc.rect(40, infoY, 515, 80).fill('#F8FAFC');
      doc.rect(40, infoY, 515, 80).stroke('#E2E8F0');

      // Left Column: Customer
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#64748B')
        .text('BILLED TO (CUSTOMER):', 55, infoY + 12);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0F172A')
        .text(data.customer.name, 55, infoY + 26);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text(data.customer.email, 55, infoY + 41);

      if (data.customer.tier) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#0B2B68')
          .text(`Account Tier: ${data.customer.tier}`, 55, infoY + 56);
      }

      // Right Column: Installment Details
      const rightColX = 330;
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#64748B')
        .text('BILLING DETAILS:', rightColX, infoY + 12);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(`Installment: #${data.installmentNumber} of ${data.totalInstallments} (${data.billingCycle})`, rightColX, infoY + 26);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#B45309')
        .text(`Due Date: ${dueDateStr}`, rightColX, infoY + 41);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#059669')
        .text(`Status: SCHEDULED / DUE`, rightColX, infoY + 56);

      // 3. LINE ITEM TABLE
      const tableTop = 230;
      doc.rect(40, tableTop, 515, 24).fill('#0B2B68');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#FFFFFF')
        .text('DESCRIPTION / PRODUCT', 50, tableTop + 7)
        .text('CADENCE', 250, tableTop + 7)
        .text('INSTALLMENT', 350, tableTop + 7)
        .text('AMOUNT (INR)', 440, tableTop + 7, { align: 'right', width: 100 });

      // Row 1
      const rowY = tableTop + 24;
      doc.rect(40, rowY, 515, 32).fill('#FFFFFF');
      doc.rect(40, rowY, 515, 32).stroke('#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0F172A')
        .text(data.productName, 50, rowY + 7);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748B')
        .text(`Recurring SaaS / SLA Subscription`, 50, rowY + 18);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(data.billingCycle, 250, rowY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0B2B68')
        .text(`#${data.installmentNumber} of ${data.totalInstallments}`, 350, rowY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0F172A')
        .text(formatCurrency(data.amount), 440, rowY + 10, { align: 'right', width: 100 });

      // 4. TOTAL SUMMARY BLOCK
      const sumY = rowY + 45;
      doc.rect(300, sumY, 255, 60).fill('#F1F5F9');
      doc.rect(300, sumY, 255, 60).stroke('#CBD5E1');

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text('Installment Net:', 315, sumY + 10)
        .text(formatCurrency(data.amount), 430, sumY + 10, { align: 'right', width: 110 });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text('Applicable Tax (GST @ 0% Included):', 315, sumY + 24)
        .text('INR 0.00', 430, sumY + 24, { align: 'right', width: 110 });

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0B2B68')
        .text('Total Due This Cycle:', 315, sumY + 40)
        .text(formatCurrency(data.amount), 430, sumY + 40, { align: 'right', width: 110 });

      // 5. PAYMENT INSTRUCTIONS & DUE DATE ALERT
      const noticeY = sumY + 80;
      doc.rect(40, noticeY, 515, 65).fill('#FEF3C7');
      doc.rect(40, noticeY, 515, 65).stroke('#FDE68A');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#92400E')
        .text('⚠️ PAYMENT DUE DATE NOTICE', 55, noticeY + 10);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#78350F')
        .text(
          `This installment is scheduled for payment on or before ${dueDateStr}. To ensure uninterrupted subscription services and SLA priority support, please complete remittance via your Customer Deal Room portal or corporate wire transfer.`,
          55,
          noticeY + 24,
          { width: 485, lineGap: 2 }
        );

      // Bank Transfer Details
      const bankY = noticeY + 80;
      doc.rect(40, bankY, 515, 65).fill('#F8FAFC');
      doc.rect(40, bankY, 515, 65).stroke('#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0F172A')
        .text('REMITTANCE / WIRE TRANSFER DETAILS:', 55, bankY + 10);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#475569')
        .text('Bank Name: HDFC Bank Ltd • Account Name: DealFlow360 Technologies Private Limited', 55, bankY + 25)
        .text('Account Number: 50200088912345 • IFSC Code: HDFC0001234 • SWIFT: HDFCINBB', 55, bankY + 38)
        .text(`Reference Remark: Please include "${invoiceNo}" in your transfer description.`, 55, bankY + 51);

      // 6. FOOTER
      const footerY = 760;
      doc.rect(40, footerY - 10, 515, 1).fill('#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0B2B68')
        .text('DealFlow360 • Automated Subscription & EMI Invoicing', 40, footerY, { align: 'center', width: 515 });

      const nowStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#94A3B8')
        .text(
          `Generated on ${nowStr} • Document: ${invoiceNo} • Authorized Commercial Billing`,
          40,
          footerY + 12,
          { align: 'center', width: 515 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
