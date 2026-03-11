import "dotenv/config";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createDb, pool } from "../index";
import type { Database } from "../schemas/main";
import type { Kysely } from "kysely";

// Helper to generate UUIDs (only used for non-critical IDs like workspace members)
const uuid = () => crypto.randomUUID();

// Fixed UUIDs for reproducible seed data
const ids = {
  // Users (will be overwritten by actual user IDs from Better Auth)
  adminUser: "00000000-0000-0000-0000-000000000001",
  accountManager: "00000000-0000-0000-0000-000000000002",
  user1: "00000000-0000-0000-0000-000000000003",
  user2: "00000000-0000-0000-0000-000000000004",

  // Workspaces
  workspace1: "11111111-1111-1111-1111-111111111101",
  workspace2: "11111111-1111-1111-1111-111111111102",

  // Sections (workspace 1)
  w1Section1: "22222222-2222-2222-2222-222222222201",
  w1Section2: "22222222-2222-2222-2222-222222222202",
  w1Section3: "22222222-2222-2222-2222-222222222203",
  // Sections (workspace 2)
  w2Section1: "22222222-2222-2222-2222-222222222211",
  w2Section2: "22222222-2222-2222-2222-222222222212",

  // Tasks (workspace 1, section 1 - onboarding)
  taskForm: "33333333-3333-3333-3333-333333333301",
  taskAck: "33333333-3333-3333-3333-333333333302",
  taskBooking: "33333333-3333-3333-3333-333333333303",
  // Tasks (workspace 1, section 2 - documents)
  taskEsign: "33333333-3333-3333-3333-333333333304",
  taskFileReq: "33333333-3333-3333-3333-333333333305",
  // Tasks (workspace 1, section 3 - review)
  taskApproval: "33333333-3333-3333-3333-333333333306",
  // Tasks (workspace 2, section 1)
  taskForm2: "33333333-3333-3333-3333-333333333311",
  taskAck2: "33333333-3333-3333-3333-333333333312",
  // Tasks (workspace 2, section 2)
  taskApproval2: "33333333-3333-3333-3333-333333333321",

  // Form configs
  formConfig1: "44444444-4444-4444-4444-444444444401",
  formConfig2: "44444444-4444-4444-4444-444444444402",
  formPage1: "44444444-4444-4444-4444-444444444411",
  formPage2: "44444444-4444-4444-4444-444444444412",
  formElement1: "44444444-4444-4444-4444-444444444421",
  formElement2: "44444444-4444-4444-4444-444444444422",
  formElement3: "44444444-4444-4444-4444-444444444423",
  formElement4: "44444444-4444-4444-4444-444444444424",
  formElement5: "44444444-4444-4444-4444-444444444425",
  formElement6: "44444444-4444-4444-4444-444444444426",

  // Acknowledgement configs
  ackConfig1: "55555555-5555-5555-5555-555555555501",
  ackConfig2: "55555555-5555-5555-5555-555555555502",

  // Time booking config
  bookingConfig1: "66666666-6666-6666-6666-666666666601",

  // E-sign config
  esignConfig1: "77777777-7777-7777-7777-777777777701",

  // File request config
  fileReqConfig1: "88888888-8888-8888-8888-888888888801",

  // Approval configs
  approvalConfig1: "99999999-9999-9999-9999-999999999901",
  approvalConfig2: "99999999-9999-9999-9999-999999999902",

  // Files
  file1: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101",
  file2: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102",
  file3: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103",

  // Comments
  comment1: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb101",
  comment2: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb102",
  comment3: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb103",
  comment4: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb104",

  // Messages
  msg1: "cccccccc-cccc-cccc-cccc-ccccccccc101",
  msg2: "cccccccc-cccc-cccc-cccc-ccccccccc102",
  msg3: "cccccccc-cccc-cccc-cccc-ccccccccc103",
  msg4: "cccccccc-cccc-cccc-cccc-ccccccccc104",
  msg5: "cccccccc-cccc-cccc-cccc-ccccccccc105",
  msg6: "cccccccc-cccc-cccc-cccc-ccccccccc106",

  // Form submissions
  formSubmission1: "dddddddd-dddd-dddd-dddd-ddddddddd101",
  formSubmission2: "dddddddd-dddd-dddd-dddd-ddddddddd102",

  // Form field responses
  fieldResponse1: "eeeeeeee-eeee-eeee-eeee-eeeeeeeee101",
  fieldResponse2: "eeeeeeee-eeee-eeee-eeee-eeeeeeeee102",
  fieldResponse3: "eeeeeeee-eeee-eeee-eeee-eeeeeeeee103",
  fieldResponse4: "eeeeeeee-eeee-eeee-eeee-eeeeeeeee104",

  // Acknowledgements
  ack1: "ffffffff-ffff-ffff-ffff-fffffffffff1",
  ack2: "ffffffff-ffff-ffff-ffff-fffffffffff2",
  ack3: "ffffffff-ffff-ffff-ffff-fffffffffff3",

  // Bookings
  booking1: "10101010-1010-1010-1010-101010101001",

  // File uploaded for file request
  uploadedFile1: "20202020-2020-2020-2020-202020202001",

  // Pending invitations
  invitation1: "30303030-3030-3030-3030-303030303001",
  invitation2: "30303030-3030-3030-3030-303030303002",
};

async function seed() {
  // Parse arguments: seed.ts [env] [--no-cleanup]
  // env: "dev" or "prod" (default: "dev")
  // --no-cleanup: skip cleanup step, add data alongside existing data
  const args = process.argv.slice(2);
  const noCleanup = args.includes("--no-cleanup") || args.includes("--add");
  const env = args.find((a) => a === "dev" || a === "prod") || "dev";

  const adminUrl =
    env === "prod"
      ? process.env.DATABASE_URL_PROD_ADMIN
      : process.env.DATABASE_URL_DEV_ADMIN;

  if (!adminUrl) {
    console.error(
      `Error: DATABASE_URL_${env === "prod" ? "PROD" : "DEV"}_ADMIN is not set`
    );
    process.exit(1);
  }

  const auth = betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendVerificationEmail: async () => {
        // No-op during seeding to skip email sending
      },
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
    },
    plugins: [admin()],
  });

  const db = createDb(adminUrl) as Kysely<Database>;
  const envLabel = env === "prod" ? "production" : "development";

  console.log(`Seeding ${envLabel} database with mock data...`);
  if (noCleanup) {
    console.log("  Mode: --no-cleanup (adding data alongside existing)\n");
  } else {
    console.log("  Mode: full reset (cleaning existing data first)\n");
  }

  try {
    // =====================
    // CLEANUP EXISTING DATA (skip if --no-cleanup)
    // =====================
    if (!noCleanup) {
      console.log("  Cleaning up existing data...");

      // Delete in order respecting foreign keys (children first)
      await db.deleteFrom("moxo_audit_log_entry").execute();
      await db.deleteFrom("pending_invitation").execute();
      await db.deleteFrom("notification").execute();
      await db.deleteFrom("reminder").execute();
      await db.deleteFrom("message").execute();
      await db.deleteFrom("comment").execute();
      await db.deleteFrom("form_field_response").execute();
      await db.deleteFrom("form_submission").execute();
      await db.deleteFrom("form_element").execute();
      await db.deleteFrom("form_page").execute();
      await db.deleteFrom("form_config").execute();
      await db.deleteFrom("acknowledgement").execute();
      await db.deleteFrom("acknowledgement_config").execute();
      await db.deleteFrom("booking").execute();
      await db.deleteFrom("time_booking_config").execute();
      await db.deleteFrom("esign_config").execute();
      await db.deleteFrom("file_request_config").execute();
      await db.deleteFrom("approver").execute();
      await db.deleteFrom("approval_config").execute();
      await db.deleteFrom("file").execute();
      await db.deleteFrom("task_assignee").execute();
      await db.deleteFrom("task_dependency").execute();
      await db.deleteFrom("task").execute();
      await db.deleteFrom("section").execute();
      await db.deleteFrom("workspace_integration").execute();
      await db.deleteFrom("workspace_member").execute();
      await db.deleteFrom("workspace").execute();

      console.log("  Cleanup complete.\n");
    }

    // =====================
    // USERS (via Better Auth)
    // =====================
    const userData = [
      {
        key: "adminUser",
        name: "Admin User",
        username: "admin",
        email: "admin@example.com",
        password: "password123",
      },
      {
        key: "accountManager",
        name: "Sarah Chen",
        username: "sarah",
        email: "sarah@example.com",
        password: "password123",
      },
      {
        key: "user1",
        name: "Marcus Johnson",
        username: "marcus",
        email: "marcus@example.com",
        password: "password123",
      },
      {
        key: "user2",
        name: "Emily Rivera",
        username: "emily",
        email: "emily@example.com",
        password: "password123",
      },
    ];

    // Check for existing users first
    const existingUsers = await db
      .selectFrom("user")
      .select(["id", "email"])
      .where(
        "email",
        "in",
        userData.map((u) => u.email)
      )
      .execute();

    const existingUserMap = new Map(existingUsers.map((u) => [u.email, u.id]));

    // Check for real user account to add to workspaces
    const realUser = await db
      .selectFrom("user")
      .select(["id", "email"])
      .where("email", "=", "justin@n2o.com")
      .executeTakeFirst();

    if (realUser) {
      (ids as Record<string, string>)["realUser"] = realUser.id;
      console.log(`  Found real user account: ${realUser.email}`);
    }
    const createdUsers: Array<{ id: string; email: string }> = [];

    for (const userInfo of userData) {
      // Check if user already exists
      const existingId = existingUserMap.get(userInfo.email);
      if (existingId) {
        (ids as Record<string, string>)[userInfo.key] = existingId;
        createdUsers.push({ id: existingId, email: userInfo.email });
        console.log(`  Found existing user: ${userInfo.name} (${userInfo.email})`);
        continue;
      }

      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: userInfo.email,
            password: userInfo.password,
            name: userInfo.name,
          },
        });

        if ("error" in result) {
          console.error(
            `Error creating user ${userInfo.email}:`,
            result.error
          );
          continue;
        }

        // Update the id mapping to use the actual ID from Better Auth
        const actualId = result.user.id;
        (ids as Record<string, string>)[userInfo.key] = actualId;

        createdUsers.push({ id: actualId, email: userInfo.email });
        console.log(`  Created user: ${userInfo.name} (${userInfo.email})`);
      } catch (error) {
        console.error(`Exception creating user ${userInfo.email}:`, error);
      }
    }

    if (createdUsers.length === 0) {
      console.error("No users found or created, cannot seed remaining data.");
      process.exit(1);
    }

    console.log(`\n${createdUsers.length} users ready.\n`);

    // Update user roles and platform admin status
    await db
      .updateTable("user")
      .set({ role: "admin", isPlatformAdmin: true })
      .where("id", "=", ids.adminUser)
      .execute();
    await db
      .updateTable("user")
      .set({ role: "user" })
      .where("id", "=", ids.accountManager)
      .execute();

    console.log("  Updated user roles and platform admin status.\n");

    // =====================
    // WORKSPACES
    // =====================
    const now = new Date();
    const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const inOneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db
      .insertInto("workspace")
      .values([
        {
          id: ids.workspace1,
          name: "Acme Corp Onboarding",
          description:
            "Client onboarding workflow for Acme Corporation — includes compliance docs, team intro, and contract signing.",
          dueDate: inTwoWeeks,
        },
        {
          id: ids.workspace2,
          name: "Q1 Audit Preparation",
          description:
            "Internal audit preparation for Q1 financials. All documents must be reviewed and approved before submission.",
          dueDate: inOneMonth,
        },
      ])
      .execute();

    console.log("  Created 2 workspaces.");

    // =====================
    // WORKSPACE MEMBERS
    // =====================
    const workspaceMembers = [
      // Workspace 1: all 4 users
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        userId: ids.adminUser,
        role: "admin" as const,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        userId: ids.accountManager,
        role: "user" as const,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        userId: ids.user1,
        role: "user" as const,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        userId: ids.user2,
        role: "user" as const,
      },
      // Workspace 2: admin, account manager, user1
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        userId: ids.adminUser,
        role: "admin" as const,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        userId: ids.accountManager,
        role: "user" as const,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        userId: ids.user1,
        role: "user" as const,
      },
    ];

    // Add real user (justin@n2o.com) to both workspaces if they exist
    const realUserId = (ids as Record<string, string>).realUser as `${string}-${string}-${string}-${string}-${string}` | undefined;
    if (realUserId) {
      workspaceMembers.push(
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: realUserId,
          role: "admin" as const,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: realUserId,
          role: "admin" as const,
        }
      );
    }

    await db.insertInto("workspace_member").values(workspaceMembers).execute();

    console.log("  Created workspace members.");

    // =====================
    // SECTIONS
    // =====================
    await db
      .insertInto("section")
      .values([
        // Workspace 1 sections
        {
          id: ids.w1Section1,
          workspaceId: ids.workspace1,
          title: "Getting Started",
          position: 0,
        },
        {
          id: ids.w1Section2,
          workspaceId: ids.workspace1,
          title: "Documents & Signing",
          position: 1,
        },
        {
          id: ids.w1Section3,
          workspaceId: ids.workspace1,
          title: "Final Review",
          position: 2,
        },
        // Workspace 2 sections
        {
          id: ids.w2Section1,
          workspaceId: ids.workspace2,
          title: "Data Collection",
          position: 0,
        },
        {
          id: ids.w2Section2,
          workspaceId: ids.workspace2,
          title: "Approvals",
          position: 1,
        },
      ])
      .execute();

    console.log("  Created 5 sections.");

    // =====================
    // TASKS
    // =====================
    const threeDaysFromNow = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000
    );
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    await db
      .insertInto("task")
      .values([
        // Workspace 1, Section 1 - Getting Started
        {
          id: ids.taskForm,
          sectionId: ids.w1Section1,
          title: "Complete Company Information Form",
          description:
            "Please fill out your company details including legal name, address, and primary contacts.",
          position: 0,
          type: "FORM" as const,
          completionRule: "all" as const,
          dueDateType: "absolute" as const,
          dueDateValue: threeDaysFromNow,
        },
        {
          id: ids.taskAck,
          sectionId: ids.w1Section1,
          title: "Acknowledge Terms of Service",
          description:
            "Review and acknowledge the terms of service and privacy policy.",
          position: 1,
          type: "ACKNOWLEDGEMENT" as const,
          completionRule: "all" as const,
          dueDateType: "absolute" as const,
          dueDateValue: threeDaysFromNow,
        },
        {
          id: ids.taskBooking,
          sectionId: ids.w1Section1,
          title: "Schedule Kickoff Meeting",
          description:
            "Book a 30-minute introductory call with your account manager.",
          position: 2,
          type: "TIME_BOOKING" as const,
          completionRule: "any" as const,
          dueDateType: "absolute" as const,
          dueDateValue: oneWeekFromNow,
        },

        // Workspace 1, Section 2 - Documents & Signing
        {
          id: ids.taskEsign,
          sectionId: ids.w1Section2,
          title: "Sign Service Agreement",
          description: "Review and electronically sign the service agreement.",
          position: 0,
          type: "E_SIGN" as const,
          completionRule: "all" as const,
          dueDateType: "absolute" as const,
          dueDateValue: oneWeekFromNow,
        },
        {
          id: ids.taskFileReq,
          sectionId: ids.w1Section2,
          title: "Upload Business License",
          description:
            "Please upload a copy of your current business license or certificate of incorporation.",
          position: 1,
          type: "FILE_REQUEST" as const,
          completionRule: "any" as const,
          dueDateType: "absolute" as const,
          dueDateValue: oneWeekFromNow,
        },

        // Workspace 1, Section 3 - Final Review
        {
          id: ids.taskApproval,
          sectionId: ids.w1Section3,
          title: "Approve Client Onboarding",
          description:
            "Final approval of all submitted documents and information before activating the account.",
          position: 0,
          type: "APPROVAL" as const,
          completionRule: "all" as const,
          dueDateType: "absolute" as const,
          dueDateValue: tenDaysFromNow,
        },

        // Workspace 2, Section 1 - Data Collection
        {
          id: ids.taskForm2,
          sectionId: ids.w2Section1,
          title: "Submit Q1 Financial Summary",
          description:
            "Complete the financial summary form with Q1 revenue, expenses, and profit figures.",
          position: 0,
          type: "FORM" as const,
          completionRule: "all" as const,
          dueDateType: "absolute" as const,
          dueDateValue: oneWeekFromNow,
        },
        {
          id: ids.taskAck2,
          sectionId: ids.w2Section1,
          title: "Acknowledge Audit Guidelines",
          description:
            "Confirm you have read and understood the internal audit guidelines for this cycle.",
          position: 1,
          type: "ACKNOWLEDGEMENT" as const,
          completionRule: "all" as const,
        },

        // Workspace 2, Section 2 - Approvals
        {
          id: ids.taskApproval2,
          sectionId: ids.w2Section2,
          title: "Approve Q1 Financial Report",
          description:
            "Review and approve the consolidated Q1 financial report.",
          position: 0,
          type: "APPROVAL" as const,
          completionRule: "all" as const,
          dueDateType: "absolute" as const,
          dueDateValue: inOneMonth,
        },
      ])
      .execute();

    console.log("  Created 9 tasks.");

    // =====================
    // TASK DEPENDENCIES
    // =====================
    await db
      .insertInto("task_dependency")
      .values([
        // E-sign unlocked after form is complete
        {
          id: uuid(),
          taskId: ids.taskEsign,
          dependsOnTaskId: ids.taskForm,
          type: "unlock" as const,
        },
        // Final approval unlocked after e-sign and file request
        {
          id: uuid(),
          taskId: ids.taskApproval,
          dependsOnTaskId: ids.taskEsign,
          type: "unlock" as const,
        },
        {
          id: uuid(),
          taskId: ids.taskApproval,
          dependsOnTaskId: ids.taskFileReq,
          type: "unlock" as const,
        },
        // Workspace 2: approval depends on form
        {
          id: uuid(),
          taskId: ids.taskApproval2,
          dependsOnTaskId: ids.taskForm2,
          type: "unlock" as const,
        },
      ])
      .execute();

    console.log("  Created 4 task dependencies.");

    // =====================
    // TASK ASSIGNEES
    // =====================
    await db
      .insertInto("task_assignee")
      .values([
        // Workspace 1 tasks
        {
          id: uuid(),
          taskId: ids.taskForm,
          userId: ids.user1,
        },
        {
          id: uuid(),
          taskId: ids.taskForm,
          userId: ids.user2,
        },
        {
          id: uuid(),
          taskId: ids.taskAck,
          userId: ids.user1,
        },
        {
          id: uuid(),
          taskId: ids.taskAck,
          userId: ids.user2,
        },
        {
          id: uuid(),
          taskId: ids.taskBooking,
          userId: ids.user1,
        },
        {
          id: uuid(),
          taskId: ids.taskEsign,
          userId: ids.user1,
        },
        {
          id: uuid(),
          taskId: ids.taskFileReq,
          userId: ids.user2,
        },
        {
          id: uuid(),
          taskId: ids.taskApproval,
          userId: ids.adminUser,
        },
        {
          id: uuid(),
          taskId: ids.taskApproval,
          userId: ids.accountManager,
        },
        // Workspace 2 tasks
        {
          id: uuid(),
          taskId: ids.taskForm2,
          userId: ids.user1,
        },
        {
          id: uuid(),
          taskId: ids.taskAck2,
          userId: ids.user1,
        },
        {
          id: uuid(),
          taskId: ids.taskAck2,
          userId: ids.accountManager,
        },
        {
          id: uuid(),
          taskId: ids.taskApproval2,
          userId: ids.adminUser,
        },
      ])
      .execute();

    console.log("  Created 13 task assignees.");

    // =====================
    // FORM CONFIGS, PAGES, ELEMENTS
    // =====================

    // Form config for "Complete Company Information Form"
    await db
      .insertInto("form_config")
      .values([
        { id: ids.formConfig1, taskId: ids.taskForm },
        { id: ids.formConfig2, taskId: ids.taskForm2 },
      ])
      .execute();

    // Pages
    await db
      .insertInto("form_page")
      .values([
        {
          id: ids.formPage1,
          formConfigId: ids.formConfig1,
          title: "Company Details",
          position: 0,
        },
        {
          id: ids.formPage2,
          formConfigId: ids.formConfig2,
          title: "Q1 Financial Data",
          position: 0,
        },
      ])
      .execute();

    // Elements for Company Information form
    await db
      .insertInto("form_element")
      .values([
        {
          id: ids.formElement1,
          formPageId: ids.formPage1,
          type: "text" as const,
          label: "Legal Company Name",
          placeholder: "e.g. Acme Corporation Inc.",
          required: true,
          position: 0,
        },
        {
          id: ids.formElement2,
          formPageId: ids.formPage1,
          type: "email" as const,
          label: "Primary Contact Email",
          placeholder: "contact@company.com",
          required: true,
          position: 1,
        },
        {
          id: ids.formElement3,
          formPageId: ids.formPage1,
          type: "phone" as const,
          label: "Phone Number",
          placeholder: "+1 (555) 000-0000",
          required: false,
          position: 2,
        },
        {
          id: ids.formElement4,
          formPageId: ids.formPage1,
          type: "textarea" as const,
          label: "Business Address",
          placeholder: "Full street address including city, state, and ZIP",
          required: true,
          position: 3,
        },
        // Elements for Q1 Financial form
        {
          id: ids.formElement5,
          formPageId: ids.formPage2,
          type: "number" as const,
          label: "Q1 Revenue ($)",
          placeholder: "0.00",
          required: true,
          position: 0,
        },
        {
          id: ids.formElement6,
          formPageId: ids.formPage2,
          type: "number" as const,
          label: "Q1 Expenses ($)",
          placeholder: "0.00",
          required: true,
          position: 1,
        },
      ])
      .execute();

    console.log("  Created 2 form configs with pages and elements.");

    // =====================
    // ACKNOWLEDGEMENT CONFIGS
    // =====================
    await db
      .insertInto("acknowledgement_config")
      .values([
        {
          id: ids.ackConfig1,
          taskId: ids.taskAck,
          instructions:
            "By acknowledging below, you confirm that you have read and agree to our Terms of Service and Privacy Policy. These documents govern your use of our platform and describe how we handle your data.",
        },
        {
          id: ids.ackConfig2,
          taskId: ids.taskAck2,
          instructions:
            "I confirm that I have reviewed the Q1 Internal Audit Guidelines document and understand the requirements, timelines, and procedures outlined within.",
        },
      ])
      .execute();

    console.log("  Created 2 acknowledgement configs.");

    // =====================
    // TIME BOOKING CONFIG
    // =====================
    await db
      .insertInto("time_booking_config")
      .values({
        id: ids.bookingConfig1,
        taskId: ids.taskBooking,
        bookingLink: "https://cal.com/moxo/kickoff-meeting",
      })
      .execute();

    console.log("  Created 1 time booking config.");

    // =====================
    // FILES (needed for e-sign config)
    // =====================
    await db
      .insertInto("file")
      .values([
        {
          id: ids.file1,
          workspaceId: ids.workspace1,
          uploadedBy: ids.accountManager,
          name: "Service_Agreement_v2.pdf",
          mimeType: "application/pdf",
          size: 245_000,
          storageKey: `workspaces/${ids.workspace1}/files/service-agreement-v2.pdf`,
          sourceType: "upload" as const,
        },
        {
          id: ids.file2,
          workspaceId: ids.workspace1,
          uploadedBy: ids.accountManager,
          name: "Onboarding_Welcome_Pack.pdf",
          mimeType: "application/pdf",
          size: 1_200_000,
          storageKey: `workspaces/${ids.workspace1}/files/onboarding-welcome-pack.pdf`,
          sourceType: "upload" as const,
        },
        {
          id: ids.file3,
          workspaceId: ids.workspace2,
          uploadedBy: ids.adminUser,
          name: "Q1_Audit_Guidelines.pdf",
          mimeType: "application/pdf",
          size: 89_000,
          storageKey: `workspaces/${ids.workspace2}/files/q1-audit-guidelines.pdf`,
          sourceType: "upload" as const,
        },
      ])
      .execute();

    console.log("  Created 3 files.");

    // =====================
    // E-SIGN CONFIG
    // =====================
    await db
      .insertInto("esign_config")
      .values({
        id: ids.esignConfig1,
        taskId: ids.taskEsign,
        fileId: ids.file1,
        signerEmail: "marcus@example.com",
        status: "pending" as const,
      })
      .execute();

    console.log("  Created 1 e-sign config.");

    // =====================
    // FILE REQUEST CONFIG
    // =====================
    await db
      .insertInto("file_request_config")
      .values({
        id: ids.fileReqConfig1,
        taskId: ids.taskFileReq,
      })
      .execute();

    console.log("  Created 1 file request config.");

    // =====================
    // APPROVAL CONFIGS & APPROVERS
    // =====================
    await db
      .insertInto("approval_config")
      .values([
        { id: ids.approvalConfig1, taskId: ids.taskApproval },
        { id: ids.approvalConfig2, taskId: ids.taskApproval2 },
      ])
      .execute();

    await db
      .insertInto("approver")
      .values([
        {
          id: uuid(),
          configId: ids.approvalConfig1,
          userId: ids.adminUser,
        },
        {
          id: uuid(),
          configId: ids.approvalConfig1,
          userId: ids.accountManager,
        },
        {
          id: uuid(),
          configId: ids.approvalConfig2,
          userId: ids.adminUser,
        },
      ])
      .execute();

    console.log("  Created 2 approval configs with 3 approvers.");

    // =====================
    // COMMENTS
    // =====================
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

    await db
      .insertInto("comment")
      .values([
        {
          id: ids.comment1,
          taskId: ids.taskForm,
          userId: ids.accountManager,
          content:
            "Hi team, please make sure to use your legal company name as it appears on your registration documents.",
          createdAt: oneHourAgo,
        },
        {
          id: ids.comment2,
          taskId: ids.taskForm,
          userId: ids.user1,
          content: "Got it, thanks Sarah!",
          createdAt: thirtyMinAgo,
        },
        {
          id: ids.comment3,
          taskId: ids.taskEsign,
          userId: ids.accountManager,
          content:
            "The service agreement has been uploaded. Once the company info form is complete, you'll be able to sign.",
          createdAt: oneHourAgo,
        },
        {
          id: ids.comment4,
          taskId: ids.taskApproval2,
          userId: ids.adminUser,
          content:
            "I'll review as soon as the financial summary is submitted.",
          createdAt: tenMinAgo,
        },
      ])
      .execute();

    console.log("  Created 4 comments.");

    // =====================
    // MESSAGES (workspace chat with system messages for task events)
    // =====================
    // Timeline timestamps for messages
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const ninetyMinAgo = new Date(now.getTime() - 90 * 60 * 1000);
    const fortyMinAgo = new Date(now.getTime() - 40 * 60 * 1000);
    const twentyMinAgo = new Date(now.getTime() - 20 * 60 * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Workspace setup timestamps (3 days ago)
    const threeDaysAgoMsg = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const threeDaysAgoPlus1m = new Date(threeDaysAgoMsg.getTime() + 1 * 60 * 1000);
    const threeDaysAgoPlus2m = new Date(threeDaysAgoMsg.getTime() + 2 * 60 * 1000);
    const threeDaysAgoPlus3m = new Date(threeDaysAgoMsg.getTime() + 3 * 60 * 1000);

    // Yesterday timestamps for task completions
    const yesterdayMorningMsg = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayAfternoonMsg = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    // One day ago for workspace 2
    const oneDayAgoMsg = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    await db
      .insertInto("message")
      .values([
        // ===== WORKSPACE 1: System messages for workspace setup (3 days ago) =====
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.adminUser,
          content: "Workspace created",
          type: "system" as const,
          createdAt: threeDaysAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.adminUser,
          content: "Sarah Chen joined as Account Manager",
          type: "system" as const,
          createdAt: threeDaysAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.adminUser,
          content: "Marcus Johnson joined as User",
          type: "system" as const,
          createdAt: threeDaysAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.adminUser,
          content: "Emily Rivera joined as User",
          type: "system" as const,
          createdAt: threeDaysAgoMsg,
        },
        // Task creation system messages
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: 'Task "Complete Company Information Form" created and assigned to Marcus Johnson, Emily Rivera',
          type: "system" as const,
          referencedTaskId: ids.taskForm,
          createdAt: threeDaysAgoPlus1m,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: 'Task "Acknowledge Terms of Service" created and assigned to Marcus Johnson, Emily Rivera',
          type: "system" as const,
          referencedTaskId: ids.taskAck,
          createdAt: threeDaysAgoPlus1m,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: 'Task "Schedule Kickoff Meeting" created and assigned to Marcus Johnson',
          type: "system" as const,
          referencedTaskId: ids.taskBooking,
          createdAt: threeDaysAgoPlus1m,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: 'Task "Sign Service Agreement" created and assigned to Marcus Johnson',
          type: "system" as const,
          referencedTaskId: ids.taskEsign,
          createdAt: threeDaysAgoPlus2m,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: 'Task "Upload Business License" created and assigned to Emily Rivera',
          type: "system" as const,
          referencedTaskId: ids.taskFileReq,
          createdAt: threeDaysAgoPlus2m,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: 'Task "Approve Client Onboarding" created and assigned to Admin User, Sarah Chen',
          type: "system" as const,
          referencedTaskId: ids.taskApproval,
          createdAt: threeDaysAgoPlus3m,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: "Service_Agreement_v2.pdf uploaded",
          type: "system" as const,
          referencedFileId: ids.file1,
          createdAt: threeDaysAgoPlus3m,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: "Onboarding_Welcome_Pack.pdf uploaded",
          type: "system" as const,
          referencedFileId: ids.file2,
          createdAt: threeDaysAgoPlus3m,
        },

        // ===== WORKSPACE 1: Yesterday - Task completions =====
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.adminUser,
          content: "Emily Rivera completed Acknowledge Terms of Service",
          type: "system" as const,
          referencedTaskId: ids.taskAck,
          createdAt: yesterdayAfternoonMsg,
        },

        // ===== WORKSPACE 1: Today - User messages and task events =====
        // Welcome message
        {
          id: ids.msg1,
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content:
            "Welcome to the Acme Corp onboarding workspace! I've set up all the tasks you'll need to complete. Feel free to ask questions here.",
          type: "text" as const,
          createdAt: twoHoursAgo,
        },
        {
          id: ids.msg2,
          workspaceId: ids.workspace1,
          userId: ids.user1,
          content: "Thanks Sarah! We'll get started on the forms today.",
          type: "text" as const,
          createdAt: ninetyMinAgo,
        },
        // File upload for file request
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.adminUser,
          content: "Emily Rivera completed Upload Business License",
          type: "system" as const,
          referencedTaskId: ids.taskFileReq,
          createdAt: fortyMinAgo,
        },
        // User question about file
        {
          id: ids.msg3,
          workspaceId: ids.workspace1,
          userId: ids.user2,
          content:
            "Quick question — for the business license upload, do you need the original or is a scanned copy fine?",
          type: "text" as const,
          createdAt: fortyMinAgo,
        },
        // Meeting booked
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          userId: ids.adminUser,
          content: "Marcus Johnson completed Schedule Kickoff Meeting",
          type: "system" as const,
          referencedTaskId: ids.taskBooking,
          createdAt: thirtyMinAgo,
        },
        {
          id: ids.msg4,
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: "A scanned copy in PDF format works perfectly!",
          type: "text" as const,
          createdAt: thirtyMinAgo,
        },

        // ===== WORKSPACE 2: System messages (1 day ago) =====
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: "Workspace created",
          type: "system" as const,
          createdAt: oneDayAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: "Sarah Chen joined as Account Manager",
          type: "system" as const,
          createdAt: oneDayAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: "Marcus Johnson joined as User",
          type: "system" as const,
          createdAt: oneDayAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: 'Task "Submit Q1 Financial Summary" created and assigned to Marcus Johnson',
          type: "system" as const,
          referencedTaskId: ids.taskForm2,
          createdAt: oneDayAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: 'Task "Acknowledge Audit Guidelines" created and assigned to Marcus Johnson, Sarah Chen',
          type: "system" as const,
          referencedTaskId: ids.taskAck2,
          createdAt: oneDayAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: 'Task "Approve Q1 Financial Report" created and assigned to Admin User',
          type: "system" as const,
          referencedTaskId: ids.taskApproval2,
          createdAt: oneDayAgoMsg,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: "Q1_Audit_Guidelines.pdf uploaded",
          type: "system" as const,
          referencedFileId: ids.file3,
          createdAt: oneDayAgoMsg,
        },

        // ===== WORKSPACE 2: Today - User messages and task events =====
        {
          id: ids.msg5,
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content:
            "Hi team, the Q1 audit workspace is ready. Please acknowledge the guidelines first and then fill in the financial summary.",
          type: "text" as const,
          createdAt: twentyMinAgo,
        },
        // Approval completed
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content: "Admin User completed Approve Q1 Financial Report",
          type: "system" as const,
          referencedTaskId: ids.taskApproval2,
          createdAt: fiveMinAgo,
        },
        {
          id: ids.msg6,
          workspaceId: ids.workspace2,
          userId: ids.user1,
          content: "Will do. I should have the numbers ready by end of week.",
          type: "text" as const,
          createdAt: fiveMinAgo,
        },
      ])
      .execute();

    console.log("  Created messages with system event logs.");

    // =====================
    // NOTIFICATIONS
    // =====================
    await db
      .insertInto("notification")
      .values([
        {
          id: uuid(),
          userId: ids.user1,
          workspaceId: ids.workspace1,
          type: "task_assigned",
          title: "New task assigned",
          body: 'You have been assigned to "Complete Company Information Form"',
          data: { taskId: ids.taskForm },
          read: false,
        },
        {
          id: uuid(),
          userId: ids.user2,
          workspaceId: ids.workspace1,
          type: "task_assigned",
          title: "New task assigned",
          body: 'You have been assigned to "Upload Business License"',
          data: { taskId: ids.taskFileReq },
          read: false,
        },
        {
          id: uuid(),
          userId: ids.user1,
          workspaceId: ids.workspace1,
          type: "comment_added",
          title: "New comment",
          body: 'Sarah Chen commented on "Complete Company Information Form"',
          data: { taskId: ids.taskForm, commentId: ids.comment1 },
          read: true,
          readAt: thirtyMinAgo,
        },
        {
          id: uuid(),
          userId: ids.user1,
          workspaceId: ids.workspace2,
          type: "task_assigned",
          title: "New task assigned",
          body: 'You have been assigned to "Submit Q1 Financial Summary"',
          data: { taskId: ids.taskForm2 },
          read: false,
        },
      ])
      .execute();

    console.log("  Created 4 notifications.");

    // =====================
    // REMINDERS
    // =====================
    await db
      .insertInto("reminder")
      .values([
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          taskId: ids.taskForm,
          type: "before_due" as const,
          offsetMinutes: 1440, // 24 hours before
          enabled: true,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          taskId: ids.taskEsign,
          type: "before_due" as const,
          offsetMinutes: 2880, // 48 hours before
          enabled: true,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          taskId: null,
          type: "before_due" as const,
          offsetMinutes: 4320, // 3 days before workspace due date
          enabled: true,
        },
      ])
      .execute();

    console.log("  Created 3 reminders.");

    // =====================
    // COMPREHENSIVE AUDIT LOG ENTRIES
    // =====================
    // Timeline: workspace1 created 3 days ago, workspace2 created 1 day ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const threeDaysAgoPlus5m = new Date(threeDaysAgo.getTime() + 5 * 60 * 1000);
    const threeDaysAgoPlus10m = new Date(threeDaysAgo.getTime() + 10 * 60 * 1000);
    const threeDaysAgoPlus15m = new Date(threeDaysAgo.getTime() + 15 * 60 * 1000);
    const threeDaysAgoPlus20m = new Date(threeDaysAgo.getTime() + 20 * 60 * 1000);
    const threeDaysAgoPlus25m = new Date(threeDaysAgo.getTime() + 25 * 60 * 1000);
    const threeDaysAgoPlus30m = new Date(threeDaysAgo.getTime() + 30 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const oneDayAgoPlus5m = new Date(oneDayAgo.getTime() + 5 * 60 * 1000);
    const oneDayAgoPlus10m = new Date(oneDayAgo.getTime() + 10 * 60 * 1000);
    const oneDayAgoPlus15m = new Date(oneDayAgo.getTime() + 15 * 60 * 1000);
    // Yesterday timestamps for workflow progression
    const yesterdayMorning = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayAfternoon = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const auditEntries = [
      // ===== WORKSPACE 1: Created 3 days ago =====
      // Workspace creation
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "workspace.created",
        actorId: ids.adminUser,
        metadata: { name: "Acme Corp Onboarding", description: "Client onboarding workflow for Acme Corporation" },
        source: "web",
        createdAt: threeDaysAgo,
      },
      // Members added
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "workspace.member_added",
        actorId: ids.adminUser,
        metadata: { userId: ids.accountManager, role: "user", email: "sarah@example.com" },
        source: "web",
        createdAt: threeDaysAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "workspace.member_added",
        actorId: ids.adminUser,
        metadata: { userId: ids.user1, role: "user", email: "marcus@example.com" },
        source: "web",
        createdAt: threeDaysAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "workspace.member_added",
        actorId: ids.adminUser,
        metadata: { userId: ids.user2, role: "user", email: "emily@example.com" },
        source: "web",
        createdAt: threeDaysAgo,
      },
      // Sections created
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "section.created",
        actorId: ids.accountManager,
        metadata: { sectionId: ids.w1Section1, title: "Getting Started", position: 0 },
        source: "web",
        createdAt: threeDaysAgoPlus5m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "section.created",
        actorId: ids.accountManager,
        metadata: { sectionId: ids.w1Section2, title: "Documents & Signing", position: 1 },
        source: "web",
        createdAt: threeDaysAgoPlus5m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "section.created",
        actorId: ids.accountManager,
        metadata: { sectionId: ids.w1Section3, title: "Final Review", position: 2 },
        source: "web",
        createdAt: threeDaysAgoPlus5m,
      },
      // Tasks created in Section 1
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskForm,
        eventType: "task.created",
        actorId: ids.accountManager,
        metadata: { title: "Complete Company Information Form", type: "FORM", sectionId: ids.w1Section1 },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskForm,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.user1, assigneeName: "Marcus Johnson" },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskForm,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.user2, assigneeName: "Emily Rivera" },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskAck,
        eventType: "task.created",
        actorId: ids.accountManager,
        metadata: { title: "Acknowledge Terms of Service", type: "ACKNOWLEDGEMENT", sectionId: ids.w1Section1 },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskAck,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.user1, assigneeName: "Marcus Johnson" },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskAck,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.user2, assigneeName: "Emily Rivera" },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskBooking,
        eventType: "task.created",
        actorId: ids.accountManager,
        metadata: { title: "Schedule Kickoff Meeting", type: "TIME_BOOKING", sectionId: ids.w1Section1 },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskBooking,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.user1, assigneeName: "Marcus Johnson" },
        source: "web",
        createdAt: threeDaysAgoPlus10m,
      },
      // Tasks created in Section 2
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskEsign,
        eventType: "task.created",
        actorId: ids.accountManager,
        metadata: { title: "Sign Service Agreement", type: "E_SIGN", sectionId: ids.w1Section2 },
        source: "web",
        createdAt: threeDaysAgoPlus15m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskEsign,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.user1, assigneeName: "Marcus Johnson" },
        source: "web",
        createdAt: threeDaysAgoPlus15m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskFileReq,
        eventType: "task.created",
        actorId: ids.accountManager,
        metadata: { title: "Upload Business License", type: "FILE_REQUEST", sectionId: ids.w1Section2 },
        source: "web",
        createdAt: threeDaysAgoPlus15m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskFileReq,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.user2, assigneeName: "Emily Rivera" },
        source: "web",
        createdAt: threeDaysAgoPlus15m,
      },
      // Tasks created in Section 3
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskApproval,
        eventType: "task.created",
        actorId: ids.accountManager,
        metadata: { title: "Approve Client Onboarding", type: "APPROVAL", sectionId: ids.w1Section3 },
        source: "web",
        createdAt: threeDaysAgoPlus20m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskApproval,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.adminUser, assigneeName: "Admin User" },
        source: "web",
        createdAt: threeDaysAgoPlus20m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskApproval,
        eventType: "task.assigned",
        actorId: ids.accountManager,
        metadata: { assigneeId: ids.accountManager, assigneeName: "Sarah Chen" },
        source: "web",
        createdAt: threeDaysAgoPlus20m,
      },
      // Dependencies created
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskEsign,
        eventType: "dependency.created",
        actorId: ids.accountManager,
        metadata: { dependsOnTaskId: ids.taskForm, dependsOnTitle: "Complete Company Information Form", type: "unlock" },
        source: "web",
        createdAt: threeDaysAgoPlus25m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskApproval,
        eventType: "dependency.created",
        actorId: ids.accountManager,
        metadata: { dependsOnTaskId: ids.taskEsign, dependsOnTitle: "Sign Service Agreement", type: "unlock" },
        source: "web",
        createdAt: threeDaysAgoPlus25m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskApproval,
        eventType: "dependency.created",
        actorId: ids.accountManager,
        metadata: { dependsOnTaskId: ids.taskFileReq, dependsOnTitle: "Upload Business License", type: "unlock" },
        source: "web",
        createdAt: threeDaysAgoPlus25m,
      },
      // Files uploaded by account manager
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "file.uploaded",
        actorId: ids.accountManager,
        metadata: { fileId: ids.file1, fileName: "Service_Agreement_v2.pdf", size: 245000, mimeType: "application/pdf" },
        source: "web",
        createdAt: threeDaysAgoPlus30m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "file.uploaded",
        actorId: ids.accountManager,
        metadata: { fileId: ids.file2, fileName: "Onboarding_Welcome_Pack.pdf", size: 1200000, mimeType: "application/pdf" },
        source: "web",
        createdAt: threeDaysAgoPlus30m,
      },

      // ===== WORKFLOW PROGRESSION: Yesterday =====
      // Acknowledgement task completed by both users
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskAck,
        eventType: "task.acknowledged",
        actorId: ids.user1,
        metadata: { acknowledgedAt: yesterdayMorning.toISOString(), userName: "Marcus Johnson" },
        source: "web",
        createdAt: yesterdayMorning,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskAck,
        eventType: "task.acknowledged",
        actorId: ids.user2,
        metadata: { acknowledgedAt: yesterdayAfternoon.toISOString(), userName: "Emily Rivera" },
        source: "web",
        createdAt: yesterdayAfternoon,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskAck,
        eventType: "task.completed",
        actorId: ids.user2,
        metadata: { completedAt: yesterdayAfternoon.toISOString(), completionRule: "all", allAssigneesCompleted: true },
        source: "system",
        createdAt: yesterdayAfternoon,
      },

      // ===== WORKFLOW PROGRESSION: Today =====
      // Form submitted by user1
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskForm,
        eventType: "form.submitted",
        actorId: ids.user1,
        metadata: {
          submissionId: ids.formSubmission1,
          userName: "Marcus Johnson",
          responses: {
            "Legal Company Name": "Acme Corporation Inc.",
            "Primary Contact Email": "contact@acmecorp.com",
          }
        },
        source: "web",
        createdAt: oneHourAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskForm,
        eventType: "task.assignee_completed",
        actorId: ids.user1,
        metadata: { userName: "Marcus Johnson", completedAt: oneHourAgo.toISOString() },
        source: "system",
        createdAt: oneHourAgo,
      },
      // File uploaded for file request
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskFileReq,
        eventType: "file.uploaded",
        actorId: ids.user2,
        metadata: { fileId: ids.uploadedFile1, fileName: "Business_License_2024.pdf", size: 156000, mimeType: "application/pdf" },
        source: "web",
        createdAt: fortyMinAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskFileReq,
        eventType: "task.assignee_completed",
        actorId: ids.user2,
        metadata: { userName: "Emily Rivera", completedAt: fortyMinAgo.toISOString() },
        source: "system",
        createdAt: fortyMinAgo,
      },
      // Meeting booked
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskBooking,
        eventType: "meeting.booked",
        actorId: ids.user1,
        metadata: {
          meetLink: "https://meet.google.com/abc-defg-hij",
          calendarEventId: "cal_evt_abc123",
          bookedAt: thirtyMinAgo.toISOString(),
          userName: "Marcus Johnson"
        },
        source: "web",
        createdAt: thirtyMinAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskBooking,
        eventType: "task.completed",
        actorId: ids.user1,
        metadata: { completedAt: thirtyMinAgo.toISOString(), completionRule: "any" },
        source: "system",
        createdAt: thirtyMinAgo,
      },
      // Comments
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskForm,
        eventType: "comment.added",
        actorId: ids.accountManager,
        metadata: { commentId: ids.comment1, preview: "Hi team, please make sure to use your legal company name..." },
        source: "web",
        createdAt: oneHourAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: ids.taskForm,
        eventType: "comment.added",
        actorId: ids.user1,
        metadata: { commentId: ids.comment2, preview: "Got it, thanks Sarah!" },
        source: "web",
        createdAt: thirtyMinAgo,
      },

      // ===== WORKSPACE 2: Created 1 day ago =====
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: null,
        eventType: "workspace.created",
        actorId: ids.adminUser,
        metadata: { name: "Q1 Audit Preparation", description: "Internal audit preparation for Q1 financials" },
        source: "web",
        createdAt: oneDayAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: null,
        eventType: "workspace.member_added",
        actorId: ids.adminUser,
        metadata: { userId: ids.accountManager, role: "user", email: "sarah@example.com" },
        source: "web",
        createdAt: oneDayAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: null,
        eventType: "workspace.member_added",
        actorId: ids.adminUser,
        metadata: { userId: ids.user1, role: "user", email: "marcus@example.com" },
        source: "web",
        createdAt: oneDayAgo,
      },
      // Sections
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: null,
        eventType: "section.created",
        actorId: ids.adminUser,
        metadata: { sectionId: ids.w2Section1, title: "Data Collection", position: 0 },
        source: "web",
        createdAt: oneDayAgoPlus5m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: null,
        eventType: "section.created",
        actorId: ids.adminUser,
        metadata: { sectionId: ids.w2Section2, title: "Approvals", position: 1 },
        source: "web",
        createdAt: oneDayAgoPlus5m,
      },
      // Tasks
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskForm2,
        eventType: "task.created",
        actorId: ids.adminUser,
        metadata: { title: "Submit Q1 Financial Summary", type: "FORM", sectionId: ids.w2Section1 },
        source: "web",
        createdAt: oneDayAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskForm2,
        eventType: "task.assigned",
        actorId: ids.adminUser,
        metadata: { assigneeId: ids.user1, assigneeName: "Marcus Johnson" },
        source: "web",
        createdAt: oneDayAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskAck2,
        eventType: "task.created",
        actorId: ids.adminUser,
        metadata: { title: "Acknowledge Audit Guidelines", type: "ACKNOWLEDGEMENT", sectionId: ids.w2Section1 },
        source: "web",
        createdAt: oneDayAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskAck2,
        eventType: "task.assigned",
        actorId: ids.adminUser,
        metadata: { assigneeId: ids.user1, assigneeName: "Marcus Johnson" },
        source: "web",
        createdAt: oneDayAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskAck2,
        eventType: "task.assigned",
        actorId: ids.adminUser,
        metadata: { assigneeId: ids.accountManager, assigneeName: "Sarah Chen" },
        source: "web",
        createdAt: oneDayAgoPlus10m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskApproval2,
        eventType: "task.created",
        actorId: ids.adminUser,
        metadata: { title: "Approve Q1 Financial Report", type: "APPROVAL", sectionId: ids.w2Section2 },
        source: "web",
        createdAt: oneDayAgoPlus15m,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskApproval2,
        eventType: "task.assigned",
        actorId: ids.adminUser,
        metadata: { assigneeId: ids.adminUser, assigneeName: "Admin User" },
        source: "web",
        createdAt: oneDayAgoPlus15m,
      },
      // Dependency
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskApproval2,
        eventType: "dependency.created",
        actorId: ids.adminUser,
        metadata: { dependsOnTaskId: ids.taskForm2, dependsOnTitle: "Submit Q1 Financial Summary", type: "unlock" },
        source: "web",
        createdAt: oneDayAgoPlus15m,
      },
      // File upload
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: null,
        eventType: "file.uploaded",
        actorId: ids.adminUser,
        metadata: { fileId: ids.file3, fileName: "Q1_Audit_Guidelines.pdf", size: 89000, mimeType: "application/pdf" },
        source: "web",
        createdAt: oneDayAgoPlus15m,
      },
      // Today's activity on workspace 2
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskAck2,
        eventType: "task.acknowledged",
        actorId: ids.user1,
        metadata: { acknowledgedAt: tenMinAgo.toISOString(), userName: "Marcus Johnson" },
        source: "web",
        createdAt: tenMinAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskApproval2,
        eventType: "approval.approved",
        actorId: ids.adminUser,
        metadata: {
          decidedAt: fiveMinAgo.toISOString(),
          comments: "Financial figures look good. Approved.",
          userName: "Admin User"
        },
        source: "web",
        createdAt: fiveMinAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: ids.taskApproval2,
        eventType: "comment.added",
        actorId: ids.adminUser,
        metadata: { commentId: ids.comment4, preview: "I'll review as soon as the financial summary is submitted." },
        source: "web",
        createdAt: tenMinAgo,
      },
      // Messages in workspace chat (audit log tracks these too)
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "message.sent",
        actorId: ids.accountManager,
        metadata: { messageId: ids.msg1, preview: "Welcome to the Acme Corp onboarding workspace!" },
        source: "web",
        createdAt: twoHoursAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace1,
        taskId: null,
        eventType: "message.sent",
        actorId: ids.user1,
        metadata: { messageId: ids.msg2, preview: "Thanks Sarah! We'll get started on the forms today." },
        source: "web",
        createdAt: ninetyMinAgo,
      },
      {
        id: uuid(),
        workspaceId: ids.workspace2,
        taskId: null,
        eventType: "message.sent",
        actorId: ids.adminUser,
        metadata: { messageId: ids.msg5, preview: "Hi team, the Q1 audit workspace is ready." },
        source: "web",
        createdAt: twentyMinAgo,
      },
    ];

    await db.insertInto("moxo_audit_log_entry").values(auditEntries).execute();

    console.log(`  Created ${auditEntries.length} audit log entries.`);

    // =====================
    // WORKFLOW STATE DATA
    // =====================

    // Mark taskAck as completed (both users acknowledged)
    await db
      .updateTable("task")
      .set({
        status: "completed",
        completedAt: yesterdayAfternoon,
      })
      .where("id", "=", ids.taskAck)
      .execute();

    // Mark taskBooking as completed (user1 booked a meeting)
    await db
      .updateTable("task")
      .set({
        status: "completed",
        completedAt: thirtyMinAgo,
      })
      .where("id", "=", ids.taskBooking)
      .execute();

    // Mark taskForm as in_progress (user1 submitted, user2 still pending)
    await db
      .updateTable("task")
      .set({ status: "in_progress" })
      .where("id", "=", ids.taskForm)
      .execute();

    // Mark taskAck2 as in_progress (user1 acknowledged, accountManager pending)
    await db
      .updateTable("task")
      .set({ status: "in_progress" })
      .where("id", "=", ids.taskAck2)
      .execute();

    console.log("  Updated task statuses (2 completed, 2 in_progress).");

    // =====================
    // TASK ASSIGNEE COMPLETIONS
    // =====================

    // taskAck - both users completed
    await db
      .updateTable("task_assignee")
      .set({ status: "completed", completedAt: yesterdayMorning })
      .where("taskId", "=", ids.taskAck)
      .where("userId", "=", ids.user1)
      .execute();

    await db
      .updateTable("task_assignee")
      .set({ status: "completed", completedAt: yesterdayAfternoon })
      .where("taskId", "=", ids.taskAck)
      .where("userId", "=", ids.user2)
      .execute();

    // taskBooking - user1 completed
    await db
      .updateTable("task_assignee")
      .set({ status: "completed", completedAt: thirtyMinAgo })
      .where("taskId", "=", ids.taskBooking)
      .where("userId", "=", ids.user1)
      .execute();

    // taskForm - user1 completed (submitted form)
    await db
      .updateTable("task_assignee")
      .set({ status: "completed", completedAt: oneHourAgo })
      .where("taskId", "=", ids.taskForm)
      .where("userId", "=", ids.user1)
      .execute();

    // taskAck2 - user1 completed
    await db
      .updateTable("task_assignee")
      .set({ status: "completed", completedAt: tenMinAgo })
      .where("taskId", "=", ids.taskAck2)
      .where("userId", "=", ids.user1)
      .execute();

    console.log("  Updated task assignee completions.");

    // =====================
    // FORM SUBMISSIONS
    // =====================
    await db
      .insertInto("form_submission")
      .values([
        {
          id: ids.formSubmission1,
          formConfigId: ids.formConfig1,
          userId: ids.user1,
          status: "submitted",
          submittedAt: oneHourAgo,
        },
        {
          id: ids.formSubmission2,
          formConfigId: ids.formConfig1,
          userId: ids.user2,
          status: "draft",
          submittedAt: null,
        },
      ])
      .execute();

    // Form field responses for user1's submitted form
    await db
      .insertInto("form_field_response")
      .values([
        {
          id: ids.fieldResponse1,
          submissionId: ids.formSubmission1,
          elementId: ids.formElement1,
          value: JSON.stringify("Acme Corporation Inc."),
        },
        {
          id: ids.fieldResponse2,
          submissionId: ids.formSubmission1,
          elementId: ids.formElement2,
          value: JSON.stringify("contact@acmecorp.com"),
        },
        {
          id: ids.fieldResponse3,
          submissionId: ids.formSubmission1,
          elementId: ids.formElement3,
          value: JSON.stringify("+1 (555) 123-4567"),
        },
        {
          id: ids.fieldResponse4,
          submissionId: ids.formSubmission1,
          elementId: ids.formElement4,
          value: JSON.stringify("123 Business Park Drive, Suite 400, San Francisco, CA 94105"),
        },
      ])
      .execute();

    console.log("  Created 2 form submissions with 4 field responses.");

    // =====================
    // ACKNOWLEDGEMENTS
    // =====================
    await db
      .insertInto("acknowledgement")
      .values([
        {
          id: ids.ack1,
          configId: ids.ackConfig1,
          userId: ids.user1,
          status: "acknowledged",
          acknowledgedAt: yesterdayMorning,
        },
        {
          id: ids.ack2,
          configId: ids.ackConfig1,
          userId: ids.user2,
          status: "acknowledged",
          acknowledgedAt: yesterdayAfternoon,
        },
        {
          id: ids.ack3,
          configId: ids.ackConfig2,
          userId: ids.user1,
          status: "acknowledged",
          acknowledgedAt: tenMinAgo,
        },
      ])
      .execute();

    console.log("  Created 3 acknowledgements.");

    // =====================
    // BOOKINGS
    // =====================
    await db
      .insertInto("booking")
      .values({
        id: ids.booking1,
        configId: ids.bookingConfig1,
        userId: ids.user1,
        status: "booked",
        calendarEventId: "cal_evt_abc123",
        meetLink: "https://meet.google.com/abc-defg-hij",
        bookedAt: thirtyMinAgo,
      })
      .execute();

    console.log("  Created 1 booking.");

    // =====================
    // FILE UPLOADED FOR FILE REQUEST
    // =====================
    await db
      .insertInto("file")
      .values({
        id: ids.uploadedFile1,
        workspaceId: ids.workspace1,
        uploadedBy: ids.user2,
        name: "Business_License_2024.pdf",
        mimeType: "application/pdf",
        size: 156_000,
        storageKey: `workspaces/${ids.workspace1}/files/business-license-2024.pdf`,
        sourceType: "task_attachment" as const,
        sourceTaskId: ids.taskFileReq,
      })
      .execute();

    // Mark file request task as completed since Emily submitted files
    // (completionRule is "any" and Emily is the only assignee who completed)
    await db
      .updateTable("task")
      .set({ status: "completed", completedAt: fortyMinAgo })
      .where("id", "=", ids.taskFileReq)
      .execute();

    await db
      .updateTable("task_assignee")
      .set({ status: "completed", completedAt: fortyMinAgo })
      .where("taskId", "=", ids.taskFileReq)
      .where("userId", "=", ids.user2)
      .execute();

    console.log("  Created 1 uploaded file for file request.");

    // =====================
    // APPROVER DECISIONS (workspace 2)
    // =====================
    // Note: We can't easily update approvers inserted earlier since IDs are uuid()
    // So we'll update by configId and userId
    // For taskApproval2, admin has approved
    await db
      .updateTable("approver")
      .set({
        status: "approved",
        decidedAt: fiveMinAgo,
        comments: "Financial figures look good. Approved.",
      })
      .where("configId", "=", ids.approvalConfig2)
      .where("userId", "=", ids.adminUser)
      .execute();

    console.log("  Updated 1 approver decision.");

    // =====================
    // PENDING INVITATIONS
    // =====================
    const oneWeekFromNowDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db
      .insertInto("pending_invitation")
      .values([
        {
          id: ids.invitation1,
          workspaceId: ids.workspace1,
          email: "newclient@acmecorp.com",
          role: "user",
          token: "inv_" + uuid().replace(/-/g, ""),
          expiresAt: oneWeekFromNowDate,
          invitedBy: ids.accountManager,
        },
        {
          id: ids.invitation2,
          workspaceId: ids.workspace2,
          email: "finance@company.com",
          role: "user",
          token: "inv_" + uuid().replace(/-/g, ""),
          expiresAt: oneWeekFromNowDate,
          invitedBy: ids.adminUser,
        },
      ])
      .execute();

    console.log("  Created 2 pending invitations.");

    console.log("\nSeed complete!");
  } catch (error) {
    console.error("Exception seeding database:", error);
    process.exit(1);
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
