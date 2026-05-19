import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

export async function seedUsers(prisma: PrismaClient) {
  const password = await hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      password,
      name: "Alice Johnson",
      role: "ADMIN",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      password,
      name: "Bob Smith",
      role: "MEMBER",
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: {},
    create: {
      email: "charlie@example.com",
      password,
      name: "Charlie Davis",
      role: "VIEWER",
    },
  });

  return { alice, bob, charlie };
}
