import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../lib/session';

const DEFAULT_FAQS = [
  {
    question: "How long do repairs usually take?",
    answer: "Repair duration depends on the type of issue and the availability of replacement parts. Our branch staff will provide an estimated completion time after checking the device.",
    isActive: true
  },
  {
    question: "What payment methods do you accept?",
    answer: "Currently, our system accepts Cash and GCash payments for products, reservations, and repair services.",
    isActive: true
  },
  {
    question: "Can I check product availability by branch?",
    answer: "Yes, you can select different branches on any product page or in your settings to check live inventory and stock levels.",
    isActive: true
  }
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get('all') === 'true';

    // Seed defaults if empty
    const count = await prisma.fAQ.count().catch(() => 0);
    if (count === 0) {
      for (const faq of DEFAULT_FAQS) {
        await prisma.fAQ.create({
          data: {
            question: faq.question,
            answer: faq.answer,
            isActive: faq.isActive,
            createdBy: 'System Super Admin'
          }
        }).catch(() => null);
      }
    }

    const session = await getSession();
    const isStaff = session && (session.role === 'SUPER_ADMIN' || session.role === 'ADMIN');

    // If staff requests all FAQs, return all. Otherwise return only active FAQs.
    if (fetchAll && isStaff) {
      const faqs = await prisma.fAQ.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(faqs);
    }

    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(faqs);
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch FAQs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only Super Admin can manage FAQs' }, { status: 403 });
    }

    const { question, answer, isActive } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }

    const created = await prisma.fAQ.create({
      data: {
        question: question.trim(),
        answer: answer.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdBy: session.name || session.email || 'Super Admin'
      }
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: 'CREATE_FAQ',
        description: `Created FAQ: "${created.question.slice(0, 50)}${created.question.length > 50 ? '...' : ''}"`,
        details: JSON.stringify({ faqId: created.id, isActive: created.isActive }),
        branch: 'System',
        userId: session.userId,
        userName: session.name || session.email || 'Super Admin',
        userRole: session.role
      }
    }).catch(() => null);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json({ error: error.message || 'Failed to create FAQ' }, { status: 500 });
  }
}
