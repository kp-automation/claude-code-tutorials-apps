import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./seeds/users";
import { seedProjects } from "./seeds/projects";
import { seedTasks } from "./seeds/tasks";
import { seedComments } from "./seeds/comments";
import { seedLabels } from "./seeds/labels";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  const users = await seedUsers(prisma);
  console.log("Created users:", users);

  const projects = await seedProjects(prisma, users.alice.id);
  console.log("Created projects:", projects);

  const tasks = await seedTasks(
    prisma,
    { project1Id: projects.project1.id, project2Id: projects.project2.id },
    { aliceId: users.alice.id, bobId: users.bob.id, charlieId: users.charlie.id },
  );
  console.log("Created tasks");

  await seedComments(
    prisma,
    { task1Id: tasks.task1.id, task3Id: tasks.task3.id, task6Id: tasks.task6.id },
    { aliceId: users.alice.id, bobId: users.bob.id },
  );
  console.log("Created comments");

  await seedLabels(
    prisma,
    { project1Id: projects.project1.id, project2Id: projects.project2.id },
    { task1Id: tasks.task1.id, task2Id: tasks.task2.id, task3Id: tasks.task3.id, task6Id: tasks.task6.id },
  );
  console.log("Created labels");

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
