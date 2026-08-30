import { NextResponse } from 'next/server';
import { prisma } from 'database';
import bcrypt from 'bcryptjs';
import { getSession } from '../../../../lib/session';
import { logActivity } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const branchFilter = searchParams.get('branch') || '';

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const where: any = {};

    // Branch scoping
    if (isSuperAdmin) {
      if (branchFilter && branchFilter !== 'all') {
        where.branch = branchFilter;
      }
    } else {
      // Regular Admin only sees their own branch or Customers
      where.OR = [
        { branch: session.branch || 'Tagoloan' },
        { role: 'CUSTOMER' }
      ];
    }

    // Role filtering
    if (roleFilter && roleFilter !== 'all') {
      where.role = roleFilter;
    }

    if (search) {
      const searchCondition = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition }
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            role: true,
            branch: true,
            status: true,
            suspendedUntil: true,
            createdAt: true
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      return NextResponse.json({
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        branch: true,
        status: true,
        suspendedUntil: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const body = await req.json();
    const { name, email, phone, password, role, branch } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Role creation permissions
    const targetRole = (role || 'CASHIER').toUpperCase();
    if (!isSuperAdmin && (targetRole === 'SUPER_ADMIN' || targetRole === 'ADMIN')) {
      return NextResponse.json({ error: 'Only Super Admin can create Admin or Super Admin accounts' }, { status: 403 });
    }

    const targetBranch = isSuperAdmin ? (branch || 'Tagoloan') : (session.branch || 'Tagoloan');

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name || null,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: targetRole,
        branch: targetBranch,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        branch: true,
        status: true,
        suspendedUntil: true,
        createdAt: true
      }
    });

    await logActivity({
      action: 'CREATE_ACCOUNT',
      description: `Created new ${targetRole} account for ${newUser.name || newUser.email} assigned to ${targetBranch}`,
      details: JSON.stringify({ userId: newUser.id, role: targetRole, branch: targetBranch }),
      branch: targetBranch,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
