import nodemailer from 'nodemailer';
import { prisma } from '../db';

export async function getTransporter(userId?: string) {
  let host = process.env.SMTP_HOST || 'smtp.gmail.com';
  let port = parseInt(process.env.SMTP_PORT || '587', 10);
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';

  if (userId) {
    const config = await prisma.smtpConfig.findUnique({ where: { userId } });
    if (config) {
      host = config.host;
      port = config.port;
      user = config.username;
      pass = config.password;
    }
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export async function sendMindSpaceEmail({
  to,
  subject,
  title,
  message,
  actionUrl,
  actionText,
  userId,
}: {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  userId?: string;
}) {
  try {
    const transporter = await getTransporter(userId);
    const from = process.env.SMTP_FROM || 'MindSpace Notifications <noreply@mindspace.local>';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { background-color: #0A0A0A; color: #FAFAFA; font-family: 'Inter Tight', sans-serif; padding: 40px; margin: 0; }
          .card { background-color: #0F0F0F; border: 1px solid #FF3D00; padding: 32px; max-width: 560px; margin: 0 auto; }
          .badge { font-family: monospace; font-size: 11px; text-transform: uppercase; color: #FF3D00; letter-spacing: 2px; }
          .title { font-size: 24px; font-weight: 800; text-transform: uppercase; margin-top: 8px; color: #FAFAFA; }
          .content { font-size: 14px; color: #737373; line-height: 1.6; margin: 20px 0; }
          .button { display: inline-block; background-color: #FF3D00; color: #0A0A0A; font-family: monospace; font-size: 12px; font-weight: bold; text-transform: uppercase; padding: 12px 24px; text-decoration: none; border-radius: 0px; }
          .footer { font-size: 10px; color: #737373; margin-top: 32px; font-family: monospace; border-top: 1px solid #262626; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">MINDSPACE ALERT</div>
          <div class="title">${title}</div>
          <div class="content">${message}</div>
          ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText || 'View Map'}</a>` : ''}
          <div class="footer">MINDSPACE AI VISUAL NOTE-TAKING PLATFORM</div>
        </div>
      </body>
      </html>
    `;

    return await transporter.sendMail({
      from,
      to,
      subject,
      html: htmlContent,
    });
  } catch (error) {
    console.error('[Email Send Error]:', error);
    throw error;
  }
}
