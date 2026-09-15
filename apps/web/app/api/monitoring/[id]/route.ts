import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { sendNotificationEmail } from '../../../../lib/email';
import { uploadToCloudinary } from '../../../../lib/cloudinary';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const request = await prisma.repairRequest.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!request) {
      return NextResponse.json({ error: 'Repair request not found' }, { status: 404 });
    }

    // Resolve branch code: TAG (Tagoloan), VIL (Villanueva), JAS (Jasaan)
    const rawBranch = (request.branch || 'Tagoloan').toLowerCase();
    let branchCode = 'TAG';
    if (rawBranch.includes('vil')) {
      branchCode = 'VIL';
    } else if (rawBranch.includes('jas')) {
      branchCode = 'JAS';
    } else {
      branchCode = 'TAG';
    }

    // Find sequential index among all repairs in this branch ordered by createdAt asc
    const branchRepairs = await prisma.repairRequest.findMany({
      where: {
        branch: { equals: request.branch || 'Tagoloan', mode: 'insensitive' }
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });

    const index = branchRepairs.findIndex(r => r.id === request.id);
    const seqNum = index >= 0 ? index + 1 : 1;
    const trackingNumber = `GRPX-${branchCode}-A${seqNum}`;

    return NextResponse.json({
      ...request,
      trackingNumber,
      orderIndex: seqNum
    });
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
    let action: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const status = formData.get('status') as string | null;
      progress = formData.get('progress') as string | undefined;
      const cause = formData.get('cause') as string | null;
      const technician = formData.get('technician') as string | null;
      const repairCost = formData.get('repairCost') as string | null;
      const downpayment = formData.get('downpayment') as string | null;
      const materials = formData.get('materials') as string | null;
      const ownerName = formData.get('ownerName') as string | null;
      const proofImage = formData.get('proofImage') as File | null;
      const repairHistory = formData.get('repairHistory') as string | null;
      action = (formData.get('action') as string) || undefined;

      if (status !== null) updateData.status = status;
      if (progress !== undefined && progress !== null) updateData.progress = progress;
      if (cause !== null) updateData.cause = cause;
      if (technician !== null) updateData.technician = technician;
      if (repairCost !== null) updateData.repairCost = repairCost;
      if (downpayment !== null) updateData.downpayment = downpayment;
      if (materials !== null) updateData.materials = materials;
      if (ownerName !== null) updateData.ownerName = ownerName;
      if (repairHistory !== null) updateData.repairHistory = repairHistory;

      if (proofImage && proofImage.name && proofImage.size > 0) {
        const buffer = Buffer.from(await proofImage.arrayBuffer());
        const imageUrl = await uploadToCloudinary(buffer, 'proofs');
        updateData.proofImage = imageUrl;
      }

      // Handle newly uploaded device photos if any
      const photoCountStr = formData.get('photoCount') as string | null;
      if (photoCountStr) {
        const photoCount = parseInt(photoCountStr, 10);
        const newUploadedPhotos: string[] = [];
        for (let i = 0; i < photoCount; i++) {
          const photoFile = formData.get(`photo_${i}`) as File | null;
          if (photoFile && photoFile.name && photoFile.size > 0) {
            const buffer = Buffer.from(await photoFile.arrayBuffer());
            const url = await uploadToCloudinary(buffer, 'monitoring');
            newUploadedPhotos.push(url);
          }
        }
        if (newUploadedPhotos.length > 0 && updateData.repairHistory && updateData.repairHistory.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(updateData.repairHistory);
            parsed.photos = [...(parsed.photos || []), ...newUploadedPhotos];
            updateData.repairHistory = JSON.stringify(parsed);
          } catch (e) {
            console.error('Failed to update photos in repairHistory:', e);
          }
        }
      }
    } else {
      const body = await req.json();
      const { status, cause, technician, repairCost, downpayment, materials, repairHistory, ownerName } = body;
      progress = body.progress;
      action = body.action;

      if (status !== undefined) updateData.status = status;
      if (progress !== undefined) updateData.progress = progress;
      if (cause !== undefined) updateData.cause = cause;
      if (technician !== undefined) updateData.technician = technician;
      if (repairCost !== undefined) updateData.repairCost = repairCost;
      if (downpayment !== undefined) updateData.downpayment = downpayment;
      if (materials !== undefined) updateData.materials = materials;
      if (ownerName !== undefined) updateData.ownerName = ownerName;
      if (repairHistory !== undefined) updateData.repairHistory = repairHistory;
    }

    if (action === 'ACCEPT') {
      updateData.progress = 'Accepted';
      updateData.status = 'Active';
    } else if (action === 'REJECT') {
      updateData.progress = 'Rejected';
      updateData.status = 'Cancelled';
    }

    if (updateData.progress === '100%') {
      updateData.status = 'Completed';
    }
    if (updateData.status === 'Completed') {
      updateData.progress = '100%';
    }

    const request = await prisma.repairRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: true
      }
    });

    // Notify customer on acceptance or rejection
    if (request.userId) {
      try {
        if (action === 'ACCEPT' || updateData.progress === 'Accepted') {
          await prisma.notification.create({
            data: {
              userId: request.userId,
              title: 'Repair Request Accepted',
              message: `Your repair request for ${request.deviceName} has been accepted by the ${request.branch || 'Tagoloan'} branch.`,
              type: 'REPAIR',
              branch: request.branch || 'Tagoloan',
              isRead: false
            }
          });
        } else if (action === 'REJECT' || updateData.progress === 'Rejected') {
          await prisma.notification.create({
            data: {
              userId: request.userId,
              title: 'Repair Request Rejected',
              message: `Your repair request for ${request.deviceName} could not be accepted at this time.`,
              type: 'REPAIR',
              branch: request.branch || 'Tagoloan',
              isRead: false
            }
          });
        }
      } catch (notifErr) {
        console.error('Error sending customer notification on repair request update:', notifErr);
      }
    }

    let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    if (progress !== undefined && request.user && request.user.email) {
      await sendNotificationEmail(request.user.email, request.deviceName, progress, false, baseUrl);
    }

    return NextResponse.json(request);
  } catch (error: any) {
    console.error('Error updating repair request:', error);
    return NextResponse.json({ error: error.message || 'Failed to update repair request' }, { status: 500 });
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
