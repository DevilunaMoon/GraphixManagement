import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (session) {
      return NextResponse.json({ loggedIn: true, role: session.role });
    }
  } catch (error) {
    console.error("Error getting session status:", error);
  }
  return NextResponse.json({ loggedIn: false });
}
