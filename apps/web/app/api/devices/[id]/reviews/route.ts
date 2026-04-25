import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const reviews = await prisma.review.findMany({
      where: { deviceId: id },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to post a review.' }, { status: 401 });
    }

    const hasPurchased = await prisma.purchase.findFirst({
      where: {
        userId: session.userId,
        deviceId: id
      }
    });

    if (!hasPurchased) {
      return NextResponse.json({ error: 'You must purchase this product before you can leave a review.' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.text || !body.text.trim()) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        text: body.text.trim(),
        deviceId: id,
        userId: session.userId,
      },
      include: {
        user: { select: { name: true, image: true } }
      }
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error posting review:', error);
    return NextResponse.json({ error: 'Failed to post review' }, { status: 500 });
  }
}
