"use server";

import bcrypt from "bcryptjs";
import { setSession } from "../lib/session";
import { prisma } from "database";

interface RateLimitData {
  count: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, RateLimitData>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "Missing required fields" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        // role defaults to "CUSTOMER" based on Prisma Schema setup
      },
    });

    await setSession(user.id, user.role);
    return { success: true, role: user.role };
  } catch (err: any) {
    console.error("Register Error:", err);
    return { error: err.message || "Failed to register user" };
  }
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Missing required fields" };
  }

  const now = Date.now();
  const attemptData = loginAttempts.get(email) || { count: 0, lockedUntil: null };

  if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
    const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / 60000);
    return { error: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).` };
  } else if (attemptData.lockedUntil && now >= attemptData.lockedUntil) {
    // Reset if lockout period has expired
    attemptData.count = 0;
    attemptData.lockedUntil = null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      attemptData.count += 1;
      if (attemptData.count >= MAX_ATTEMPTS) {
        attemptData.lockedUntil = now + LOCKOUT_MS;
      }
      loginAttempts.set(email, attemptData);
      return { error: attemptData.lockedUntil ? "Too many failed attempts. Try again in 15 minute(s)." : "Invalid credentials" };
    }

    if (!user.password) {
      if (user.authProvider === "GOOGLE") {
        return { error: "This account was created via Google. Please sign in with Google." };
      }
      return { error: "Invalid credentials (no password set)." };
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      attemptData.count += 1;
      if (attemptData.count >= MAX_ATTEMPTS) {
        attemptData.lockedUntil = now + LOCKOUT_MS;
      }
      loginAttempts.set(email, attemptData);
      return { error: attemptData.lockedUntil ? "Too many failed attempts. Try again in 15 minute(s)." : "Invalid credentials" };
    }

    // Success, reset attempts
    loginAttempts.delete(email);

// ...
    await setSession(user.id, user.role);
    return { success: true, role: user.role };
  } catch (err: any) {
    console.error("Login Error:", err);
    return { error: err.message || "Failed to log in" };
  }
}

export async function logoutUser() {
  const { logout } = await import("../lib/session");
  await logout();
  return { success: true };
}

export async function changePassword(formData: FormData) {
  const oldPassword = formData.get("oldPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!oldPassword || !newPassword) {
    return { error: "Missing required fields" };
  }

  try {
    const { getSession } = await import("../lib/session");
    const userSession = await getSession();

    if (!userSession?.userId) {
      return { error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userSession.userId },
    });

    if (!user) {
      return { error: "User not found" };
    }

    const passwordsMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordsMatch) {
      return { error: "Incorrect old password" };
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Change Password Error:", err);
    return { error: err.message || "Failed to change password" };
  }
}
