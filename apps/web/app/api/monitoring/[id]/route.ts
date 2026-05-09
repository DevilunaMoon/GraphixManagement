import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { sendNotificationEmail } from '../../../../lib/email';
import { uploadToCloudinary } from '../../../../lib/cloudinary';

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
    const contentType = req.headers.get('content-type') || '';
    
    let updateData: any = {};
    let progress: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const status = formData.get('status') as string | null;
      progress = formData.get('progress') as string | undefined;
      const cause = formData.get('cause') as string | null;
      const technician = formData.get('technician') as string | null;
      const repairCost = formData.get('repairCost') as string | null;
      const proofImage = formData.get('proofImage') as File | null;

      if (status !== null) updateData.status = status;
      if (progress !== undefined && progress !== null) updateData.progress = progress;
      if (cause !== null) updateData.cause = cause;
      if (technician !== null) updateData.technician = technician;
      if (repairCost !== null) updateData.repairCost = repairCost;

      if (proofImage && proofImage.name && proofImage.size > 0) {
        const buffer = Buffer.from(await proofImage.arrayBuffer());
        const imageUrl = await uploadToCloudinary(buffer, 'monitoring/proofs');
        updateData.proofImage = imageUrl;
      }
    } else {
      const body = await req.json();
      const { status, cause, technician, repairCost } = body;
      progress = body.progress;

      if (status !== undefined) updateData.status = status;
      if (progress !== undefined) updateData.progress = progress;
      if (cause !== undefined) updateData.cause = cause;
      if (technician !== undefined) updateData.technician = technician;
      if (repairCost !== undefined) updateData.repairCost = repairCost;
    }

    const request = await prisma.repairRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: true
      }
    });

    if (progress !== undefined && request.user && request.user.email) {
      await sendNotificationEmail(request.user.email, request.deviceName, progress, false);
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('Error updating repair request:', error);
    return NextResponse.json({ error: 'Failed to update repair request' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.repairRequest.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Repair request deleted successfully' });
  } catch (error) {
    console.error('Error deleting repair request:', error);
    return NextResponse.json({ error: 'Failed to delete repair request' }, { status: 500 });
  }
}
