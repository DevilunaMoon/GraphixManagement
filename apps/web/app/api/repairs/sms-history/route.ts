import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { ensureSmsHistoryTableExists } from '../../../../lib/sms';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'TECHNICIAN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized: internal access only' }, { status: 401 });
    }

    await ensureSmsHistoryTableExists();
    

    const { searchParams } = new URL(req.url);
    const repairId = searchParams.get('repairId');
    const branchParam = searchParams.get('branch');
    const q = searchParams.get('q')?.trim() || '';
    const statusParam = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Scope by repairId if specified
    if (repairId) {
      where.repairId = repairId;
    }

    // Role-based branch enforcement
    const isSuperAdmin = session.role === 'SUPER_ADMIN' || session.role === 'SUPERADMIN';
    if (isSuperAdmin) {
      if (branchParam && branchParam !== 'All') {
        where.branch = { equals: branchParam, mode: 'insensitive' };
      }
    } else {
      // ADMIN & TECHNICIAN are strictly scoped to their assigned branch
      where.branch = { equals: session.branch || 'Tagoloan', mode: 'insensitive' };
    }

    // Status filter
    if (statusParam && statusParam !== 'All') {
      where.sendingStatus = statusParam;
    }

    // Search filter across reference, customer name, recipient phone, technician
    if (q) {
      where.OR = [
        { repairReference: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { recipientNumber: { contains: q } },
        { technicianName: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [total, history, submittedCount, failedCount] = await Promise.all([
      prisma.repairSmsHistory.count({ where }),
      prisma.repairSmsHistory.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        include: {
          repair: {
            select: {
              id: true,
              deviceName: true,
              branch: true,
              progress: true,
              ownerName: true
            }
          }
        }
      }),
      prisma.repairSmsHistory.count({
        where: {
          ...where,
          sendingStatus: 'Submitted'
        }
      }),
      prisma.repairSmsHistory.count({
        where: {
          ...where,
          sendingStatus: 'Failed'
        }
      })
    ]);

    return NextResponse.json({
      history,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total,
        submitted: submittedCount,
        failed: failedCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching SMS history:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

