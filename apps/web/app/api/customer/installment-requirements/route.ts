import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../lib/session';
import { ensureInstallmentTableExists } from '../../../../lib/installment';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await ensureInstallmentTableExists();
    const session = await getSession();

    const body = await req.json();
    const {
      name,
      age,
      phone,
      validIdUrl,
      provider,
      deviceId,
      deviceName,
      branch
    } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    const parsedAge = parseInt(age, 10);
    if (!parsedAge || parsedAge < 18) {
      return NextResponse.json({ error: "Applicant must be at least 18 years of age" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Active phone number is required" }, { status: 400 });
    }
    if (!validIdUrl) {
      return NextResponse.json({ error: "Valid ID image is required" }, { status: 400 });
    }
    const cleanProvider = (provider === 'Home Credit' || provider === 'Skyro') ? provider : 'Skyro';
    const targetBranch = branch || 'Tagoloan';
    const targetDeviceName = deviceName || 'Selected Device';

    const customerId = session?.userId || null;

    // Save installment application
    const application = await (prisma as any).installmentApplication.create({
      data: {
        customerId,
        customerName: name.trim(),
        customerAge: parsedAge,
        customerPhone: phone.trim(),
        validIdUrl,
        provider: cleanProvider,
        deviceId: deviceId || null,
        deviceName: targetDeviceName,
        branch: targetBranch,
        status: 'Pending',
      }
    });

    // Notify branch staff (Admins, Super Admins, and Cashiers)
    try {
      const staffMembers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN', 'CASHIER', 'STAFF'] },
          OR: [
            { branch: targetBranch },
            { role: 'SUPER_ADMIN' }
          ]
        },
        select: { id: true, branch: true }
      });

      if (staffMembers.length > 0) {
        await prisma.notification.createMany({
          data: staffMembers.map(staff => ({
            userId: staff.id,
            title: `New ${cleanProvider} Installment Request`,
            message: `${name.trim()} (Age: ${parsedAge}, Phone: ${phone.trim()}) submitted requirements for ${targetDeviceName} at ${targetBranch} branch.`,
            branch: targetBranch,
            type: 'INSTALLMENT_APPLICATION',
            isRead: false
          }))
        });
      }
    } catch (notifErr) {
      console.warn("Failed to create staff notification for installment app:", notifErr);
    }

    return NextResponse.json({
      success: true,
      id: application.id,
      message: "Installment requirements submitted successfully."
    });
  } catch (error: any) {
    console.error("Error submitting installment requirements:", error);
    return NextResponse.json({ error: error?.message || "Failed to submit installment requirements" }, { status: 500 });
  }
}

