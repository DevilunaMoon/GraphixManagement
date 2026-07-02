import { NextResponse } from "next/server";
import { getSession } from "../../../lib/session";
import { prisma } from "database";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        gender: true,
        dateOfBirth: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error in /api/profile GET:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
