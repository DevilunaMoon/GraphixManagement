import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { ensureInstallmentTableExists } from '../../../../lib/installment';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureInstallmentTableExists();
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, branch: true }
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Administrator access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || 'all';
    const provider = searchParams.get('provider')?.trim() || 'all';
    const requestedBranch = searchParams.get('branch')?.trim() || 'all';

    const where: any = {};

    // 1. Strict Branch Access Isolation
    if (user.role === 'ADMIN') {
      // Branch Admin is HARD-LOCKED to their assigned branch
      where.branch = user.branch || 'Tagoloan';
    } else if (user.role === 'SUPER_ADMIN') {
      // Super Admin can monitor all or filter by requested branch
      if (requestedBranch && requestedBranch !== 'all') {
        where.branch = requestedBranch;
      }
    }

    // 2. Status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // 3. Provider filter (Skyro / Home Credit)
    if (provider && provider !== 'all') {
      where.provider = provider;
    }

    // 4. Search query (matches name, phone, deviceName, or id)
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { deviceName: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [applications, totalCount, pendingCount] = await Promise.all([
      (prisma as any).installmentApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      (prisma as any).installmentApplication.count({ where }),
      (prisma as any).installmentApplication.count({
        where: {
          ...where,
          status: 'Pending'
        }
      })
    ]);

    return NextResponse.json({
      applications,
      totalCount,
      pendingCount,
      userRole: user.role,
      userBranch: user.branch || 'Tagoloan',
      isSuperAdmin: user.role === 'SUPER_ADMIN'
    });
  } catch (error: any) {
    console.error("Error fetching installment applications:", error);
    return NextResponse.json({ error: error?.message || "Failed to load installment applications" }, { status: 500 });
  }
}

