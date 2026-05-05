import { NextRequest, NextResponse } from "next/server";
import { prisma } from "database";
import { sendPasswordResetEmail } from "../../../../lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // For security, do not reveal if the email exists or not
    if (!user) {
      return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    // 1 hour expiry
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const sent = await sendPasswordResetEmail(user.email, resetToken, baseUrl);

    if (!sent) {
      return NextResponse.json({ error: "Failed to send reset email. Please try again later." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
