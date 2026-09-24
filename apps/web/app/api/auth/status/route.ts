import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { prisma } from "database";

export async function GET() {
  try {
    const session = await getSession();
    if (session) {
      let name = "Admin";
      let branch = session.branch || "Tagoloan";
      let image: string | null = null;
      let email: string | null = null;

      if (session.userId) {
        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        if (user && user.name) name = user.name;
        if (user && user.branch) branch = user.branch;
        if (user && user.image) image = user.image;
        if (user && user.email) email = user.email;
      }

      const isSuperAdmin = session.role === 'SUPER_ADMIN';
      const branches = await prisma.branch.findMany({
        where: isSuperAdmin ? undefined : { status: 'Active' },
        select: { id: true, name: true, status: true },
        orderBy: { name: 'asc' }
      });

      return NextResponse.json({ 
        loggedIn: true, 
        userId: session.userId,
        role: session.role, 
        isSuperAdmin,
        branch, 
        name,
        email,
        image,
        branches
      });
    }
  } catch (error) {
    console.error("Error getting session status:", error);
  }
  return NextResponse.json({ loggedIn: false });
}
