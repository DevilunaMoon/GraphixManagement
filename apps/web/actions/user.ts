"use server";

import { prisma } from "database";
import { getSession } from "../lib/session";

export async function updateProfile(data: {
  name?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  image?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: "Unauthorized" };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        image: data.image,
      } as any,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Profile Update Error:", err);
    return { error: err.message || "Failed to update profile" };
  }
}

import bcrypt from "bcryptjs";

export async function updatePassword(oldPassword: string, newPassword: string) {
  try {
    const session = await getSession();
    if (!session?.userId) return { error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) return { error: "User not found" };

    // Verify exactly what the user typed against the known database hash
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return { error: "Incorrect old password." };

    // Securely encrypt the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Save strictly to PostgreSQL
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Password Update Error:", err);
    return { error: "Failed to update password." };
  }
}

