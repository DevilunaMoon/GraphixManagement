import { SignJWT, jwtVerify } from "jose";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is missing in production!");
}
const secretKey = process.env.SESSION_SECRET || "graphix-super-secure-jwt-secret";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}
