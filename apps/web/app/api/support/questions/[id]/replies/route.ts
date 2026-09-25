import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to reply' }, { status: 401 });
    }

    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const question = await prisma.customerQuestion.findUnique({
      where: { id: params.id },
      include: {
        customer: true
      }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const role = session.role;
    const userBranch = session.branch || 'Tagoloan';

    // 1. Permission checks
    if (role === 'CASHIER') {
      return NextResponse.json({ error: 'Cashier accounts have read-only access to customer questions' }, { status: 403 });
    }

    if (role === 'CUSTOMER') {
      if (question.customerId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden: You can only reply to your own questions' }, { status: 403 });
      }
    } else if (role === 'ADMIN') {
      if (question.branchName.toLowerCase() !== userBranch.toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden: Branch Admin can only answer questions from their assigned branch' }, { status: 403 });
      }
    } else if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine sender display role & name
    let senderRole = 'CUSTOMER';
    if (role === 'SUPER_ADMIN') {
      senderRole = 'SUPER_ADMIN';
    } else if (role === 'ADMIN') {
      senderRole = 'ADMIN';
    }

    const senderUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, image: true }
    });

    const senderName = senderUser?.name || senderUser?.email || (role === 'SUPER_ADMIN' ? 'Super Admin' : (role === 'ADMIN' ? 'Branch Admin' : 'Customer'));

    // Create reply
    const reply = await prisma.customerQuestionReply.create({
      data: {
        questionId: question.id,
        senderId: session.userId,
        senderName,
        senderRole,
        message: message.trim()
      }
    });

    // Update Question status
    let nextStatus = question.status;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      nextStatus = 'Answered';
    }

    await prisma.customerQuestion.update({
      where: { id: question.id },
      data: {
        status: nextStatus,
        updatedAt: new Date()
      }
    });

    // 2. Dispatch notifications according to Section 16
    try {
      const cleanBranch = question.branchName;

      if (role === 'ADMIN') {
        // Branch Admin answers -> Notify Customer and Super Admin
        const superAdmins = await prisma.user.findMany({
          where: { role: 'SUPER_ADMIN' },
          select: { id: true }
        });

        const notifs = [
          // Customer notification
          {
            userId: question.customerId,
            title: 'Branch Admin Answered Your Question',
            message: `Tagoloan Branch admin responded to: "${question.subject}"\nAnswer: ${message.trim().slice(0, 100)}${message.length > 100 ? '...' : ''}`,
            branch: cleanBranch,
            type: 'SUPPORT'
          },
          // Super admin notifications
          ...superAdmins.map(sa => ({
            userId: sa.id,
            title: `Branch Admin Answered — ${cleanBranch} Branch`,
            message: `${senderName} answered customer ${question.customer.name || 'Customer'}'s inquiry: "${question.subject}"`,
            branch: cleanBranch,
            type: 'SUPPORT'
          }))
        ];

        await prisma.notification.createMany({ data: notifs });
      } else if (role === 'SUPER_ADMIN') {
        // Super Admin answers -> Notify Customer and Assigned Branch Admin
        const branchAdmins = await prisma.user.findMany({
          where: {
            role: 'ADMIN',
            branch: { contains: cleanBranch, mode: 'insensitive' }
          },
          select: { id: true }
        });

        const notifs = [
          // Customer notification
          {
            userId: question.customerId,
            title: 'Super Admin Answered Your Question',
            message: `Super Admin responded to: "${question.subject}"\nAnswer: ${message.trim().slice(0, 100)}${message.length > 100 ? '...' : ''}`,
            branch: cleanBranch,
            type: 'SUPPORT'
          },
          // Branch admin notifications
          ...branchAdmins.map(ba => ({
            userId: ba.id,
            title: `Super Admin Replied — ${cleanBranch} Question`,
            message: `Super Admin replied on customer question: "${question.subject}"`,
            branch: cleanBranch,
            type: 'SUPPORT'
          }))
        ];

        await prisma.notification.createMany({ data: notifs });
      } else if (role === 'CUSTOMER') {
        // Customer replies -> Notify Assigned Branch Admin & Super Admin
        const staff = await prisma.user.findMany({
          where: {
            OR: [
              { role: 'ADMIN', branch: { contains: cleanBranch, mode: 'insensitive' } },
              { role: 'SUPER_ADMIN' }
            ]
          },
          select: { id: true }
        });

        const notifs = staff.map(s => ({
          userId: s.id,
          title: `Customer Replied — ${cleanBranch} Branch`,
          message: `${senderName} added a message on: "${question.subject}"`,
          branch: cleanBranch,
          type: 'SUPPORT'
        }));

        if (notifs.length > 0) {
          await prisma.notification.createMany({ data: notifs });
        }
      }
    } catch (notifErr) {
      console.error('Failed to create reply notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        senderId: reply.senderId,
        senderName: reply.senderName,
        senderRole: reply.senderRole,
        message: reply.message,
        createdAt: reply.createdAt
      },
      status: nextStatus
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to post reply:', error);
    return NextResponse.json({ error: error.message || 'Failed to post reply' }, { status: 500 });
  }
}
