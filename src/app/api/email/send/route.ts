import { NextResponse } from 'next/server';
import { sendMindSpaceEmail } from '@/lib/email/mailer';

export async function POST(req: Request) {
  try {
    const { to, subject, title, message, actionUrl, actionText, userId } = await req.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'to, subject, and message are required' }, { status: 400 });
    }

    const info = await sendMindSpaceEmail({
      to,
      subject,
      title: title || subject,
      message,
      actionUrl,
      actionText,
      userId,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('[API /email/send Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
