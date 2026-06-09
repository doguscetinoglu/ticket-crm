import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface LeaveSessionUser {
  id: string;
  email: string;
  name: string;
  role: "EMPLOYEE" | "MANAGER" | "HR_ADMIN";
}

export const LEAVE_COOKIE = "lp_session";

const SECRET = new TextEncoder().encode(
  process.env.LEAVE_JWT_SECRET ?? process.env.JWT_SECRET ?? "leave-portal-secret-key-32chars!!"
);

export async function signLeaveToken(user: LeaveSessionUser): Promise<string> {
  return new SignJWT(user as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyLeaveToken(token: string): Promise<LeaveSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as LeaveSessionUser;
  } catch {
    return null;
  }
}

export async function getLeaveSession(): Promise<LeaveSessionUser | null> {
  const store = await cookies();
  const token = store.get(LEAVE_COOKIE)?.value;
  if (!token) return null;
  return verifyLeaveToken(token);
}

export async function requireLeaveSession(): Promise<LeaveSessionUser> {
  const s = await getLeaveSession();
  if (!s) redirect("/izin-portal/login");
  return s;
}
