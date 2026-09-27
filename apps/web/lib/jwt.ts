import { SignJWT, jwtVerify } from "jose";

function getKey() {
  const secretKey = process.env.SESSION_SECRET || "graphix-super-secure-jwt-secret";
  return new TextEncoder().encode(secretKey);
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getKey());
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, getKey(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}
