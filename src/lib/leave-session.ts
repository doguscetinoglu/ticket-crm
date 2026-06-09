import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface LeaveSessionUser {
  id: string;
  email: string;
  name: string;
  role: "EMPLOYEE" | "MANAGER" | "HR_ADMIN";
}

export async function getLeaveSession(): Promise<LeaveSessionUser | null> {
  const ticketUser = await getSession();
  if (!ticketUser || ticketUser.type === "customer") return null;

  let employee = await prisma.leaveEmployee.findUnique({
    where: { userId: ticketUser.id },
  });

  if (!employee) {
    employee = await prisma.leaveEmployee.create({
      data: {
        userId: ticketUser.id,
        email: ticketUser.email,
        name: ticketUser.name,
        role: ticketUser.isAdmin ? "HR_ADMIN" : "EMPLOYEE",
      },
    });
  }

  return {
    id: employee.id,
    email: employee.email,
    name: employee.name,
    role: employee.role,
  };
}

export async function requireLeaveSession(): Promise<LeaveSessionUser> {
  const s = await getLeaveSession();
  if (!s) redirect("/login");
  return s;
}
