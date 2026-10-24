import { cookies, headers } from "next/headers";
import { encrypt, decrypt } from "./jwt";

export { encrypt, decrypt };

export async function setSession(userId: string, role: string, branch?: string | null) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration
  const session = await encrypt({ userId, role, branch: branch || "Tagoloan", expires });

  let isHttps = false;
  try {
    const headersList = await headers();
    const proto = headersList.get("x-forwarded-proto") || "";
    isHttps = proto.toLowerCase() === "https";
  } catch (e) {
    isHttps = false;
  }

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    expires,
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
