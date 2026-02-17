import "dotenv/config";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createDb, pool } from "../index";
import type { Database } from "../schemas/main";
import type { Kysely } from "kysely";

// Helper to generate UUIDs
const uuid = () => crypto.randomUUID();

// Pre-generate IDs so we can reference them across tables
const ids = {
  // Users
  adminUser: uuid(),
  accountManager: uuid(),
  user1: uuid(),
  user2: uuid(),

  // Workspaces
  workspace1: uuid(),
  workspace2: uuid(),

  // Sections (workspace 1)
  w1Section1: uuid(),
  w1Section2: uuid(),
  w1Section3: uuid(),
  // Sections (workspace 2)
  w2Section1: uuid(),
  w2Section2: uuid(),

  // Tasks (workspace 1, section 1 - onboarding)
  taskForm: uuid(),
  taskAck: uuid(),
  taskBooking: uuid(),
  // Tasks (workspace 1, section 2 - documents)
  taskEsign: uuid(),
  taskFileReq: uuid(),
  // Tasks (workspace 1, section 3 - review)
  taskApproval: uuid(),
  // Tasks (workspace 2, section 1)
  taskForm2: uuid(),
  taskAck2: uuid(),
  // Tasks (workspace 2, section 2)
  taskApproval2: uuid(),

  // Form configs
  formConfig1: uuid(),
  formConfig2: uuid(),
  formPage1: uuid(),
  formPage2: uuid(),
  formElement1: uuid(),
  formElement2: uuid(),
  formElement3: uuid(),
  formElement4: uuid(),
  formElement5: uuid(),
  formElement6: uuid(),

  // Acknowledgement configs
  ackConfig1: uuid(),
  ackConfig2: uuid(),

  // Time booking config
  bookingConfig1: uuid(),

  // E-sign config
  esignConfig1: uuid(),

  // File request config
  fileReqConfig1: uuid(),

  // Approval configs
  approvalConfig1: uuid(),
  approvalConfig2: uuid(),

  // Files
  file1: uuid(),
  file2: uuid(),
  file3: uuid(),

  // Comments
  comment1: uuid(),
  comment2: uuid(),
  comment3: uuid(),
  comment4: uuid(),

  // Messages
  msg1: uuid(),
  msg2: uuid(),
  msg3: uuid(),
  msg4: uuid(),
  msg5: uuid(),
  msg6: uuid(),
};

async function seed() {
  const env = process.argv[2] || "dev";
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

  console.log(`Seeding ${envLabel} database with mock data...\n`);

  try {
    // =====================
    // USERS (via Better Auth)
    // =====================
    const userData = [
      {
        id: ids.adminUser,
        name: "Admin User",
        username: "admin",
        email: "admin@example.com",
        password: "password123",
      },
      {
        id: ids.accountManager,
        name: "Sarah Chen",
        username: "sarah",
        email: "sarah@example.com",
        password: "password123",
      },
      {
        id: ids.user1,
        name: "Marcus Johnson",
        username: "marcus",
        email: "marcus@example.com",
        password: "password123",
      },
      {
        id: ids.user2,
        name: "Emily Rivera",
        username: "emily",
        email: "emily@example.com",
        password: "password123",
      },
    ];

    const createdUsers: Array<{ id: string; email: string }> = [];

    for (const userInfo of userData) {
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
        const key = Object.entries(ids).find(
          ([, v]) => v === userInfo.id
        )?.[0];
        if (key) {
          (ids as Record<string, string>)[key] = actualId;
        }

        createdUsers.push({ id: actualId, email: userInfo.email });
        console.log(`  Created user: ${userInfo.name} (${userInfo.email})`);
      } catch (error) {
        console.error(`Exception creating user ${userInfo.email}:`, error);
      }
    }

    if (createdUsers.length === 0) {
      console.error("No users created, cannot seed remaining data.");
      process.exit(1);
    }

    console.log(`\n${createdUsers.length} users created.\n`);

    // Update user roles
    await db
      .updateTable("user")
      .set({ role: "admin" })
      .where("id", "=", ids.adminUser)
      .execute();
    await db
      .updateTable("user")
      .set({ role: "account_manager" })
      .where("id", "=", ids.accountManager)
      .execute();

    console.log("  Updated user roles.\n");

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
    await db
      .insertInto("workspace_member")
      .values([
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
          role: "account_manager" as const,
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
          role: "account_manager" as const,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          userId: ids.user1,
          role: "user" as const,
        },
      ])
      .execute();

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
    // MESSAGES (workspace chat)
    // =====================
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const ninetyMinAgo = new Date(now.getTime() - 90 * 60 * 1000);
    const fortyMinAgo = new Date(now.getTime() - 40 * 60 * 1000);
    const twentyMinAgo = new Date(now.getTime() - 20 * 60 * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    await db
      .insertInto("message")
      .values([
        // Workspace 1 chat
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
        {
          id: ids.msg3,
          workspaceId: ids.workspace1,
          userId: ids.user2,
          content:
            "Quick question — for the business license upload, do you need the original or is a scanned copy fine?",
          type: "text" as const,
          createdAt: fortyMinAgo,
        },
        {
          id: ids.msg4,
          workspaceId: ids.workspace1,
          userId: ids.accountManager,
          content: "A scanned copy in PDF format works perfectly!",
          type: "text" as const,
          createdAt: thirtyMinAgo,
        },
        // Workspace 2 chat
        {
          id: ids.msg5,
          workspaceId: ids.workspace2,
          userId: ids.adminUser,
          content:
            "Hi team, the Q1 audit workspace is ready. Please acknowledge the guidelines first and then fill in the financial summary.",
          type: "text" as const,
          createdAt: twentyMinAgo,
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

    console.log("  Created 6 messages.");

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
    // AUDIT LOG ENTRIES
    // =====================
    await db
      .insertInto("moxo_audit_log_entry")
      .values([
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          taskId: null,
          eventType: "workspace.created",
          actorId: ids.adminUser,
          metadata: { name: "Acme Corp Onboarding" },
          source: "web",
          createdAt: twoHoursAgo,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          taskId: ids.taskForm,
          eventType: "task.created",
          actorId: ids.accountManager,
          metadata: { title: "Complete Company Information Form" },
          source: "web",
          createdAt: twoHoursAgo,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace1,
          taskId: ids.taskForm,
          eventType: "task.assignee_added",
          actorId: ids.accountManager,
          metadata: { assigneeId: ids.user1 },
          source: "web",
          createdAt: twoHoursAgo,
        },
        {
          id: uuid(),
          workspaceId: ids.workspace2,
          taskId: null,
          eventType: "workspace.created",
          actorId: ids.adminUser,
          metadata: { name: "Q1 Audit Preparation" },
          source: "web",
          createdAt: twentyMinAgo,
        },
      ])
      .execute();

    console.log("  Created 4 audit log entries.");

    console.log("\nSeed complete!");
  } catch (error) {
    console.error("Exception seeding database:", error);
    process.exit(1);
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
