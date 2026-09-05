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
