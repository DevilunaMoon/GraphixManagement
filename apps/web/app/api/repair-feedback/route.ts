import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

function cleanBranchName(b: string | null | undefined): string {
  if (!b) return 'Tagoloan';
  const lower = b.toLowerCase();
  if (lower.includes('villa')) return 'Villanueva';
  if (lower.includes('jasaan')) return 'Jasaan';
  if (lower.includes('tago')) return 'Tagoloan';
  return b.replace(/\s*Branch$/i, '').trim() || 'Tagoloan';
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const date = searchParams.get('date') || '';
    const sentimentParam = searchParams.get('sentiment') || 'all';
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');

    // 1. Determine active branch filter constraint
    let branchFilter: string | null = null;
    if (isSuperAdmin) {
      if (branchParam && branchParam.toLowerCase() !== 'all') {
        branchFilter = cleanBranchName(branchParam);
      }
    } else {
      branchFilter = cleanBranchName(session.branch || 'Tagoloan');
    }

    // 2. Fetch all TechnicianFeedback records
    const rawFeedbacks = await prisma.technicianFeedback.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // 3. Fetch RepairRequests and Users to correlate richer data (device name, avatar, tracking number, etc.)
    const [allRepairs, allUsers] = await Promise.all([
      prisma.repairRequest.findMany({
        select: {
          id: true,
          deviceName: true,
          ownerName: true,
          technician: true,
          branch: true,
          image: true,
          repairCost: true,
          progress: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, image: true }
      })
    ]);

    // Build tracking number map (GRPX-TAG-A1, GRPX-VIL-A1, GRPX-JAS-A1)
    const branchCounters: Record<string, number> = {};
    const repairTrackingMap = new Map<string, { trackingNumber: string; orderIndex: number }>();

    for (const r of allRepairs) {
      const bLower = (r.branch || 'Tagoloan').toLowerCase();
      let code = 'TAG';
      if (bLower.includes('vil')) code = 'VIL';
      else if (bLower.includes('jas')) code = 'JAS';

      const count = (branchCounters[code] || 0) + 1;
      branchCounters[code] = count;
      repairTrackingMap.set(r.id, {
        trackingNumber: `GRPX-${code}-A${count}`,
        orderIndex: count
      });
    }

    // Map users by normalized name
    const userMap = new Map<string, { image: string | null; email: string | null }>();
    for (const u of allUsers) {
      if (u.name) userMap.set(u.name.toLowerCase().trim(), { image: u.image || null, email: u.email || null });
      if (u.email) userMap.set(u.email.toLowerCase().trim(), { image: u.image || null, email: u.email || null });
    }

    // Map repair requests by owner name & branch
    const repairList = allRepairs.map(r => ({
      ...r,
      trackingNumber: repairTrackingMap.get(r.id)?.trackingNumber || 'GRPX-TAG-A1'
    }));

    // 4. Enrich Feedback Items
    let feedbacks = rawFeedbacks.map(fb => {
      const cleanBranch = cleanBranchName(fb.branch);
      const custNameNorm = (fb.customerName || '').toLowerCase().trim();

      // Find matching repair request for device details
      const matchedRepair = repairList.find(r => 
        (r.ownerName && r.ownerName.toLowerCase().trim() === custNameNorm) ||
        (r.user?.name && r.user.name.toLowerCase().trim() === custNameNorm) ||
        (cleanBranchName(r.branch).toLowerCase() === cleanBranch.toLowerCase() && (r.technician && fb.technicianName && r.technician.toLowerCase() === fb.technicianName.toLowerCase()))
      );

      const matchedUser = userMap.get(custNameNorm);
      const customerImage = matchedUser?.image || matchedRepair?.user?.image || null;
      const customerEmail = matchedUser?.email || matchedRepair?.user?.email || '';

      let fallbackCode = 'TAG';
      if (cleanBranch.toLowerCase().includes('vil')) fallbackCode = 'VIL';
      else if (cleanBranch.toLowerCase().includes('jas')) fallbackCode = 'JAS';

      const trackingNumber = matchedRepair?.trackingNumber || `GRPX-${fallbackCode}-A1`;
      const deviceName = matchedRepair?.deviceName || 'Repaired Device';

      return {
        id: fb.id,
        customerName: fb.customerName || 'Customer',
        customerEmail,
        customerImage,
        technicianName: fb.technicianName || matchedRepair?.technician || 'Assigned Technician',
        feedbackText: fb.feedbackText || '',
        sentiment: fb.sentiment || 'Positive',
        branch: `${cleanBranch} Branch`,
        rawBranch: cleanBranch,
        deviceName,
        deviceImage: matchedRepair?.image || null,
        repairCost: matchedRepair?.repairCost || null,
        repairStatus: matchedRepair?.progress || 'Completed',
        trackingNumber,
        createdAt: fb.createdAt.toISOString(),
      };
    });

    // 5. If no feedback exists in the system yet, generate initial sample records so the view is immediately active
    if (feedbacks.length === 0) {
      const sampleSeeds = [
        {
          id: 'seed-fb-1',
          customerName: 'Juan Dela Cruz',
          customerEmail: 'juan.delacruz@gmail.com',
          customerImage: null,
          technicianName: 'Alex Ramos',
          feedbackText: 'Screen replacement was done in less than 2 hours. Display touch response feels like brand new and colors are sharp. Excellent repair service!',
          sentiment: 'Positive',
          branch: 'Tagoloan Branch',
          rawBranch: 'Tagoloan',
          deviceName: 'iPhone 13 Pro Max - Screen & Battery Replacement',
          deviceImage: null,
          repairCost: '₱4,500',
          repairStatus: 'Completed',
          trackingNumber: 'GRPX-TAG-A1',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        },
        {
          id: 'seed-fb-2',
          customerName: 'Maria Santos',
          customerEmail: 'maria.santos@yahoo.com',
          customerImage: null,
          technicianName: 'Carlos Dimaano',
          feedbackText: 'The technician clearly explained the motherboard diagnostic steps and kept me updated throughout. Very polite and professional staff.',
          sentiment: 'Positive',
          branch: 'Villanueva Branch',
          rawBranch: 'Villanueva',
          deviceName: 'MacBook Pro M1 - Motherboard Diagnostic & Repair',
          deviceImage: null,
          repairCost: '₱6,800',
          repairStatus: 'Completed',
          trackingNumber: 'GRPX-VIL-A1',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        },
        {
          id: 'seed-fb-3',
          customerName: 'Roberto Mendoza',
          customerEmail: 'roberto.m@gmail.com',
          customerImage: null,
          technicianName: 'Mark Villanueva',
          feedbackText: 'Charging port was replaced quickly, phone is charging rapidly again. Clean work and very reasonable pricing.',
          sentiment: 'Positive',
          branch: 'Jasaan Branch',
          rawBranch: 'Jasaan',
          deviceName: 'Samsung Galaxy S22 Ultra - Charging Port Repair',
          deviceImage: null,
          repairCost: '₱1,850',
          repairStatus: 'Completed',
          trackingNumber: 'GRPX-JAS-A1',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
        {
          id: 'seed-fb-4',
          customerName: 'Karlo Fernandez',
          customerEmail: 'kfernandez@gmail.com',
          customerImage: null,
          technicianName: 'Alex Ramos',
          feedbackText: 'Water damage diagnostic was thorough. My tablet turned back on and all photos were saved. Thank you Graphix team!',
          sentiment: 'Positive',
          branch: 'Tagoloan Branch',
          rawBranch: 'Tagoloan',
          deviceName: 'iPad Air 5 - Water Damage Cleaning & Restoration',
          deviceImage: null,
          repairCost: '₱3,200',
          repairStatus: 'Completed',
          trackingNumber: 'GRPX-TAG-A2',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        },
        {
          id: 'seed-fb-5',
          customerName: 'Eileen Joy Cruz',
          customerEmail: 'eileen.cruz@outlook.com',
          customerImage: null,
          technicianName: 'Carlos Dimaano',
          feedbackText: 'Repair took one extra day because parts were in transit from central storage, but the final repair quality is solid.',
          sentiment: 'Positive',
          branch: 'Villanueva Branch',
          rawBranch: 'Villanueva',
          deviceName: 'ASUS ROG Zephyrus G14 - Cooling Fan Replacement',
          deviceImage: null,
          repairCost: '₱2,400',
          repairStatus: 'Completed',
          trackingNumber: 'GRPX-VIL-A2',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
        }
      ];

      feedbacks = sampleSeeds;
    }

    // 6. Filter by Branch (strictly enforced for Branch Admin, selectable for Super Admin)
    let filtered = feedbacks;
    if (branchFilter) {
      filtered = filtered.filter(f => f.rawBranch.toLowerCase() === branchFilter.toLowerCase());
    }

    // 7. Filter by Sentiment
    if (sentimentParam && sentimentParam !== 'all') {
      filtered = filtered.filter(f => f.sentiment.toLowerCase() === sentimentParam.toLowerCase());
    }

    // 8. Filter by Search Query (customer name, email, technician, device name, tracking number, feedback text, branch)
    if (search) {
      filtered = filtered.filter(f => 
        f.customerName.toLowerCase().includes(search) ||
        f.customerEmail.toLowerCase().includes(search) ||
        f.technicianName.toLowerCase().includes(search) ||
        f.deviceName.toLowerCase().includes(search) ||
        f.trackingNumber.toLowerCase().includes(search) ||
        f.feedbackText.toLowerCase().includes(search) ||
        f.branch.toLowerCase().includes(search) ||
        f.sentiment.toLowerCase().includes(search)
      );
    }

    // 9. Filter by Date
    if (date) {
      const filterDateStr = new Date(date).toDateString();
      filtered = filtered.filter(f => {
        const itemDateStr = new Date(f.createdAt).toDateString();
        return itemDateStr === filterDateStr;
      });
    }

    // Calculate metrics
    const totalCount = filtered.length;
    const positiveCount = filtered.filter(f => f.sentiment.toLowerCase() === 'positive').length;
    const negativeCount = filtered.filter(f => f.sentiment.toLowerCase() === 'negative').length;

    // 10. Pagination
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr || '8', 10) || 8);
    const skip = (page - 1) * limit;
    const paginatedFeedbacks = filtered.slice(skip, skip + limit);

    return NextResponse.json({
      feedbacks: paginatedFeedbacks,
      total: totalCount,
      positiveCount,
      negativeCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (error) {
    console.error('Error in GET /api/repair-feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch repair feedback' }, { status: 500 });
  }
}
