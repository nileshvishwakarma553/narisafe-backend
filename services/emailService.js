import nodemailer from 'nodemailer';

let transporter = null;

export const initEmailService = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
};

export const sendNotificationEmail = async ({ to, subject, htmlText }) => {
  if (!transporter) {
    console.log(`[Email Service Notice] SMTP not configured. Simulated email to <${to}>: "${subject}"`);
    return { simulated: true, success: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"NariSafe Emergency Shield" <${process.env.FROM_EMAIL || 'alerts@narisafe.org'}>`,
      to,
      subject,
      html: htmlText,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service Error]', error.message);
    return { success: false, error: error.message };
  }
};
