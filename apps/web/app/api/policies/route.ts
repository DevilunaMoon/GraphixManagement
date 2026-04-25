import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET() {
  try {
    const policies = await prisma.policy.findMany();
    return NextResponse.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, content } = body;

    if (!type) {
      return NextResponse.json({ error: 'Missing policy type' }, { status: 400 });
    }

    const policy = await prisma.policy.upsert({
      where: { type },
      update: { content },
      create: { type, content },
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error saving policy:', error);
    return NextResponse.json({ error: 'Failed to save policy' }, { status: 500 });
  }
}
