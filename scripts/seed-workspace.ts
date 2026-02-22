/**
 * Seed script to create test workspace data for UI testing
 *
 * Usage: npx tsx scripts/seed-workspace.ts <user-email>
 *
 * This will create:
 * - 1 workspace with sections and tasks of all types
 * - Add the specified user as an admin member
 */

import { createDb } from "../packages/database/index";
import { randomUUID } from "crypto";

// Load env vars
import "dotenv/config";

const db = createDb(process.env.DATABASE_URL_DEV);

async function seed(userEmail: string) {
  console.log(`\n🌱 Seeding workspace for user: ${userEmail}\n`);

  // Find user by email
  const user = await db
    .selectFrom("user")
    .selectAll()
    .where("email", "=", userEmail)
    .executeTakeFirst();

  if (!user) {
    console.error(`❌ User not found: ${userEmail}`);
    console.log("\nAvailable users:");
    const users = await db.selectFrom("user").select(["email", "name"]).execute();
    users.forEach((u) => console.log(`  - ${u.email} (${u.name})`));
    process.exit(1);
  }

  console.log(`✓ Found user: ${user.name} (${user.email})`);

  // Create workspace
  const workspaceId = randomUUID();
  await db
    .insertInto("workspace")
    .values({
      id: workspaceId,
      name: "Acme Corp Onboarding",
      description: "Complete onboarding workflow for Acme Corporation",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    })
    .execute();

  console.log(`✓ Created workspace: Acme Corp Onboarding`);

  // Add user as admin member
  await db
    .insertInto("workspace_member")
    .values({
      id: randomUUID(),
      workspaceId,
      userId: user.id,
      role: "admin",
    })
    .execute();

  console.log(`✓ Added ${user.name} as admin`);

  // Create sections
  const sections = [
    { id: randomUUID(), name: "Getting Started", position: 0 },
    { id: randomUUID(), name: "Documentation", position: 1 },
    { id: randomUUID(), name: "Compliance", position: 2 },
  ];

  for (const section of sections) {
    await db
      .insertInto("section")
      .values({
        id: section.id,
        workspaceId,
        title: section.name,
        position: section.position,
      })
      .execute();
  }

  console.log(`✓ Created ${sections.length} sections`);

  // Create tasks with all types
  const tasks = [
    // Section 1: Getting Started
    {
      sectionId: sections[0].id,
      title: "Welcome Acknowledgement",
      description: "Please read and acknowledge the welcome message and company policies.",
      type: "ACKNOWLEDGEMENT" as const,
      position: 0,
      status: "completed" as const,
    },
    {
      sectionId: sections[0].id,
      title: "Schedule Onboarding Call",
      description: "Book a time slot for your onboarding call with the team.",
      type: "TIME_BOOKING" as const,
      position: 1,
      status: "not_started" as const,
    },
    // Section 2: Documentation
    {
      sectionId: sections[1].id,
      title: "Complete Company Information Form",
      description: "Fill out the company details form with your business information.",
      type: "FORM" as const,
      position: 0,
      status: "not_started" as const,
    },
    {
      sectionId: sections[1].id,
      title: "Upload Business License",
      description: "Please upload a copy of your business license or registration document.",
      type: "FILE_REQUEST" as const,
      position: 1,
      status: "not_started" as const,
    },
    {
      sectionId: sections[1].id,
      title: "Sign Service Agreement",
      description: "Review and electronically sign the service agreement.",
      type: "E_SIGN" as const,
      position: 2,
      status: "not_started" as const,
    },
    // Section 3: Compliance
    {
      sectionId: sections[2].id,
      title: "Review Compliance Documents",
      description: "Our compliance team will review your submitted documents.",
      type: "APPROVAL" as const,
      position: 0,
      status: "not_started" as const,
    },
  ];

  const taskIds: string[] = [];
  const now = Date.now();
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskId = randomUUID();
    taskIds.push(taskId);

    // Vary creation times to demonstrate timestamps (oldest first)
    const createdAt = new Date(now - (tasks.length - i) * 2 * 24 * 60 * 60 * 1000); // 2 days apart
    const completedAt = task.status === "completed" ? new Date(now - 24 * 60 * 60 * 1000) : null; // 1 day ago

    await db
      .insertInto("task")
      .values({
        id: taskId,
        sectionId: task.sectionId,
        title: task.title,
        description: task.description,
        type: task.type,
        position: task.position,
        status: task.status,
        completionRule: "any",
        createdAt,
        updatedAt: completedAt || createdAt,
        completedAt,
      })
      .execute();

    // Create task config based on type
    switch (task.type) {
      case "FORM":
        await db
          .insertInto("form_config")
          .values({
            id: randomUUID(),
            taskId,
          })
          .execute();
        break;
      case "ACKNOWLEDGEMENT":
        await db
          .insertInto("acknowledgement_config")
          .values({
            id: randomUUID(),
            taskId,
            instructions: task.description,
          })
          .execute();
        break;
      case "TIME_BOOKING":
        await db
          .insertInto("time_booking_config")
          .values({
            id: randomUUID(),
            taskId,
            bookingLink: "https://calendly.com/example",
          })
          .execute();
        break;
      case "FILE_REQUEST":
        await db
          .insertInto("file_request_config")
          .values({
            id: randomUUID(),
            taskId,
          })
          .execute();
        break;
      case "E_SIGN":
        await db
          .insertInto("esign_config")
          .values({
            id: randomUUID(),
            taskId,
            provider: "signnow",
            status: "pending",
          })
          .execute();
        break;
      case "APPROVAL":
        await db
          .insertInto("approval_config")
          .values({
            id: randomUUID(),
            taskId,
          })
          .execute();
        break;
    }

    // Add user as assignee
    await db
      .insertInto("task_assignee")
      .values({
        id: randomUUID(),
        taskId,
        userId: user.id,
        status: task.status === "completed" ? "completed" : "pending",
        completedAt: task.status === "completed" ? new Date() : null,
      })
      .execute();
  }

  console.log(`✓ Created ${tasks.length} tasks with configs`);

  // Create task dependencies (sequential flow)
  // Task 2 depends on Task 1
  await db
    .insertInto("task_dependency")
    .values({
      id: randomUUID(),
      taskId: taskIds[1],
      dependsOnTaskId: taskIds[0],
      type: "unlock",
    })
    .execute();

  // Task 3 depends on Task 2
  await db
    .insertInto("task_dependency")
    .values({
      id: randomUUID(),
      taskId: taskIds[2],
      dependsOnTaskId: taskIds[1],
      type: "unlock",
    })
    .execute();

  console.log(`✓ Created task dependencies`);

  // Create some chat messages (some edited to demonstrate "(edited)" indicator)
  const messages = [
    { content: "Welcome to your onboarding workspace!", type: "system", edited: false },
    { content: "Hi! I'm your account manager. Let me know if you have any questions.", type: "text", edited: true },
    { content: "Thanks! Looking forward to getting started.", type: "text", edited: false },
    { content: "I've updated the first task - please take a look when you get a chance.", type: "text", edited: true },
  ];

  for (let i = 0; i < messages.length; i++) {
    const createdAt = new Date(Date.now() - (messages.length - i) * 60000); // Spread over time
    const updatedAt = messages[i].edited
      ? new Date(createdAt.getTime() + 5 * 60000) // Edited 5 minutes later
      : createdAt;

    await db
      .insertInto("message")
      .values({
        id: randomUUID(),
        workspaceId,
        senderId: user.id,
        content: messages[i].content,
        type: messages[i].type as "text" | "system",
        createdAt,
        updatedAt,
      })
      .execute();
  }

  console.log(`✓ Created ${messages.length} chat messages (${messages.filter(m => m.edited).length} edited)`);

  // Create some comments on the first task (some edited to demonstrate "(edited)" indicator)
  const comments = [
    { content: "I've acknowledged the welcome message. Ready to proceed!", edited: false },
    { content: "Great progress! Let me know if you need any help with the next steps.", edited: true },
    { content: "Thanks for the quick turnaround on this!", edited: false },
  ];

  for (let i = 0; i < comments.length; i++) {
    const createdAt = new Date(Date.now() - (comments.length - i) * 30 * 60000); // 30 minutes apart
    const updatedAt = comments[i].edited
      ? new Date(createdAt.getTime() + 10 * 60000) // Edited 10 minutes later
      : createdAt;

    await db
      .insertInto("comment")
      .values({
        id: randomUUID(),
        taskId: taskIds[0], // First task (completed one)
        userId: user.id,
        content: comments[i].content,
        createdAt,
        updatedAt,
      })
      .execute();
  }

  console.log(`✓ Created ${comments.length} task comments (${comments.filter(c => c.edited).length} edited)`);

  // Create audit log entries
  const auditEvents = [
    { eventType: "workspace.created", metadata: { workspaceName: "Acme Corp Onboarding" } },
    { eventType: "task.completed", metadata: { taskTitle: "Welcome Acknowledgement" } },
  ];

  for (const event of auditEvents) {
    await db
      .insertInto("moxo_audit_log_entry")
      .values({
        id: randomUUID(),
        workspaceId,
        eventType: event.eventType,
        actorId: user.id,
        metadata: event.metadata,
        source: "system",
      })
      .execute();
  }

  console.log(`✓ Created audit log entries`);

  console.log(`\n✅ Seed complete!`);
  console.log(`\n📍 Navigate to: http://localhost:3000/workspace/${workspaceId}`);
  console.log(`   Or go to: http://localhost:3000/workspaces to see all workspaces\n`);

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
