import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import { getSession } from '../../../lib/session';
import { sendNotificationEmail } from '../../../lib/email';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isCustomer = session.role === 'CUSTOMER';
    
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'Newest';

    const whereClause: any = isCustomer && session?.userId ? { userId: session.userId } : {};

    if (search.trim()) {
      whereClause.ownerName = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const orderBy: any = sort === 'Newest' 
      ? [ { status: 'asc' }, { createdAt: 'desc' } ]
      : [ { status: 'asc' }, { createdAt: 'asc' } ];

    // Backward-compatibility: if page/limit parameters are omitted, return list array directly
    if (!pageParam && !limitParam) {
      const requests = await prisma.repairRequest.findMany({
        where: whereClause,
        orderBy
      });
      return NextResponse.json(requests);
    }

    const page = parseInt(pageParam || '1') || 1;
    const limit = parseInt(limitParam || '8') || 8;
    const skip = (page - 1) * limit;

    const [requests, totalCount] = await Promise.all([
      prisma.repairRequest.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit
      }),
      prisma.repairRequest.count({
        where: whereClause
      })
    ]);

    return NextResponse.json({
      requests,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching repair requests:', error);
    return NextResponse.json({ error: 'Failed to fetch repair requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    
    const deviceName = formData.get('deviceName') as string;
    const ownerName = formData.get('ownerName') as string;
    const progress = formData.get('progress') as string;
    const cause = formData.get('cause') as string;
    const technician = formData.get('technician') as string;
    const repairCost = formData.get('repairCost') as string;
    const image = formData.get('image') as File | null;
    const userId = formData.get('userId') as string | null;
    const repairHistory = formData.get('repairHistory') as string | null;

    if (!deviceName || !ownerName || !progress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let imageUrl = null;
    if (image && image.name && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      imageUrl = await uploadToCloudinary(buffer, 'monitoring');
    }

    const request = await prisma.repairRequest.create({
      data: {
        deviceName,
        ownerName,
        progress,
        cause: cause || null,
        technician: technician || null,
        repairCost: repairCost || null,
        image: imageUrl,
        userId: userId || null,
        repairHistory: repairHistory || null,
      } as any
    });

    let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.email) {
        await sendNotificationEmail(user.email, deviceName, progress, true, baseUrl);
      }
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error('Error creating repair request:', error);
    return NextResponse.json({ error: 'Failed to create repair request' }, { status: 500 });
  }
}
