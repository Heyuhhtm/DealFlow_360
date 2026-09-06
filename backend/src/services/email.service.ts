import nodemailer, { Transporter } from 'nodemailer';

interface SendEmailResult {
  success: boolean;
  messageId: string;
  previewUrl: string | false;
}

let transporterPromise: Promise<Transporter> | null = null;

const getTransporter = async (): Promise<Transporter> => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const host = process.env.ETHEREAL_HOST || 'smtp.ethereal.email';
    const port = Number(process.env.ETHEREAL_PORT) || 587;
    const user = process.env.ETHEREAL_USER || 'ely5ftgmktlyqsti@ethereal.email';
    const pass = process.env.ETHEREAL_PASS || 'YXAmfaaNJa36kYbN9U';

    if (user && pass) {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    // Fallback: create fresh test account
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return transporterPromise;
};

export const sendQuotationEmail = async (
  toEmail: string,
  customerName: string,
  quotationId: string,
  pdfBuffer: Buffer
): Promise<SendEmailResult> => {
  const transporter = await getTransporter();

  const refId = quotationId.slice(0, 8).toUpperCase();

  const mailOptions = {
    from: '"DealFlow360 Commercial Sales" <sales@dealflow360.com>',
    to: toEmail,
    subject: `Your Commercial Quotation #${refId} from DealFlow360`,
    text: `Hi ${customerName},\n\nPlease find attached your official commercial quotation #${refId} from DealFlow360.\n\nYou can review, sign, or negotiate this proposal directly via our Customer Portal.\n\nThank you for your business!\n\nDealFlow360 Sales Operations`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0b2b68; padding: 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold;">DealFlow360</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #93c5fd;">Enterprise Sales Operations &amp; CPQ Platform</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Commercial Quotation #${refId}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Hi <strong>${customerName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Thank you for partnering with DealFlow360. Please find your official quotation attached as a PDF document.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #0b2b68; padding: 14px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #475569;">
              <strong>Document Reference:</strong> #${refId}<br/>
              <strong>Recipient:</strong> ${customerName} (${toEmail})<br/>
              <strong>Currency:</strong> Indian Rupees (INR)
            </p>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            You can also log in to your secure <strong>Customer Portal</strong> at any time to review line specifications, accept and electronically sign, or submit interactive counter-proposals.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          DealFlow360 Platform • Automated Commercial Delivery • &copy; ${new Date().getFullYear()}
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Quotation-${refId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[EmailService] Sent email to ${toEmail}. Message ID: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[EmailService] Ethereal Preview URL: ${previewUrl}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl,
  };
};

export interface BillingReminderEmailData {
  toEmail: string;
  customerName: string;
  quotationId: string;
  billingId: string;
  productName: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string | Date;
  amount: number;
  billingCycle: string;
  pdfBuffer?: Buffer;
}

export const sendBillingReminderEmail = async (
  data: BillingReminderEmailData
): Promise<SendEmailResult> => {
  const transporter = await getTransporter();

  const refId = data.quotationId.slice(0, 8).toUpperCase();
  const invoiceNo = `INV-EMI-${data.billingId ? data.billingId.slice(0, 8).toUpperCase() : refId}`;
  const dueDateStr = new Date(data.dueDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedAmount = `INR ${Number(data.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const mailOptions: any = {
    from: '"DealFlow360 Subscription Operations" <billing@dealflow360.com>',
    to: data.toEmail,
    subject: `🔔 Payment Due Reminder: Installment #${data.installmentNumber} of ${formattedAmount} for Quote #${refId}`,
    text: `Hi ${data.customerName},\n\nThis is a friendly reminder that Installment #${data.installmentNumber} of ${data.totalInstallments} for ${data.productName} is scheduled for payment on ${dueDateStr}.\n\nAmount Due: ${formattedAmount}\n\nPlease review your installment invoice or remit payment via your Customer Deal Room.\n\nThank you,\nDealFlow360 Billing Operations`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0b2b68; padding: 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold;">DealFlow360</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #93c5fd;">Subscription &amp; Recurring Billing Operations</p>
        </div>
        <div style="padding: 24px;">
          <div style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: bold; padding: 4px 12px; rounded: 20px; border-radius: 9999px; margin-bottom: 12px;">
            ⚠️ Payment Due Date Approaching
          </div>
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Installment #${data.installmentNumber} of ${data.totalInstallments} (${data.billingCycle})</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Hi <strong>${data.customerName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            This is an automated reminder regarding your upcoming subscription installment for <strong>${data.productName}</strong> under agreement <strong>#${refId}</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0b2b68; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <table style="width: 100%; font-size: 13px; color: #475569;">
              <tr>
                <td style="padding: 4px 0;"><strong>Invoice Reference:</strong></td>
                <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${invoiceNo}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Amount Due:</strong></td>
                <td style="padding: 4px 0; font-size: 16px; font-weight: bold; color: #0b2b68;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Due Date:</strong></td>
                <td style="padding: 4px 0; font-weight: bold; color: #b45309;">${dueDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Cadence:</strong></td>
                <td style="padding: 4px 0;">${data.billingCycle} (${data.installmentNumber} / ${data.totalInstallments})</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Your itemized official installment invoice is attached to this email as a PDF. You can also view this invoice in your Customer Portal at any time.
          </p>
          <div style="margin-top: 24px; text-align: center;">
            <a href="http://localhost:3000/portal" style="background-color: #0b2b68; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 13px; font-weight: bold; border-radius: 8px; display: inline-block;">
              Access Customer Deal Room &rarr;
            </a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          DealFlow360 Platform • Automated Recurring Billing Notification • &copy; ${new Date().getFullYear()}
        </div>
      </div>
    `,
  };

  if (data.pdfBuffer) {
    mailOptions.attachments = [
      {
        filename: `${invoiceNo}.pdf`,
        content: data.pdfBuffer,
        contentType: 'application/pdf',
      },
    ];
  }

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[EmailService] Sent installment reminder to ${data.toEmail}. Message ID: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[EmailService] Ethereal Preview URL: ${previewUrl}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl,
  };
};
