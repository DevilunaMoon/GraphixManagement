import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const question = await prisma.customerQuestion.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true
          }
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Role-based permissions check
    const role = session.role;
    const userBranch = session.branch || 'Tagoloan';

    if (role === 'CUSTOMER') {
      if (question.customerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden: You can only view your own questions' }, { status: 403 });
      }
    } else if (role === 'CASHIER' || role === 'ADMIN') {
      if (question.branchName.toLowerCase() !== userBranch.toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden: Question belongs to another branch' }, { status: 403 });
      }
    } else if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sanitize output (Question ID is internal only and strictly hidden)
    const sanitized = {
      id: question.id,
      customerId: question.customerId,
      customerName: question.customer?.name || 'Customer',
      customerEmail: question.customer?.email || '',
      customerImage: question.customer?.image || null,
      customerPhone: question.customer?.phone || null,
      branchId: question.branchId,
      branchName: question.branchName,
      subject: question.subject,
      question: question.question,
      orderId: question.orderId,
      status: question.status,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      replies: question.replies.map(r => ({
        id: r.id,
        senderId: r.senderId,
        senderName: r.senderName,
        senderRole: r.senderRole,
        senderImage: r.sender?.image || null,
        message: r.message,
        createdAt: r.createdAt
      }))
    };

    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch question' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await req.json();

    const question = await prisma.customerQuestion.findUnique({
      where: { id: params.id }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const role = session.role;
    const userBranch = session.branch || 'Tagoloan';

    // Only Branch Admin of that branch, Super Admin, or Customer can close/update status
    if (role === 'ADMIN' && question.branchName.toLowerCase() !== userBranch.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden: Question belongs to another branch' }, { status: 403 });
    }
    if (role === 'CASHIER') {
      return NextResponse.json({ error: 'Forbidden: Cashiers have read-only access' }, { status: 403 });
    }
    if (role === 'CUSTOMER' && question.customerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.customerQuestion.update({
      where: { id: params.id },
      data: {
        status: status || question.status
      }
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (error: any) {
    console.error('Error updating question status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update question status' }, { status: 500 });
  }
}
