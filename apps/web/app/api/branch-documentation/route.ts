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

    // Enforce strict maximum of 8 images per branch
    const existingCount = await prisma.branchDocumentation.count({
      where: {
        branch: {
          equals: userBranch,
          mode: 'insensitive'
        }
      }
    });

    const body = await req.json();

    // Support batch uploads { photos: [...] }
    if (Array.isArray(body.photos)) {
      if (body.photos.length === 0) {
        return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
      }

      if (existingCount + body.photos.length > 8) {
        return NextResponse.json(
          { 
            error: `Maximum limit of 8 images per branch reached. Current: ${existingCount}/8. You can only upload ${Math.max(0, 8 - existingCount)} more photo(s).` 
          },
          { status: 400 }
        );
      }

      const createdList = [];
      for (const p of body.photos) {
        if (p.photoUrl && typeof p.photoUrl === 'string' && p.photoUrl.trim()) {
          const created = await prisma.branchDocumentation.create({
            data: {
              branch: userBranch,
              uploadedBy: dbUser.name || session.email || 'Branch Admin',
              photoUrl: p.photoUrl.trim(),
              title: p.title ? String(p.title).trim() : null,
              caption: p.caption ? String(p.caption).trim() : null
            }
          });
          createdList.push(created);
        }
      }

      return NextResponse.json({
        success: true,
        documentation: createdList
      });
    }

    // Single photo upload
    const { photoUrl, title, caption } = body;

    if (existingCount >= 8) {
      return NextResponse.json(
        { 
          error: `Maximum limit of 8 images per branch reached (${existingCount}/8). Please delete an existing photo before uploading a new one.` 
        },
        { status: 400 }
      );
    }

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
