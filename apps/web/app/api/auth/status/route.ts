import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { prisma } from "database";

export async function GET() {
  try {
    const session = await getSession();
    if (session) {
      let name = "Admin";
      if (session.userId) {
        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        if (user && user.name) name = user.name;
      }
      return NextResponse.json({ loggedIn: true, role: session.role, name });
    }
  } catch (error) {
    console.error("Error getting session status:", error);
  }
  return NextResponse.json({ loggedIn: false });
}
