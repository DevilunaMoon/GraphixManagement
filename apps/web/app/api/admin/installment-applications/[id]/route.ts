import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import { ensureInstallmentTableExists } from '../../../../../lib/installment';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInstallmentTableExists();
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, branch: true }
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Administrator access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    // Fetch target application to verify branch ownership
    const existing = await (prisma as any).installmentApplication.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Installment application not found" }, { status: 404 });
    }

    // Branch Admin can only edit applications belonging to their assigned branch
    if (user.role === 'ADMIN' && existing.branch !== user.branch) {
      return NextResponse.json({ error: "Forbidden: You cannot modify records for other branches" }, { status: 403 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await (prisma as any).installmentApplication.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error("Error updating installment application:", error);
    return NextResponse.json({ error: error?.message || "Failed to update installment application" }, { status: 500 });
  }
}

