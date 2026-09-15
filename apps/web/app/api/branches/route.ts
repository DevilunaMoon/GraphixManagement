import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';
import { logActivity } from '../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    const isAdminUser = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN';

    // If caller is Admin or Super Admin, return detailed branch metrics
    if (isAdminUser) {
      const branches = await prisma.branch.findMany({
        orderBy: { createdAt: 'asc' }
      });

      // Get metrics for each branch (admins, cashiers, stock, total revenue)
      const branchData = await Promise.all(
        branches.map(async (branch) => {
          const [adminsCount, cashiersCount, devices, purchasesAgg] = await Promise.all([
            prisma.user.count({ where: { branch: branch.name, role: 'ADMIN' } }),
            prisma.user.count({ where: { branch: branch.name, role: 'CASHIER' } }),
            prisma.device.aggregate({
              where: { branch: branch.name },
              _sum: { stock: true }
            }),
            prisma.purchase.aggregate({
              where: { branch: branch.name },
              _sum: { amount: true }
            })
          ]);

          return {
            ...branch,
            adminsCount: adminsCount || 0,
            cashiersCount: cashiersCount || 0,
            totalStock: devices._sum.stock || 0,
            totalRevenue: purchasesAgg._sum.amount || 0
          };
        })
      );

      return NextResponse.json({ branches: branchData });
    }

    // For public / dropdowns / regular customer checkout, return active branches with safe numeric defaults
    const activeBranches = await prisma.branch.findMany({
      where: { status: 'Active' },
      orderBy: { name: 'asc' }
    });

    const safeActiveBranches = activeBranches.map(b => ({
      ...b,
      adminsCount: 0,
      cashiersCount: 0,
      totalStock: 0,
      totalRevenue: 0
    }));

    return NextResponse.json({ branches: safeActiveBranches });
  } catch (error) {
    console.error('Failed to fetch branches:', error);
    return NextResponse.json({ branches: [], error: 'Failed to fetch branches' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, address, phone, email, status, gcashName, gcashNumber, gcashQrCode } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const existing = await prisma.branch.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return NextResponse.json({ error: `Branch '${trimmedName}' already exists` }, { status: 400 });
    }

    const newBranch = await prisma.branch.create({
      data: {
        name: trimmedName,
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        status: status || 'Active',
        gcashName: gcashName ? gcashName.trim() : 'GRAPHIX MANAGEMENT',
        gcashNumber: gcashNumber ? gcashNumber.trim() : '0967 123 4567',
        gcashQrCode: gcashQrCode || null
      }
    });

    await logActivity({
      action: 'CREATE_BRANCH',
      description: `Created new branch '${newBranch.name}'`,
      details: JSON.stringify({ branchId: newBranch.id, address: newBranch.address, status: newBranch.status }),
      branch: newBranch.name,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({ branch: newBranch, message: 'Branch created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Failed to create branch:', error);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
}
