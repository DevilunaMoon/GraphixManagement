import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { sendSms, detectTelcoNetwork, normalizePhilippineNumber } from '../../../../../lib/sms';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const isAuthorized = session && (
      session.role === 'ADMIN' || 
      session.role === 'SUPER_ADMIN' || 
      session.role === 'SUPERADMIN'
    );
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, message } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Recipient phone number is required.' }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'SMS message body is required.' }, { status: 400 });
    }

    const normalized = normalizePhilippineNumber(phone);
    const network = detectTelcoNetwork(normalized);

    const result = await sendSms(normalized, message);

    return NextResponse.json({
      ...result,
      recipient: normalized,
      network
    });
  } catch (error: any) {
    console.error('Error sending test SMS:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

