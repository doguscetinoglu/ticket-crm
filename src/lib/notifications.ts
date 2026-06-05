import { prisma } from "./prisma";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  return prisma.notification.create({
    data: { userId, type, title, body, link: link ?? null },
  });
}

export async function notifyAdmins(
  type: string,
  title: string,
  body: string,
  link?: string,
  excludeUserId?: number,
) {
  const admins = await prisma.user.findMany({
    where: {
      isAdmin: true,
      isActive: true,
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  await Promise.all(
    admins.map((a) => createNotification(a.id, type, title, body, link)),
  );
}
