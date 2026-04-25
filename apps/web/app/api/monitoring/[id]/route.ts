import { NextResponse } from 'next/server';
import { prisma } from 'database';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const request = await prisma.repairRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return NextResponse.json({ error: 'Repair request not found' }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('Error fetching repair request:', error);
    return NextResponse.json({ error: 'Failed to fetch repair request' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const body = await req.json();
    const { status, progress, cause, technician, repairCost } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (cause !== undefined) updateData.cause = cause;
    if (technician !== undefined) updateData.technician = technician;
    if (repairCost !== undefined) updateData.repairCost = repairCost;

    const request = await prisma.repairRequest.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error('Error updating repair request:', error);
    return NextResponse.json({ error: 'Failed to update repair request' }, { status: 500 });
  }
}
