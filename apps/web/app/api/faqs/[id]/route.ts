import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const faq = await prisma.fAQ.findUnique({
      where: { id: params.id }
    });

    if (!faq) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    return NextResponse.json(faq);
  } catch (error: any) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch FAQ' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only Super Admin can edit FAQs' }, { status: 403 });
    }

    const { question, answer, isActive } = await req.json();

    const dataToUpdate: any = {
      updatedBy: session.name || session.email || 'Super Admin'
    };

    if (question !== undefined) {
      if (!question.trim()) return NextResponse.json({ error: 'Question cannot be empty' }, { status: 400 });
      dataToUpdate.question = question.trim();
    }

    if (answer !== undefined) {
      if (!answer.trim()) return NextResponse.json({ error: 'Answer cannot be empty' }, { status: 400 });
      dataToUpdate.answer = answer.trim();
    }

    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    }

    const updated = await prisma.fAQ.update({
      where: { id: params.id },
      data: dataToUpdate
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: 'UPDATE_FAQ',
        description: `Updated FAQ: "${updated.question.slice(0, 50)}${updated.question.length > 50 ? '...' : ''}"`,
        details: JSON.stringify({ faqId: updated.id, isActive: updated.isActive }),
        branch: 'System',
        userId: session.userId,
        userName: session.name || session.email || 'Super Admin',
        userRole: session.role
      }
    }).catch(() => null);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json({ error: error.message || 'Failed to update FAQ' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only Super Admin can delete FAQs' }, { status: 403 });
    }

    const existing = await prisma.fAQ.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    await prisma.fAQ.delete({
      where: { id: params.id }
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: 'DELETE_FAQ',
        description: `Deleted FAQ: "${existing.question.slice(0, 50)}${existing.question.length > 50 ? '...' : ''}"`,
        details: JSON.stringify({ faqId: existing.id }),
        branch: 'System',
        userId: session.userId,
        userName: session.name || session.email || 'Super Admin',
        userRole: session.role
      }
    }).catch(() => null);

    return NextResponse.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete FAQ' }, { status: 500 });
  }
}
