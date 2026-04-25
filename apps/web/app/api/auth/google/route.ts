import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(req: NextRequest) {
  let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
  if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
  
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const REDIRECT_URI = `${protocol}://${host}/api/auth/google/callback`;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Missing Google Credentials in env.");
    return NextResponse.json({ error: "Missing Google Credentials" }, { status: 500 });
  }

  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authorizeUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });

  return NextResponse.redirect(authorizeUrl);
}
