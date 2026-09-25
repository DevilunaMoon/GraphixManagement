import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { generateQuestionId } from '../../../../lib/supportQuestionId';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchFilter = searchParams.get('branch');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const role = session.role;
    const userBranch = session.branch || 'Tagoloan';

    const where: any = {};

    // 1. Role-based filtering
    if (role === 'CUSTOMER') {
      // Customers can ONLY view their own questions
      where.customerId = session.userId;
    } else if (role === 'CASHIER' || role === 'ADMIN') {
      // Cashiers & Branch Admins can ONLY view questions for their assigned branch
      where.branchName = {
        equals: userBranch,
        mode: 'insensitive'
      };
    } else if (role === 'SUPER_ADMIN') {
      // Super Admin can view all branches or filter by branch
      if (branchFilter && branchFilter !== 'all') {
        where.branchName = {
          equals: branchFilter,
          mode: 'insensitive'
        };
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Status filter
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    // 3. Search filter
    if (search && search.trim()) {
      where.OR = [
        { subject: { contains: search.trim(), mode: 'insensitive' } },
        { question: { contains: search.trim(), mode: 'insensitive' } },
        { customer: { name: { contains: search.trim(), mode: 'insensitive' } } }
      ];
    }

    const questions = await prisma.customerQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Strip internal questionId from customer/staff API outputs for security and requirement compliance
    const sanitized = questions.map(q => ({
      id: q.id,
      customerId: q.customerId,
      customerName: q.customer?.name || 'Customer',
      customerEmail: q.customer?.email || '',
      customerImage: q.customer?.image || null,
      customerPhone: q.customer?.phone || null,
      branchId: q.branchId,
      branchName: q.branchName,
      subject: q.subject,
      question: q.question,
      orderId: q.orderId,
      status: q.status,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      replies: q.replies.map(r => ({
        id: r.id,
        senderId: r.senderId,
        senderName: r.senderName,
        senderRole: r.senderRole,
        message: r.message,
        createdAt: r.createdAt
      }))
    }));

    return NextResponse.json({ questions: sanitized });
  } catch (error: any) {
    console.error('Failed to fetch support questions:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to submit a question' }, { status: 401 });
    }

    const body = await req.json();
    const { branchName, branchId, subject, question, orderId } = body;

    if (!branchName || !branchName.trim()) {
      return NextResponse.json({ error: 'Please select a branch' }, { status: 400 });
    }
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Please enter a subject' }, { status: 400 });
    }
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Please enter your question' }, { status: 400 });
    }

    // Clean branch name
    const cleanBranch = branchName.replace(/\s*Branch$/i, '').trim();

    // Verify orderId belongs to customer if supplied
    if (orderId && orderId.trim()) {
      const order = await prisma.purchase.findFirst({
        where: {
          id: orderId.trim(),
          userId: session.userId
        }
      });
      if (!order) {
        // Also check if referenceId matches
        const orderRef = await prisma.purchase.findFirst({
          where: {
            referenceId: orderId.trim(),
            userId: session.userId
          }
        });
        if (!orderRef) {
          return NextResponse.json({ error: 'The selected order is not valid for your account' }, { status: 400 });
        }
      }
    }

    // Fetch customer details
    const customer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true }
    });

    const customerName = customer?.name || customer?.email || 'Customer';

    // Generate internal Question/Support ID (strictly internal)
    const internalQuestionId = await generateQuestionId(cleanBranch);

    // Create question in database
    const createdQuestion = await prisma.customerQuestion.create({
      data: {
        questionId: internalQuestionId,
        customerId: session.userId,
        branchId: branchId || null,
        branchName: cleanBranch,
        subject: subject.trim(),
        question: question.trim(),
        orderId: orderId ? orderId.trim() : null,
        status: 'Pending',
        replies: {
          create: {
            senderId: session.userId,
            senderName: customerName,
            senderRole: 'CUSTOMER',
            message: question.trim()
          }
        }
      },
      include: {
        replies: true
      }
    });

    // Notify Selected Branch Admin, Cashiers, and Super Admins
    try {
      // 1. Find Branch Admins & Cashiers for this branch
      const staffMembers = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'ADMIN', branch: { contains: cleanBranch, mode: 'insensitive' } },
            { role: 'CASHIER', branch: { contains: cleanBranch, mode: 'insensitive' } },
            { role: 'SUPER_ADMIN' }
          ]
        },
        select: { id: true, role: true }
      });

      const notificationsData = staffMembers.map(staff => ({
        userId: staff.id,
        title: 'New Customer Question',
        message: `Customer: ${customerName}\nBranch: ${cleanBranch} Branch\nSubject: ${subject.trim()}`,
        branch: cleanBranch,
        type: 'SUPPORT'
      }));

      if (notificationsData.length > 0) {
        await prisma.notification.createMany({
          data: notificationsData
        });
      }
    } catch (notifErr) {
      console.error('Failed to create support question notifications:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Your question has been sent to ${cleanBranch} Branch. A branch staff member will review and respond to your question.`,
      question: {
        id: createdQuestion.id,
        branchName: createdQuestion.branchName,
        subject: createdQuestion.subject,
        question: createdQuestion.question,
        status: createdQuestion.status,
        createdAt: createdQuestion.createdAt
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to submit question:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit question' }, { status: 500 });
  }
}
