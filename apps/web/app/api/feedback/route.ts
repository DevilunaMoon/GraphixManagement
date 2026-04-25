import { NextResponse } from 'next/server';
import { prisma } from 'database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feedbacks = await prisma.technicianFeedback.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { customerName, feedbackText, sentiment, technicianName } = body;

    if (!customerName || !feedbackText || !sentiment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const feedback = await prisma.technicianFeedback.create({
      data: {
        customerName,
        technicianName,
        feedbackText,
        sentiment,
      }
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
  }
}
