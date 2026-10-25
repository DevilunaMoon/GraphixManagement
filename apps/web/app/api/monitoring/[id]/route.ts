import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { sendNotificationEmail } from '../../../../lib/email';
import { uploadToCloudinary } from '../../../../lib/cloudinary';
import { getSession } from '../../../../lib/session';

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
    const letterIndex = Math.floor((seqNum - 1) / 1000);
    const letter = String.fromCharCode(65 + (letterIndex % 26));
    const seriesNum = ((seqNum - 1) % 1000) + 1;
    const trackingNumber = `GRPX-${branchCode}-${letter}${seriesNum}`;

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
    const session = await getSession();
    const { id } = await params;
    const existingRequest = await prisma.repairRequest.findUnique({
      where: { id }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Repair request not found' }, { status: 404 });
    }

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

    if (updateData.progress === '100%' || updateData.progress?.toLowerCase() === 'completed') {
      updateData.status = 'Completed';
    } else if (updateData.progress?.toLowerCase() === 'cancelled' || updateData.progress?.toLowerCase() === 'rejected') {
      updateData.status = 'Cancelled';
    } else if (updateData.progress === 'Accepted' || updateData.progress === 'Diagnostic' || updateData.progress === 'Repairing') {
      updateData.status = 'Active';
    }

    if (updateData.status === 'Completed' && !updateData.progress) {
      updateData.progress = 'Completed';
    }

    // Ensure repairCost is accurately populated if missing, 0, or NaN
    if (updateData.materials) {
      try {
        const parsed = typeof updateData.materials === 'string' ? JSON.parse(updateData.materials) : updateData.materials;
        const rawItems = Array.isArray(parsed?.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
        const sum = rawItems.reduce((acc: number, it: any) => {
          const q = Math.max(1, parseInt(String(it.qty || 1), 10) || 1);
          const p = parseFloat(String(it.unitPrice ?? it.price ?? it.cost ?? 0).replace(/[^0-9.]/g, '')) || 0;
          const lineTotal = parseFloat(String(it.total).replace(/[^0-9.]/g, ''));
          return acc + (!isNaN(lineTotal) && lineTotal > 0 ? lineTotal : (q * p));
        }, 0);

        const currentCostNum = parseFloat(String(updateData.repairCost || '').replace(/[^0-9.]/g, ''));
        if (isNaN(currentCostNum) || currentCostNum === 0) {
          if (sum > 0) {
            updateData.repairCost = String(sum);
          } else if (parsed?.totalPaid && parseFloat(String(parsed.totalPaid).replace(/[^0-9.]/g, '')) > 0) {
            updateData.repairCost = String(parsed.totalPaid);
          } else if (parsed?.cashAmount && parseFloat(String(parsed.cashAmount).replace(/[^0-9.]/g, '')) > 0) {
            updateData.repairCost = String(parsed.cashAmount);
          } else if (updateData.downpayment && parseFloat(String(updateData.downpayment).replace(/[^0-9.]/g, '')) > 0) {
            updateData.repairCost = String(updateData.downpayment);
          }
        }
      } catch {}
    }

    const request = await prisma.repairRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: true
      }
    });

    // Compute changed flags
    const isNewlyAccepted = (action === 'ACCEPT' || updateData.progress === 'Accepted') && existingRequest.progress !== 'Accepted';
    const isNewlyRejected = (action === 'REJECT' || updateData.progress === 'Rejected') && existingRequest.progress !== 'Rejected';
    const isProgressChanged = progress !== undefined && progress !== existingRequest.progress;

    const prevTech = existingRequest.technician?.trim().toLowerCase() || '';
    const newTech = request.technician?.trim().toLowerCase() || '';
    const isNewlyAssignedTechnician = Boolean(newTech && (!prevTech || prevTech !== newTech));

    // Notify customer on acceptance, rejection, or progress update
    if (request.userId) {
      try {
        if (isNewlyAccepted) {
          const techMsg = request.technician ? ` Assigned Technician: ${request.technician}.` : '';
          await prisma.notification.create({
            data: {
              userId: request.userId,
              title: 'Repair Request Accepted',
              message: `Your repair request for ${request.deviceName} has been accepted by the ${request.branch || 'Tagoloan'} branch.${techMsg}`,
              type: 'REPAIR',
              branch: request.branch || 'Tagoloan',
              isRead: false
            }
          });
        } else if (isNewlyRejected) {
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
        } else if (isProgressChanged && !['Accepted', 'Rejected'].includes(progress || '')) {
          await prisma.notification.create({
            data: {
              userId: request.userId,
              title: 'Repair Progress Updated',
              message: `Your device ${request.deviceName} is now in "${progress}" stage.`,
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

    // Update existing branch staff notifications to REPAIR_ACCEPTED or REPAIR_REJECTED
    try {
      if (isNewlyAccepted) {
        const assignedTech = request.technician ? ` (Assigned Tech: ${request.technician})` : '';
        await prisma.notification.updateMany({
          where: {
            type: 'REPAIR_REQUEST',
            branch: { equals: request.branch || 'Tagoloan', mode: 'insensitive' },
            message: { contains: request.deviceName }
          },
          data: {
            title: 'Repair Request Accepted',
            type: 'REPAIR_ACCEPTED',
            message: `Repair request for ${request.deviceName} (${request.ownerName || 'Customer'}) has been accepted at ${request.branch || 'Tagoloan'} branch.${assignedTech}`
          }
        });
      } else if (isNewlyRejected) {
        await prisma.notification.updateMany({
          where: {
            type: 'REPAIR_REQUEST',
            branch: { equals: request.branch || 'Tagoloan', mode: 'insensitive' },
            message: { contains: request.deviceName }
          },
          data: {
            title: 'Repair Request Rejected',
            type: 'REPAIR_REJECTED',
            message: `Repair request for ${request.deviceName} (${request.ownerName || 'Customer'}) was rejected at ${request.branch || 'Tagoloan'} branch.`
          }
        });
      }
    } catch (updateNotifErr) {
      console.error('Error updating staff notifications for repair request status:', updateNotifErr);
    }

    // Notify assigned technician ONLY if newly assigned by someone else (e.g. Admin or Cashier dispatching a job)
    // Never notify with "New Repair Job Assigned" if the action is done by the technician themselves in their own workbench
    const isActorTheTechnician = session?.role === 'TECHNICIAN' || 
      (Boolean(session?.name && newTech && session.name.trim().toLowerCase() === newTech));

    if (isNewlyAssignedTechnician && request.technician && !isActorTheTechnician) {
      try {
        const techUser = await prisma.user.findFirst({
          where: {
            name: { equals: request.technician, mode: 'insensitive' },
            role: 'TECHNICIAN'
          }
        });
        if (techUser && techUser.id !== session?.userId) {
          await prisma.notification.create({
            data: {
              userId: techUser.id,
              title: 'New Repair Job Assigned',
              message: `You have been assigned to repair ${request.deviceName} (Owner: ${request.ownerName || 'Customer'}) at ${request.branch || 'Tagoloan'} branch.`,
              type: 'REPAIR_ASSIGNMENT',
              branch: request.branch || 'Tagoloan',
              isRead: false
            }
          });
        }
      } catch (techNotifErr) {
        console.error('Error notifying assigned technician of assignment:', techNotifErr);
      }
    }

    // Notify technician when repair progress is updated
    if (isProgressChanged && progress && request.technician) {
      try {
        const techUser = await prisma.user.findFirst({
          where: {
            name: { equals: request.technician, mode: 'insensitive' },
            role: 'TECHNICIAN'
          }
        });
        if (techUser) {
          await prisma.notification.create({
            data: {
              userId: techUser.id,
              title: 'Repair Progress Updated',
              message: `Progress for ${request.deviceName} (Owner: ${request.ownerName || 'Customer'}) was updated to "${progress}".`,
              type: 'REPAIR_PROGRESS',
              branch: request.branch || 'Tagoloan',
              isRead: false
            }
          });
        }
      } catch (techProgressNotifErr) {
        console.error('Error creating technician progress update notification:', techProgressNotifErr);
      }
    }

    let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    if (isProgressChanged && progress && request.user && request.user.email) {
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
