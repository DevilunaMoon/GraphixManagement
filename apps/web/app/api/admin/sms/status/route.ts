import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { getSemaphoreStatus } from '../../../../../lib/sms';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSemaphoreStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error fetching Semaphore status:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

