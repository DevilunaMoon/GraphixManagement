import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { prisma } from "database";

export async function GET() {
  try {
    const session = await getSession();
    if (session) {
      let name = "Admin";
      let branch = session.branch || "Tagoloan";
      if (session.userId) {
        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        if (user && user.name) name = user.name;
        if (user && user.branch) branch = user.branch;
      }

      const isSuperAdmin = session.role === 'SUPER_ADMIN';
      const branches = await prisma.branch.findMany({
        where: isSuperAdmin ? undefined : { status: 'Active' },
        select: { id: true, name: true, status: true },
        orderBy: { name: 'asc' }
      });

      return NextResponse.json({ 
        loggedIn: true, 
        role: session.role, 
        isSuperAdmin,
        branch, 
        name,
        branches
      });
    }
  } catch (error) {
    console.error("Error getting session status:", error);
  }
  return NextResponse.json({ loggedIn: false });
}
