import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "database";
import { setSession } from "../../../../../lib/session";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(req: NextRequest) {
  let host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001";
  if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
  
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const REDIRECT_URI = `${protocol}://${host}/api/auth/google/callback`;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const baseUrl = `${protocol}://${host}`;

  if (error) {
    return NextResponse.redirect(new URL("/login?error=GoogleAuthFailed", baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=NoCodeProvided", baseUrl));
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=ConfigurationError", baseUrl));
  }

  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    if (!tokens.id_token) {
        throw new Error("No ID token returned from Google");
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      throw new Error("No email found in Google profile");
    }

    // Upsert the user into the database
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || "Google User",
          image: payload.picture || null,
          authProvider: "GOOGLE",
        },
      });
    } else {
      // Update existing account to sync with latest Google profile data
      user = await prisma.user.update({
        where: { email: payload.email },
        data: { 
          authProvider: "GOOGLE",
          name: payload.name || user.name,
          image: payload.picture || user.image,
        }
      });
    }

    // Suspension check
    if (user.status === 'Suspended') {
      if (user.suspendedUntil && user.suspendedUntil > new Date()) {
        const dateStr = user.suspendedUntil.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = user.suspendedUntil.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        
        let errorMsg = `Your account is suspended until ${dateStr} at ${timeStr}.`;
        if (user.suspendedUntil.getFullYear() > 2090) {
          errorMsg = "Your account has been permanently suspended.";
        }
        return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(errorMsg), baseUrl));
      } else if (!user.suspendedUntil || user.suspendedUntil <= new Date()) {
        // Automatically lift suspension if it's expired
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'Active', suspendedUntil: null }
        });
        user.status = 'Active';
        user.suspendedUntil = null;
      }
    }

    // Set the session using the same logic as your regular login
    await setSession(user.id, user.role);

    // Redirect strictly to the customer dashboard or state redirect URL if present and starts with /
    const state = url.searchParams.get("state") || "";
    const redirectPath = (state && state.startsWith("/")) ? state : "/customer/dashboard";

    return NextResponse.redirect(new URL(redirectPath, baseUrl));

  } catch (err: any) {
    console.error("Google Auth Callback Error:", err);
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(err.message), baseUrl));
  }
}
