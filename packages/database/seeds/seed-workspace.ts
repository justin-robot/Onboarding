/**
 * Seed script to create a single test workspace for a specific user
 *
 * Usage: pnpm --filter @repo/database seed:workspace <user-email>
 *
 * This creates a simplified workspace with:
 * - 1 workspace with 3 sections
 * - 6 tasks (one of each type)
 * - The specified user as both manager and assignee
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load env from project root (handles running from packages/database)
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

import { createDb } from "../index";
import { randomUUID } from "crypto";

const db = createDb(process.env.DATABASE_URL_DEV);

async function seed(userEmail: string) {
  console.log(`\nSeeding workspace for user: ${userEmail}\n`);

  // Find user by email
  const user = await db
    .selectFrom("user")
    .selectAll()
    .where("email", "=", userEmail)
    .executeTakeFirst();

  if (!user) {
    console.error(`User not found: ${userEmail}`);
    const users = await db.selectFrom("user").select(["email", "name"]).execute();
    console.log("\nAvailable users:");
    users.forEach((u) => console.log(`  - ${u.email} (${u.name})`));
    process.exit(1);
  }

  console.log(`  Found user: ${user.name} (${user.email})`);

  const workspaceId = randomUUID();
  const now = new Date();
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Create workspace
  await db.insertInto("workspace").values({
    id: workspaceId,
    name: `${user.name}'s Test Workspace`,
    description: "Test workspace for development and UI testing",
    dueDate: daysFromNow(14),
    isPublished: true,
    hasBeenPublished: true,
  }).execute();

  console.log(`  Created workspace: ${user.name}'s Test Workspace`);

  // Add user as manager
  await db.insertInto("workspace_member").values({
    id: randomUUID(),
    workspaceId,
    userId: user.id,
    role: "manager",
  }).execute();

  console.log(`  Added ${user.name} as manager`);

  // Create sections
  const sectionIds = [randomUUID(), randomUUID(), randomUUID()];
  await db.insertInto("section").values([
    { id: sectionIds[0], workspaceId, title: "Getting Started", position: 0 },
    { id: sectionIds[1], workspaceId, title: "Documentation", position: 1 },
    { id: sectionIds[2], workspaceId, title: "Final Review", position: 2 },
  ]).execute();

  console.log("  Created 3 sections");

  // Create tasks (one of each type)
  const taskData = [
    { sectionId: sectionIds[0], title: "Complete Information Form", type: "FORM" as const, position: 0 },
    { sectionId: sectionIds[0], title: "Acknowledge Terms of Service", type: "ACKNOWLEDGEMENT" as const, position: 1 },
    { sectionId: sectionIds[1], title: "Schedule Kickoff Meeting", type: "TIME_BOOKING" as const, position: 0 },
    { sectionId: sectionIds[1], title: "Sign Agreement", type: "E_SIGN" as const, position: 1 },
    { sectionId: sectionIds[1], title: "Upload Documents", type: "FILE_REQUEST" as const, position: 2 },
    { sectionId: sectionIds[2], title: "Final Approval", type: "APPROVAL" as const, position: 0 },
  ];

  const taskIds: string[] = [];

  for (const task of taskData) {
    const taskId = randomUUID();
    taskIds.push(taskId);

    await db.insertInto("task").values({
      id: taskId,
      sectionId: task.sectionId,
      title: task.title,
      description: `Description for ${task.title}`,
      position: task.position,
      type: task.type,
      status: "not_started",
      completionRule: "any",
      dueDateType: "absolute",
      dueDateValue: daysFromNow(7),
    }).execute();

    // Add task assignee
    await db.insertInto("task_assignee").values({
      id: randomUUID(),
      taskId,
      userId: user.id,
      status: "pending",
    }).execute();

    // Create task-specific configs
    switch (task.type) {
      case "FORM": {
        const formConfigId = randomUUID();
        const formPageId = randomUUID();
        await db.insertInto("form_config").values({ id: formConfigId, taskId }).execute();
        await db.insertInto("form_page").values({ id: formPageId, formConfigId, title: "Page 1", position: 0 }).execute();
        await db.insertInto("form_element").values([
          { id: randomUUID(), formPageId, type: "text", label: "Name", placeholder: "Enter name", required: true, position: 0 },
          { id: randomUUID(), formPageId, type: "email", label: "Email", placeholder: "Enter email", required: true, position: 1 },
        ]).execute();
        break;
      }
      case "ACKNOWLEDGEMENT":
        await db.insertInto("acknowledgement_config").values({
          id: randomUUID(),
          taskId,
          instructions: "Please read and acknowledge the terms.",
        }).execute();
        break;
      case "TIME_BOOKING":
        await db.insertInto("time_booking_config").values({
          id: randomUUID(),
          taskId,
          bookingLink: "https://cal.com/example/meeting",
        }).execute();
        break;
      case "E_SIGN":
        await db.insertInto("esign_config").values({
          id: randomUUID(),
          taskId,
          signerEmail: user.email,
          provider: "signnow",
          status: "pending",
        }).execute();
        break;
      case "FILE_REQUEST":
        await db.insertInto("file_request_config").values({
          id: randomUUID(),
          taskId,
        }).execute();
        break;
      case "APPROVAL":
        const approvalConfigId = randomUUID();
        await db.insertInto("approval_config").values({ id: approvalConfigId, taskId }).execute();
        await db.insertInto("approver").values({
          id: randomUUID(),
          configId: approvalConfigId,
          userId: user.id,
          status: "pending",
        }).execute();
        break;
    }
  }

  console.log(`  Created ${taskData.length} tasks with configs`);

  // Create dependencies
  await db.insertInto("task_dependency").values([
    { id: randomUUID(), taskId: taskIds[3], dependsOnTaskId: taskIds[0], type: "unlock" }, // E-sign depends on form
    { id: randomUUID(), taskId: taskIds[5], dependsOnTaskId: taskIds[3], type: "unlock" }, // Approval depends on e-sign
  ]).execute();

  console.log("  Created task dependencies");

  // Create welcome message
  await db.insertInto("message").values({
    id: randomUUID(),
    workspaceId,
    userId: user.id,
    content: "Workspace created",
    type: "system",
  }).execute();

  console.log("  Created welcome message");

  console.log(`\nSeed complete!`);
  console.log(`\nNavigate to: http://localhost:3000/workspace/${workspaceId}\n`);

  process.exit(0);
}

// Get user email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.error("Usage: npx tsx scripts/seed-workspace.ts <user-email>");
  console.error("Example: npx tsx scripts/seed-workspace.ts test@example.com");
  process.exit(1);
}

seed(userEmail).catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
