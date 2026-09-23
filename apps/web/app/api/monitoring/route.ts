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
    
    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'Newest';
    const branchParam = searchParams.get('branch');

    const whereClause: any = isCustomer && session?.userId
      ? { userId: session.userId }
      : {};

    if (!isCustomer) {
      if (isSuperAdmin) {
        if (branchParam && branchParam !== 'all') {
          whereClause.branch = branchParam;
        }
      } else {
        whereClause.branch = session.branch || 'Tagoloan';
      }
    }

    if (search.trim()) {
      whereClause.deviceName = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const orderBy: any = sort === 'Newest' 
      ? [ { status: 'asc' }, { createdAt: 'desc' } ]
      : [ { status: 'asc' }, { createdAt: 'asc' } ];

    // Calculate branch sequence numbers with 1000-rollover rule (GRPX-TAG-A1..A1000 -> B1)
    const allBranchRepairs = await prisma.repairRequest.findMany({
      select: { id: true, branch: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const branchCounters: Record<string, number> = {};
    const trackingMap = new Map<string, { trackingNumber: string; orderIndex: number }>();

    for (const r of allBranchRepairs) {
      const bLower = (r.branch || 'Tagoloan').toLowerCase();
      let code = 'TAG';
      if (bLower.includes('vil')) code = 'VIL';
      else if (bLower.includes('jas')) code = 'JAS';

      const count = (branchCounters[code] || 0) + 1;
      branchCounters[code] = count;
      const letterIndex = Math.floor((count - 1) / 1000);
      const letter = String.fromCharCode(65 + (letterIndex % 26));
      const seriesNum = ((count - 1) % 1000) + 1;
      trackingMap.set(r.id, {
        trackingNumber: `GRPX-${code}-${letter}${seriesNum}`,
        orderIndex: count
      });
    }

    const enrichRequests = (reqList: any[]) => reqList.map(item => {
      const track = trackingMap.get(item.id);
      return {
        ...item,
        trackingNumber: track?.trackingNumber || 'GRPX-TAG-A1',
        orderIndex: track?.orderIndex || 1
      };
    });

    // Backward-compatibility: if page/limit parameters are omitted, return list array directly
    if (!pageParam && !limitParam) {
      const requests = await prisma.repairRequest.findMany({
        where: whereClause,
        orderBy
      });
      return NextResponse.json(enrichRequests(requests));
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
      requests: enrichRequests(requests),
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
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isCustomer = session.role === 'CUSTOMER';
    const formData = await req.formData();
    
    const deviceName = formData.get('deviceName') as string;
    let ownerName = (formData.get('ownerName') as string) || '';
    const progress = (formData.get('progress') as string) || (isCustomer ? 'Pending' : 'Accepted');
    const cause = formData.get('cause') as string;
    const technician = formData.get('technician') as string | null;
    const repairCost = formData.get('repairCost') as string | null;
    const downpayment = formData.get('downpayment') as string | null;
    const materials = formData.get('materials') as string | null;
    const repairHistoryRaw = formData.get('repairHistory') as string | null;
    const branchParam = formData.get('branch') as string | null;
    let targetUserId = (formData.get('userId') as string | null) || (isCustomer ? session.userId : null);

    if (!deviceName) {
      return NextResponse.json({ error: 'Device name is required' }, { status: 400 });
    }

    // Determine operating branch
    let operatingBranch = 'Tagoloan';
    if (isCustomer) {
      operatingBranch = branchParam || session.branch || 'Tagoloan';
    } else if (session.role === 'SUPER_ADMIN') {
      operatingBranch = branchParam || 'Tagoloan';
    } else {
      operatingBranch = session.branch || 'Tagoloan';
    }

    // Ensure customer user details if customer
    if (isCustomer && !ownerName) {
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (user) {
        ownerName = user.name || 'Customer';
      }
    }

    // Process photo uploads
    const photoUrls: string[] = [];
    const physicalDamagePhotos: Record<string, string> = {};
    const mainProblemPhotos: string[] = [];
    
    // Single image file (from admin or standard upload)
    const singleImage = formData.get('image') as File | null;
    if (singleImage && singleImage.name && singleImage.size > 0) {
      const buffer = Buffer.from(await singleImage.arrayBuffer());
      const url = await uploadToCloudinary(buffer, 'monitoring');
      photoUrls.push(url);
    }

    // Physical damage slots upload (physical_photo_front, back, right, left, top, bottom)
    const physicalSlots = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    for (const slot of physicalSlots) {
      const file = formData.get(`physical_photo_${slot}`) as File | null;
      if (file && file.name && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, 'monitoring/physical-damage');
        physicalDamagePhotos[slot] = url;
        if (!photoUrls.includes(url)) {
          photoUrls.push(url);
        }
      }
    }

    // Main problem photos upload (main_photo_0, main_photo_1, ...)
    const mainPhotoCountVal = formData.get('mainPhotoCount') || formData.get('photoCount');
    const mainPhotoCount = typeof mainPhotoCountVal === 'string' ? parseInt(mainPhotoCountVal, 10) : 5;
    for (let i = 0; i < mainPhotoCount; i++) {
      const photoFile = (formData.get(`main_photo_${i}`) || formData.get(`photo_${i}`)) as File | null;
      if (photoFile && photoFile.name && photoFile.size > 0) {
        const buffer = Buffer.from(await photoFile.arrayBuffer());
        const url = await uploadToCloudinary(buffer, 'monitoring/issues');
        mainProblemPhotos.push(url);
        if (!photoUrls.includes(url)) {
          photoUrls.push(url);
        }
      }
    }

    // Assemble structured repair history
    let finalRepairHistory = repairHistoryRaw;
    if (repairHistoryRaw && repairHistoryRaw.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(repairHistoryRaw);
        if (photoUrls.length > 0) {
          parsed.photos = photoUrls;
        }
        if (Object.keys(physicalDamagePhotos).length > 0) {
          parsed.physicalDamagePhotos = physicalDamagePhotos;
        }
        if (mainProblemPhotos.length > 0) {
          parsed.mainProblemPhotos = mainProblemPhotos;
        }
        finalRepairHistory = JSON.stringify(parsed);
      } catch (e) {
        console.error('Failed to augment repairHistory JSON:', e);
      }
    }

    const request = await prisma.repairRequest.create({
      data: {
        deviceName,
        ownerName: ownerName || null,
        progress,
        cause: cause || null,
        technician: technician || null,
        repairCost: repairCost || null,
        downpayment: downpayment || null,
        materials: materials || null,
        branch: operatingBranch,
        image: photoUrls[0] || null,
        proofImage: photoUrls[1] || null,
        userId: targetUserId || null,
        repairHistory: finalRepairHistory || null,
        status: isCustomer ? 'Active' : 'Active',
      } as any
    });

    let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    // If customer submitted a new repair request, notify Branch Admin, Cashier, and Super Admin
    if (isCustomer) {
      try {
        // Find admins and cashiers assigned to this branch
        const branchStaff = await prisma.user.findMany({
          where: {
            OR: [
              {
                role: { in: ['ADMIN', 'CASHIER'] },
                branch: { equals: operatingBranch, mode: 'insensitive' }
              },
              {
                role: 'SUPER_ADMIN'
              }
            ]
          },
          select: { id: true, role: true, branch: true }
        });

        const notifPromises = branchStaff.map(staff => 
          prisma.notification.create({
            data: {
              userId: staff.id,
              title: 'New Repair Request',
              message: `Customer ${ownerName || 'Customer'} submitted a new repair request for ${deviceName} at ${operatingBranch} branch.`,
              type: 'REPAIR_REQUEST',
              branch: operatingBranch,
              isRead: false
            }
          })
        );

        await Promise.all(notifPromises);
      } catch (notifErr) {
        console.error('Error creating staff notifications for repair request:', notifErr);
      }
    } else if (targetUserId) {
      // Staff created device intake for customer, send email notification
      const user = await prisma.user.findUnique({ where: { id: targetUserId } });
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
