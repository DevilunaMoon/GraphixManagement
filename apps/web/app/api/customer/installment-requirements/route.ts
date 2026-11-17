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
      address,
      referenceNo,
      validIdUrl,
      validIdBackUrl,
      provider,
      deviceId,
      deviceName,
      branch,
      idType,
      incomeSource
    } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!address || !address.trim()) {
      return NextResponse.json({ error: "Home Address based on your valid ID is required" }, { status: 400 });
    }
    const cleanProvider = (provider === 'Home Credit' || provider === 'Skyro') ? provider : 'Skyro';
    const maxAllowedAge = cleanProvider === 'Home Credit' ? 68 : 70;
    const parsedAge = parseInt(age, 10);
    if (!parsedAge || parsedAge < 18 || parsedAge > maxAllowedAge) {
      return NextResponse.json({ 
        error: `${cleanProvider} installment requires applicant age to be between 18 and ${maxAllowedAge} years old.` 
      }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Active phone number is required" }, { status: 400 });
    }
    if (!validIdUrl) {
      return NextResponse.json({ error: "Front image of your valid ID is required" }, { status: 400 });
    }
    if (!validIdBackUrl) {
      return NextResponse.json({ error: "Back image of your valid ID is required" }, { status: 400 });
    }
    const targetBranch = branch || 'Tagoloan';
    const targetDeviceName = deviceName || 'Selected Device';
    const cleanIncomeSource = (incomeSource === 'Business' || incomeSource === 'Salary') ? incomeSource : null;

    const customerId = session?.userId || null;
    
    const notesParts: string[] = [];
    if (idType) notesParts.push(`ID: ${idType}`);
    if (cleanIncomeSource) notesParts.push(`Income: ${cleanIncomeSource}`);
    if (address && address.trim()) notesParts.push(`Address: ${address.trim()}`);
    if (referenceNo && referenceNo.trim()) notesParts.push(`Ref: ${referenceNo.trim()}`);
    const cleanNotes = notesParts.length > 0 ? notesParts.join(' • ') : null;

    // Save installment application
    const application = await (prisma as any).installmentApplication.create({
      data: {
        customerId,
        customerName: name.trim(),
        customerAge: parsedAge,
        customerPhone: phone.trim(),
        validIdUrl,
        validIdBackUrl: validIdBackUrl || null,
        provider: cleanProvider,
        deviceId: deviceId || null,
        deviceName: targetDeviceName,
        branch: targetBranch,
        status: 'Pending',
        notes: cleanNotes,
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
        const detailParts: string[] = [];
        if (idType) detailParts.push(`ID: ${idType}`);
        if (cleanIncomeSource) detailParts.push(`Income: ${cleanIncomeSource}`);
        if (referenceNo && referenceNo.trim()) detailParts.push(`Ref: ${referenceNo.trim()}`);
        const detailStr = detailParts.length > 0 ? `, ${detailParts.join(', ')}` : '';

        await prisma.notification.createMany({
          data: staffMembers.map(staff => ({
            userId: staff.id,
            title: `New ${cleanProvider} Installment Request`,
            message: `${name.trim()} (Age: ${parsedAge}, Phone: ${phone.trim()}${detailStr}) submitted requirements for ${targetDeviceName} at ${targetBranch} branch.`,
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

