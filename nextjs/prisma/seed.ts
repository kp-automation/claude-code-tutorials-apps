import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create users
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

  console.log("Created users:", { alice, bob, charlie });

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: "TaskForge Development",
      description: "Build the next generation project management tool",
      status: "ACTIVE",
      ownerId: alice.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Marketing Campaign",
      description: "Q1 2024 marketing initiatives",
      status: "ACTIVE",
      ownerId: alice.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Legacy System Migration",
      description: "Migrate old infrastructure to cloud",
      status: "ARCHIVED",
      ownerId: alice.id,
    },
  });

  console.log("Created projects:", { project1, project2, project3 });

  // Create tasks for project 1
  const task1 = await prisma.task.create({
    data: {
      title: "Setup authentication system",
      description: "Implement NextAuth.js with credentials provider",
      status: "DONE",
      priority: "HIGH",
      projectId: project1.id,
      assigneeId: alice.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Design database schema",
      description: "Create Prisma schema for all models",
      status: "DONE",
      priority: "URGENT",
      projectId: project1.id,
      assigneeId: alice.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Build task board UI",
      description: "Create Kanban board with drag and drop",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project1.id,
      assigneeId: bob.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "Add comment functionality",
      description: "Allow users to comment on tasks",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project1.id,
      assigneeId: bob.id,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: "Implement project archiving",
      description: "Add ability to archive completed projects",
      status: "TODO",
      priority: "LOW",
      projectId: project1.id,
    },
  });

  // Create tasks for project 2
  const task6 = await prisma.task.create({
    data: {
      title: "Social media strategy",
      description: "Develop comprehensive social media plan",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project2.id,
      assigneeId: bob.id,
    },
  });

  const task7 = await prisma.task.create({
    data: {
      title: "Email campaign design",
      description: "Create email templates for campaign",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project2.id,
    },
  });

  const task8 = await prisma.task.create({
    data: {
      title: "Analytics dashboard setup",
      description: "Configure tracking and analytics",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project2.id,
      assigneeId: charlie.id,
    },
  });

  console.log("Created tasks");

  // Create comments
  await prisma.comment.create({
    data: {
      content: "Great work on the authentication! Testing it now.",
      taskId: task1.id,
      authorId: bob.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Thanks! Let me know if you find any issues.",
      taskId: task1.id,
      authorId: alice.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "The Kanban board is coming along nicely. Should be done by end of week.",
      taskId: task3.id,
      authorId: bob.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "We need to prioritize the social media content calendar.",
      taskId: task6.id,
      authorId: alice.id,
    },
  });

  console.log("Created comments");

  // Create labels
  const bugLabel = await prisma.label.create({
    data: {
      name: "Bug",
      color: "#ef4444",
      projectId: project1.id,
    },
  });

  const featureLabel = await prisma.label.create({
    data: {
      name: "Feature",
      color: "#3b82f6",
      projectId: project1.id,
    },
  });

  const urgentLabel = await prisma.label.create({
    data: {
      name: "Urgent",
      color: "#f97316",
      projectId: project2.id,
    },
  });

  console.log("Created labels");

  // Assign labels to tasks
  await prisma.taskLabel.createMany({
    data: [
      { taskId: task1.id, labelId: featureLabel.id },
      { taskId: task2.id, labelId: featureLabel.id },
      { taskId: task3.id, labelId: featureLabel.id },
      { taskId: task6.id, labelId: urgentLabel.id },
    ],
  });

  console.log("Assigned labels to tasks");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
