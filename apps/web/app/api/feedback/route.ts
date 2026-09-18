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

    // 2. Fetch all customer product reviews with user & device details
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, phone: true }
        },
        device: {
          select: { id: true, name: true, image: true, images: true, price: true, specs: true, branch: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (reviews.length === 0) {
      return NextResponse.json({
        feedbacks: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    }

    // 3. Resolve customer purchase branch for each review
    const userIds = Array.from(new Set(reviews.map(r => r.userId).filter(Boolean)));
    const deviceIds = Array.from(new Set(reviews.map(r => r.deviceId).filter(Boolean)));

    let purchases: { userId: string; deviceId: string; branch: string; createdAt: Date }[] = [];
    try {
      purchases = await prisma.purchase.findMany({
        where: {
          userId: { in: userIds },
          deviceId: { in: deviceIds }
        },
        select: {
          userId: true,
          deviceId: true,
          branch: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (pErr) {
      console.warn("Could not query purchases for review branch mapping:", pErr);
    }

    const purchaseBranchMap = new Map<string, string>();
    for (const p of purchases) {
      const key = `${p.userId}_${p.deviceId}`;
      if (!purchaseBranchMap.has(key)) {
        purchaseBranchMap.set(key, cleanBranchName(p.branch));
      }
    }

    // 4. Map reviews into formatted Customer Feedback objects with branch attribution
    const allFeedbacks = reviews.map(r => {
      const branchFromPurchase = purchaseBranchMap.get(`${r.userId}_${r.deviceId}`);
      const branchFromDevice = cleanBranchName(r.device?.branch);
      const resolvedBranch = branchFromPurchase || branchFromDevice || 'Tagoloan';

      const deviceImage = (r.device?.images && r.device.images.length > 0)
        ? r.device.images[0]
        : (r.device?.image || null);

      return {
        id: r.id,
        userId: r.userId,
        deviceId: r.deviceId,
        customerName: r.user?.name || r.user?.email || 'Anonymous Customer',
        customerEmail: r.user?.email || '',
        customerImage: r.user?.image || null,
        productName: r.device?.name || 'Unknown Product',
        productImage: deviceImage,
        productPrice: r.device?.price || 0,
        feedbackText: r.text || '',
        adminReply: r.adminReply || null,
        adminReplyBy: r.adminReplyBy || null,
        adminReplyRole: r.adminReplyRole || null,
        adminReplyDate: r.adminReplyDate ? r.adminReplyDate.toISOString() : null,
        branch: `${resolvedBranch} Branch`,
        rawBranch: resolvedBranch,
        createdAt: r.createdAt.toISOString(),
      };
    });

    // 5. Filter by Branch (strictly enforced for Branch Admin, selectable for Super Admin)
    let filtered = allFeedbacks;
    if (branchFilter) {
      filtered = filtered.filter(f => f.rawBranch.toLowerCase() === branchFilter.toLowerCase());
    }

    // 6. Filter by Search Query (customer name, email, product name, feedback text, admin reply)
    if (search) {
      filtered = filtered.filter(f => 
        f.customerName.toLowerCase().includes(search) ||
        f.customerEmail.toLowerCase().includes(search) ||
        f.productName.toLowerCase().includes(search) ||
        f.feedbackText.toLowerCase().includes(search) ||
        (f.adminReply && f.adminReply.toLowerCase().includes(search)) ||
        f.branch.toLowerCase().includes(search)
      );
    }

    // 7. Filter by Date
    if (date) {
      const filterDateStr = new Date(date).toDateString();
      filtered = filtered.filter(f => {
        const itemDateStr = new Date(f.createdAt).toDateString();
        return itemDateStr === filterDateStr;
      });
    }

    // 8. Pagination
    const total = filtered.length;
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitStr || '10', 10) || 10);
    const skip = (page - 1) * limit;
    const paginatedFeedbacks = filtered.slice(skip, skip + limit);

    return NextResponse.json({
      feedbacks: paginatedFeedbacks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error in GET /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch customer feedback' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { reviewId, reply, feedbackText, customerName, technicianName, sentiment, branch } = body;

    // Case 1: Customer submitting Technician Feedback
    if (feedbackText && !reviewId) {
      const resolvedBranch = cleanBranchName(branch || session?.branch || 'Tagoloan');
      const createdFeedback = await prisma.technicianFeedback.create({
        data: {
          customerName: customerName || session?.name || 'Customer',
          technicianName: technicianName || 'Unassigned',
          feedbackText: feedbackText.trim(),
          sentiment: sentiment || 'Positive',
          branch: resolvedBranch,
        }
      });

      return NextResponse.json({ success: true, feedback: createdFeedback }, { status: 201 });
    }

    // Case 2: Admin / Super Admin replying to a Customer Product Review
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!reviewId || !reply || !reply.trim()) {
      return NextResponse.json({ error: 'Review ID and reply message are required.' }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: true,
        device: true,
      }
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    // Resolve branch for this review to enforce permissions
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId: review.userId,
        deviceId: review.deviceId,
      },
      orderBy: { createdAt: 'desc' },
      select: { branch: true }
    });

    const resolvedBranch = cleanBranchName(purchase?.branch || review.device?.branch || 'Tagoloan');

    // If Admin (not Super Admin), ensure review belongs to their branch
    if (session.role === 'ADMIN') {
      const adminBranch = cleanBranchName(session.branch || 'Tagoloan');
      if (adminBranch.toLowerCase() !== resolvedBranch.toLowerCase()) {
        return NextResponse.json({ error: 'You are only authorized to reply to reviews from your assigned branch.' }, { status: 403 });
      }
    }

    const responderRole = session.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin';
    const responderName = session.name || responderRole;
    const replyDate = new Date();

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        adminReply: reply.trim(),
        adminReplyBy: responderName,
        adminReplyRole: responderRole,
        adminReplyDate: replyDate,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, name: true } },
      }
    });

    // Notify the Customer in real-time
    if (review.userId) {
      try {
        const productName = review.device?.name || 'Product';
        const replyPreview = reply.trim().length > 100 
          ? `${reply.trim().substring(0, 97)}...` 
          : reply.trim();

        await prisma.notification.create({
          data: {
            userId: review.userId,
            title: `${responderRole} replied to your review`,
            message: `${responderRole} replied regarding "${productName}": "${replyPreview}" [ProductLink:/customer/product-info?id=${review.deviceId}]`,
            type: 'REVIEW_REPLY',
            branch: resolvedBranch,
            isRead: false,
          }
        });
      } catch (notifErr) {
        console.error('Failed to create customer notification for review reply:', notifErr);
      }
    }

    // Record Activity Log
    try {
      await prisma.activityLog.create({
        data: {
          action: 'REVIEW_REPLY',
          description: `${responderRole} replied to customer review on "${review.device?.name || 'Device'}"`,
          details: JSON.stringify({
            reviewId: review.id,
            customerId: review.userId,
            customerName: review.user?.name || review.user?.email,
            productName: review.device?.name,
            reply: reply.trim()
          }),
          branch: resolvedBranch,
          userId: session.userId,
          userName: session.name || responderRole,
          userRole: session.role,
        }
      });
    } catch (logErr) {
      console.warn('Failed to write activity log for review reply:', logErr);
    }

    return NextResponse.json({
      success: true,
      review: {
        id: updatedReview.id,
        adminReply: updatedReview.adminReply,
        adminReplyBy: updatedReview.adminReplyBy,
        adminReplyRole: updatedReview.adminReplyRole,
        adminReplyDate: updatedReview.adminReplyDate?.toISOString(),
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json({ error: 'Failed to submit reply.' }, { status: 500 });
  }
}
