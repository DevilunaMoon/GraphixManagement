import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch');

    let whereClause: any = {};
    if (branch && branch.toLowerCase() !== 'all') {
      whereClause.branch = {
        equals: branch,
        mode: 'insensitive'
      };
    }

    const photos = await prisma.branchDocumentation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    // Also get the latest photo for each branch to quickly support homepage showcase
    const branches = ['Tagoloan', 'Villanueva', 'Jasaan'];
    const latestByBranch: Record<string, any> = {};

    for (const b of branches) {
      const latest = await prisma.branchDocumentation.findFirst({
        where: {
          branch: {
            equals: b,
            mode: 'insensitive'
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      latestByBranch[b] = latest;
    }

    return NextResponse.json({
      success: true,
      photos,
      latestByBranch
    });
  } catch (error: any) {
    console.error('Error fetching branch documentation:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch branch documentation' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    // Role check: Super Admin is VIEW ONLY
    if (session.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin has view-only permissions for branch documentation.' },
        { status: 403 }
      );
    }

    // Fetch user from DB to guarantee accurate assigned branch
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, role: true, branch: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const userBranch = dbUser.branch || session.branch || 'Tagoloan';

    const body = await req.json();
    const { photoUrl, title, caption } = body;

    if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) {
      return NextResponse.json({ error: 'photoUrl is required' }, { status: 400 });
    }

    // Always associate photo with the user's authentic assigned branch
    const created = await prisma.branchDocumentation.create({
      data: {
        branch: userBranch,
        uploadedBy: dbUser.name || session.email || 'Branch Admin',
        photoUrl: photoUrl.trim(),
        title: title ? String(title).trim() : null,
        caption: caption ? String(caption).trim() : null
      }
    });

    return NextResponse.json({
      success: true,
      documentation: created
    });
  } catch (error: any) {
    console.error('Error creating branch documentation:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create branch documentation' },
      { status: 500 }
    );
  }
}
