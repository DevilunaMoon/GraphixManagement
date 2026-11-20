import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../../lib/session';
import { sendSms, normalizePhilippineNumber, detectTelcoNetwork } from '../../../../../../lib/sms';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'TECHNICIAN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized: insufficient permissions to retry SMS' }, { status: 401 });
    }

    const { id } = await params;
    const historyItem = await prisma.repairSmsHistory.findUnique({
      where: { id },
      include: {
        repair: true
      }
    });

    if (!historyItem) {
      return NextResponse.json({ error: 'SMS history record not found' }, { status: 404 });
    }

    // Role-based branch constraint
    const isSuperAdmin = session.role === 'SUPER_ADMIN' || session.role === 'SUPERADMIN';
    if (!isSuperAdmin) {
      const userBranch = (session.branch || 'Tagoloan').toLowerCase();
      const itemBranch = (historyItem.branch || 'Tagoloan').toLowerCase();
      if (userBranch !== itemBranch) {
        return NextResponse.json({ error: 'Forbidden: you cannot retry SMS for another branch' }, { status: 403 });
      }
    }

    // Parse any optional body (e.g. updated phone number if the previous one was invalid)
    let overridePhone: string | null = null;
    try {
      const body = await req.json();
      if (body?.phone) overridePhone = body.phone;
    } catch {}

    const targetPhone = overridePhone || historyItem.recipientNumber;
    const normalized = normalizePhilippineNumber(targetPhone);
    const network = detectTelcoNetwork(normalized);

    if (!normalized || normalized.length !== 11) {
      return NextResponse.json({
        error: `Invalid Philippine mobile number: "${targetPhone}". Must be 11 digits (e.g. 09XXXXXXXXX).`
      }, { status: 400 });
    }

    // Dispatch SMS via Semaphore
    const sendResult = await sendSms(normalized, historyItem.message);

    const updated = await prisma.repairSmsHistory.update({
      where: { id },
      data: {
        recipientNumber: normalized,
        network,
        sendingStatus: sendResult.success ? 'Submitted' : 'Failed',
        semaphoreMessageId: sendResult.messageId ? String(sendResult.messageId) : historyItem.semaphoreMessageId,
        errorMessage: sendResult.success ? null : (sendResult.error || 'Retry attempt failed'),
        sentAt: new Date()
      }
    });

    return NextResponse.json({
      success: sendResult.success,
      item: updated,
      error: sendResult.error
    });
  } catch (error: any) {
    console.error('Error retrying SMS:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

