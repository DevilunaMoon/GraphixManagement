import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { getSession } from '../../../../../lib/session';
import { logActivity } from '../../../../../lib/logger';

import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const params = await context.params;
    const { id } = params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, branch: true, status: true, phone: true }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Role protection: Regular Admin cannot modify Super Admin or Admin accounts
    if (!isSuperAdmin && (existingUser.role === 'ADMIN' || existingUser.role === 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Only Super Admin can modify administrative accounts' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, role, branch, status, password } = body;

    const updateData: any = {};
    const logDescriptions: string[] = [];

    if (name !== undefined) {
      updateData.name = name ? name.trim() : null;
      if (updateData.name !== existingUser.name) {
        logDescriptions.push(`Name: '${existingUser.name || 'N/A'}' -> '${updateData.name || 'N/A'}'`);
      }
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
      if (updateData.phone !== existingUser.phone) {
        logDescriptions.push(`Phone: '${existingUser.phone || 'N/A'}' -> '${updateData.phone || 'N/A'}'`);
      }
    }

    if (role !== undefined && isSuperAdmin) {
      updateData.role = role.toUpperCase();
      if (updateData.role !== existingUser.role) {
        logDescriptions.push(`Role: '${existingUser.role}' -> '${updateData.role}'`);
      }
    }

    if (branch !== undefined) {
      updateData.branch = branch;
      if (updateData.branch !== existingUser.branch) {
        logDescriptions.push(`Branch: '${existingUser.branch || 'None'}' -> '${updateData.branch}'`);
      }
    }

    if (status !== undefined) {
      updateData.status = status;
      if (updateData.status !== existingUser.status) {
        logDescriptions.push(`Status: '${existingUser.status || 'Active'}' -> '${updateData.status}'`);
      }
    }

    if (password && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
      logDescriptions.push('Password was reset');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        branch: true,
        status: true,
        suspendedUntil: true,
        createdAt: true
      }
    });

    if (logDescriptions.length > 0) {
      await logActivity({
        action: 'UPDATE_ACCOUNT',
        description: `Updated account ${updatedUser.name || updatedUser.email} (${logDescriptions.join(', ')})`,
        branch: updatedUser.branch || session.branch,
        userId: session.userId,
        userRole: session.role
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, branch: true }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Only Super Admin can delete other Admins/Super Admins
    if (session.role !== 'SUPER_ADMIN' && (userToDelete.role === 'ADMIN' || userToDelete.role === 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Only Super Admin can delete admin accounts' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id },
    });

    await logActivity({
      action: 'DELETE_ACCOUNT',
      description: `Deleted ${userToDelete.role} account ${userToDelete.name || userToDelete.email} (${userToDelete.branch || 'No branch'})`,
      branch: userToDelete.branch,
      userId: session.userId,
      userRole: session.role
    });

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
