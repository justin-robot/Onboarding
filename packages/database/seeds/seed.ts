import * as dotenv from "dotenv";
import * as path from "path";

// Load env from project root (handles running from packages/database)
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createDb } from "../index";
import type { Database } from "../schemas/main";
import type { Kysely } from "kysely";

// Create a direct pool for BetterAuth (the proxy pool from index.ts doesn't work with BetterAuth's async init)
const pool = new Pool({ connectionString: process.env.DATABASE_URL_DEV });

// =====================
// CONFIGURATION
// =====================

const uuid = () => crypto.randomUUID();

// Fixed UUIDs for reproducible seed data
const ids = {
  // Users (will be updated with actual IDs from Better Auth)
  platformAdmin: "00000000-0000-0000-0000-000000000001",
  manager1: "00000000-0000-0000-0000-000000000002",
  member1: "00000000-0000-0000-0000-000000000003",
  member2: "00000000-0000-0000-0000-000000000004",
  member3: "00000000-0000-0000-0000-000000000005",

  // Scenario A: Template Workspace
  templateWorkspace: "11111111-1111-1111-1111-111111111100",
  templateSection1: "22222222-2222-2222-2222-222222220100",
  templateSection2: "22222222-2222-2222-2222-222222220101",
  templateSection3: "22222222-2222-2222-2222-222222220102",
  templateTaskForm: "33333333-3333-3333-3333-333333330100",
  templateTaskAck: "33333333-3333-3333-3333-333333330101",
  templateTaskBooking: "33333333-3333-3333-3333-333333330102",
  templateTaskEsign: "33333333-3333-3333-3333-333333330103",
  templateTaskFileReq: "33333333-3333-3333-3333-333333330104",
  templateTaskApproval: "33333333-3333-3333-3333-333333330105",
  templateFormConfig: "44444444-4444-4444-4444-444444440100",
  templateFormPage1: "44444444-4444-4444-4444-444444440101",
  templateFormPage2: "44444444-4444-4444-4444-444444440102",
  templateFormElement1: "44444444-4444-4444-4444-444444440110",
  templateFormElement2: "44444444-4444-4444-4444-444444440111",
  templateFormElement3: "44444444-4444-4444-4444-444444440112",
  templateFormElement4: "44444444-4444-4444-4444-444444440113",
  templateFormElement5: "44444444-4444-4444-4444-444444440114",
  templateFormElement6: "44444444-4444-4444-4444-444444440115",
  templateAckConfig: "55555555-5555-5555-5555-555555550100",
  templateBookingConfig: "66666666-6666-6666-6666-666666660100",
  templateEsignConfig: "77777777-7777-7777-7777-777777770100",
  templateEsignFile: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000100",
  templateFileReqConfig: "88888888-8888-8888-8888-888888880100",
  templateApprovalConfig: "99999999-9999-9999-9999-999999990100",

  // Scenario B: Acme Corp Onboarding (from template)
  acmeWorkspace: "11111111-1111-1111-1111-111111111200",
  acmeSection1: "22222222-2222-2222-2222-222222220200",
  acmeSection2: "22222222-2222-2222-2222-222222220201",
  acmeSection3: "22222222-2222-2222-2222-222222220202",
  acmeSectionDeleted: "22222222-2222-2222-2222-222222220203",
  acmeTaskForm: "33333333-3333-3333-3333-333333330200",
  acmeTaskAck: "33333333-3333-3333-3333-333333330201",
  acmeTaskBooking: "33333333-3333-3333-3333-333333330202",
  acmeTaskEsign: "33333333-3333-3333-3333-333333330203",
  acmeTaskFileReq: "33333333-3333-3333-3333-333333330204",
  acmeTaskApproval: "33333333-3333-3333-3333-333333330205",
  acmeTaskDraft: "33333333-3333-3333-3333-333333330206",
  acmeTaskDeleted: "33333333-3333-3333-3333-333333330207",
  acmeFormConfig: "44444444-4444-4444-4444-444444440200",
  acmeFormPage1: "44444444-4444-4444-4444-444444440201",
  acmeFormPage2: "44444444-4444-4444-4444-444444440202",
  acmeFormElement1: "44444444-4444-4444-4444-444444440210",
  acmeFormElement2: "44444444-4444-4444-4444-444444440211",
  acmeFormElement3: "44444444-4444-4444-4444-444444440212",
  acmeFormElement4: "44444444-4444-4444-4444-444444440213",
  acmeFormElement5: "44444444-4444-4444-4444-444444440214",
  acmeFormElement6: "44444444-4444-4444-4444-444444440215",
  acmeAckConfig: "55555555-5555-5555-5555-555555550200",
  acmeBookingConfig: "66666666-6666-6666-6666-666666660200",
  acmeEsignConfig: "77777777-7777-7777-7777-777777770200",
  acmeFileReqConfig: "88888888-8888-8888-8888-888888880200",
  acmeApprovalConfig: "99999999-9999-9999-9999-999999990200",
  acmeFormSubmission1: "dddddddd-dddd-dddd-dddd-dddddd000200",
  acmeFormSubmission2: "dddddddd-dddd-dddd-dddd-dddddd000201",
  acmeFolder1: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000200",
  acmeFile1: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000201",
  acmeFile2: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000202",
  acmeFile3: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000203",
  acmeFile4: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000204",
  acmeEsignFile: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000205",
  acmeUploadedFile: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaa000206",
  acmeMsg1: "cccccccc-cccc-cccc-cccc-cccccc000200",
  acmeMsg2: "cccccccc-cccc-cccc-cccc-cccccc000201",
  acmeMsg3: "cccccccc-cccc-cccc-cccc-cccccc000202",
  acmeMsg4: "cccccccc-cccc-cccc-cccc-cccccc000203",
  acmeMsg5: "cccccccc-cccc-cccc-cccc-cccccc000204",
  acmeMsgReply: "cccccccc-cccc-cccc-cccc-cccccc000205",
  acmeMsgAnnotation: "cccccccc-cccc-cccc-cccc-cccccc000206",
  acmeComment1: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbb000200",
  acmeComment2: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbb000201",
  acmeComment3: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbb000202",
  acmeAck1: "ffffffff-ffff-ffff-ffff-ffffff000200",
  acmeAck2: "ffffffff-ffff-ffff-ffff-ffffff000201",
  acmeBooking1: "10101010-1010-1010-1010-101010100200",

  // Scenario C: Q1 Audit (In-Progress)
  auditWorkspace: "11111111-1111-1111-1111-111111111300",
  auditSection1: "22222222-2222-2222-2222-222222220300",
  auditSection2: "22222222-2222-2222-2222-222222220301",
  auditTaskForm: "33333333-3333-3333-3333-333333330300",
  auditTaskApproval1: "33333333-3333-3333-3333-333333330301",
  auditTaskApproval2: "33333333-3333-3333-3333-333333330302",
  auditFormConfig: "44444444-4444-4444-4444-444444440300",
  auditFormPage: "44444444-4444-4444-4444-444444440301",
  auditFormElement1: "44444444-4444-4444-4444-444444440310",
  auditFormElement2: "44444444-4444-4444-4444-444444440311",
  auditApprovalConfig1: "99999999-9999-9999-9999-999999990300",
  auditApprovalConfig2: "99999999-9999-9999-9999-999999990301",
  auditIntegration: "12121212-1212-1212-1212-121212120300",

  // Scenario D: Draft Workspace
  draftWorkspace: "11111111-1111-1111-1111-111111111400",
  draftSection1: "22222222-2222-2222-2222-222222220400",
  draftTaskForm: "33333333-3333-3333-3333-333333330400",
  draftFormConfig: "44444444-4444-4444-4444-444444440400",
  draftFormPage: "44444444-4444-4444-4444-444444440401",
  draftFormElement1: "44444444-4444-4444-4444-444444440410",

  // Pending invitations
  invitation1: "30303030-3030-3030-3030-303030300001",
  invitation2: "30303030-3030-3030-3030-303030300002",
};

// Cleanup order (children first, respecting FK constraints)
const CLEANUP_ORDER = [
  "moxo_audit_log_entry",
  "pending_invitation",
  "reminder",
  "notification",
  "message",
  "comment",
  "booking",
  "acknowledgement",
  "form_field_response",
  "form_submission",
  "approver",
  "approval_config",
  "file_request_config",
  "esign_config",
  "time_booking_config",
  "acknowledgement_config",
  "form_element",
  "form_page",
  "form_config",
  "file",
  "pending_task_assignee",
  "task_assignee",
  "task_dependency",
  "task",
  "section",
  "workspace_integration",
  "workspace_member",
  "workspace",
  // Users NOT cleaned - managed by Better Auth
] as const;

// Date helpers
const now = new Date();
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

// =====================
// MAIN SEED FUNCTION
// =====================

async function seed() {
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
      sendVerificationEmail: async () => {},
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
    },
    plugins: [admin()],
  });

  const db = createDb(adminUrl) as Kysely<Database>;
  const envLabel = env === "prod" ? "production" : "development";

  console.log(`Seeding ${envLabel} database with comprehensive test data...`);
  if (noCleanup) {
    console.log("  Mode: --no-cleanup (adding data alongside existing)\n");
  } else {
    console.log("  Mode: full reset (cleaning existing data first)\n");
  }

  try {
    // =====================
    // CLEANUP
    // =====================
    if (!noCleanup) {
      console.log("  Cleaning up existing data...");
      for (const table of CLEANUP_ORDER) {
        await db.deleteFrom(table as keyof Database).execute();
      }
      console.log("  Cleanup complete.\n");
    }

    // =====================
    // USERS (via Better Auth)
    // =====================
    const userData = [
      {
        key: "platformAdmin",
        name: "Platform Admin",
        username: "admin",
        email: "admin@example.com",
        password: "password123",
      },
      {
        key: "manager1",
        name: "Sarah Chen",
        username: "sarah",
        email: "sarah@example.com",
        password: "password123",
      },
      {
        key: "member1",
        name: "Marcus Johnson",
        username: "marcus",
        email: "marcus@example.com",
        password: "password123",
      },
      {
        key: "member2",
        name: "Emily Rivera",
        username: "emily",
        email: "emily@example.com",
        password: "password123",
      },
      {
        key: "member3",
        name: "David Kim",
        username: "david",
        email: "david@example.com",
        password: "password123",
      },
    ];

    const existingUsers = await db
      .selectFrom("user")
      .select(["id", "email"])
      .where("email", "in", userData.map((u) => u.email))
      .execute();

    const existingUserMap = new Map(existingUsers.map((u) => [u.email, u.id]));

    // Check for real user accounts
    const realUsers = await db
      .selectFrom("user")
      .select(["id", "email"])
      .where("email", "in", ["justin@n2o.com", "wiley@n2o.com"])
      .execute();

    for (const user of realUsers) {
      const key = user.email === "justin@n2o.com" ? "realUser" : "wileyUser";
      (ids as Record<string, string>)[key] = user.id;
      console.log(`  Found real user: ${user.email}`);
    }

    const createdUsers: Array<{ id: string; email: string }> = [];

    for (const userInfo of userData) {
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
          console.error(`Error creating user ${userInfo.email}:`, result.error);
          continue;
        }

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

    // Update platform admin role
    await db
      .updateTable("user")
      .set({ role: "admin", isPlatformAdmin: true })
      .where("id", "=", ids.platformAdmin)
      .execute();

    // Set real users as platform admin if they exist
    const wileyId = (ids as Record<string, string>).wileyUser;
    if (wileyId) {
      await db
        .updateTable("user")
        .set({ isPlatformAdmin: true })
        .where("id", "=", wileyId)
        .execute();
    }

    console.log("  Updated user roles.\n");

    // =====================
    // SCENARIO A: TEMPLATE WORKSPACE
    // =====================
    console.log("Creating Scenario A: Client Onboarding Template...");

    await db.insertInto("workspace").values({
      id: ids.templateWorkspace,
      name: "Client Onboarding Template",
      description: "Standard onboarding workflow template for new clients. Includes all required documentation, compliance checks, and approval processes.",
      isTemplate: true,
      isPublished: false,
      hasBeenPublished: false,
      dueDate: null,
    }).execute();

    // Template sections
    await db.insertInto("section").values([
      { id: ids.templateSection1, workspaceId: ids.templateWorkspace, title: "Getting Started", position: 0 },
      { id: ids.templateSection2, workspaceId: ids.templateWorkspace, title: "Documentation", position: 1 },
      { id: ids.templateSection3, workspaceId: ids.templateWorkspace, title: "Final Review", position: 2 },
    ]).execute();

    // Template tasks (all 6 types)
    await db.insertInto("task").values([
      {
        id: ids.templateTaskForm,
        sectionId: ids.templateSection1,
        title: "Complete Company Information Form",
        description: "Fill out company details including legal name, address, and primary contacts.",
        position: 0,
        type: "FORM",
        completionRule: "all",
        dueDateType: "relative",
        dueDateValue: null,
      },
      {
        id: ids.templateTaskAck,
        sectionId: ids.templateSection1,
        title: "Acknowledge Terms of Service",
        description: "Review and acknowledge the terms of service and privacy policy.",
        position: 1,
        type: "ACKNOWLEDGEMENT",
        completionRule: "all",
        dueDateType: "relative",
        dueDateValue: null,
      },
      {
        id: ids.templateTaskBooking,
        sectionId: ids.templateSection1,
        title: "Schedule Kickoff Meeting",
        description: "Book a 30-minute introductory call with your account manager.",
        position: 2,
        type: "TIME_BOOKING",
        completionRule: "any",
        dueDateType: null,
        dueDateValue: null,
      },
      {
        id: ids.templateTaskEsign,
        sectionId: ids.templateSection2,
        title: "Sign Service Agreement",
        description: "Review and electronically sign the service agreement.",
        position: 0,
        type: "E_SIGN",
        completionRule: "all",
        dueDateType: "relative",
        dueDateValue: null,
      },
      {
        id: ids.templateTaskFileReq,
        sectionId: ids.templateSection2,
        title: "Upload Business License",
        description: "Upload a copy of your current business license or certificate of incorporation.",
        position: 1,
        type: "FILE_REQUEST",
        completionRule: "any",
        dueDateType: null,
        dueDateValue: null,
      },
      {
        id: ids.templateTaskApproval,
        sectionId: ids.templateSection3,
        title: "Approve Client Onboarding",
        description: "Final approval of all submitted documents and information.",
        position: 0,
        type: "APPROVAL",
        completionRule: "all",
        dueDateType: "relative",
        dueDateValue: null,
      },
    ]).execute();

    // Template task dependencies (all types)
    await db.insertInto("task_dependency").values([
      { id: uuid(), taskId: ids.templateTaskEsign, dependsOnTaskId: ids.templateTaskForm, type: "unlock" },
      { id: uuid(), taskId: ids.templateTaskApproval, dependsOnTaskId: ids.templateTaskEsign, type: "unlock" },
      { id: uuid(), taskId: ids.templateTaskApproval, dependsOnTaskId: ids.templateTaskFileReq, type: "both", offsetDays: 3 },
      { id: uuid(), taskId: ids.templateTaskBooking, dependsOnTaskId: ids.templateTaskAck, type: "date_anchor", offsetDays: 2 },
    ]).execute();

    // Template form config with validation rules
    await db.insertInto("form_config").values({
      id: ids.templateFormConfig,
      taskId: ids.templateTaskForm,
    }).execute();

    await db.insertInto("form_page").values([
      { id: ids.templateFormPage1, formConfigId: ids.templateFormConfig, title: "Company Details", position: 0 },
      { id: ids.templateFormPage2, formConfigId: ids.templateFormConfig, title: "Contact Information", position: 1 },
    ]).execute();

    await db.insertInto("form_element").values([
      {
        id: ids.templateFormElement1,
        formPageId: ids.templateFormPage1,
        type: "text",
        label: "Legal Company Name",
        placeholder: "e.g. Acme Corporation Inc.",
        required: true,
        position: 0,
        validation: JSON.stringify({ minLength: 2, maxLength: 100 }),
      },
      {
        id: ids.templateFormElement2,
        formPageId: ids.templateFormPage1,
        type: "number",
        label: "Number of Employees",
        placeholder: "e.g. 50",
        required: true,
        position: 1,
        validation: JSON.stringify({ min: 1, max: 100000 }),
      },
      {
        id: ids.templateFormElement3,
        formPageId: ids.templateFormPage1,
        type: "select",
        label: "Company Size",
        required: true,
        position: 2,
        options: JSON.stringify([
          { label: "1-10", value: "1-10" },
          { label: "11-50", value: "11-50" },
          { label: "51-200", value: "51-200" },
          { label: "200+", value: "200+" },
        ]),
      },
      {
        id: ids.templateFormElement4,
        formPageId: ids.templateFormPage2,
        type: "email",
        label: "Primary Contact Email",
        placeholder: "contact@company.com",
        required: true,
        position: 0,
        validation: JSON.stringify({ maxLength: 254 }),
      },
      {
        id: ids.templateFormElement5,
        formPageId: ids.templateFormPage2,
        type: "phone",
        label: "Phone Number",
        placeholder: "+1 (555) 000-0000",
        required: false,
        position: 1,
        validation: JSON.stringify({ pattern: "^\\+?[1-9]\\d{1,14}$" }),
      },
      {
        id: ids.templateFormElement6,
        formPageId: ids.templateFormPage2,
        type: "textarea",
        label: "Business Address",
        placeholder: "Full street address including city, state, and ZIP",
        required: true,
        position: 2,
        validation: JSON.stringify({ minLength: 10, maxLength: 500 }),
      },
    ]).execute();

    // Template other configs
    await db.insertInto("acknowledgement_config").values({
      id: ids.templateAckConfig,
      taskId: ids.templateTaskAck,
      instructions: "By acknowledging below, you confirm that you have read and agree to our Terms of Service and Privacy Policy.",
    }).execute();

    await db.insertInto("time_booking_config").values({
      id: ids.templateBookingConfig,
      taskId: ids.templateTaskBooking,
      bookingLink: "https://cal.com/company/kickoff-meeting",
    }).execute();

    // Template file for e-sign
    await db.insertInto("file").values({
      id: ids.templateEsignFile,
      workspaceId: ids.templateWorkspace,
      uploadedBy: ids.platformAdmin,
      name: "Service_Agreement_Template.pdf",
      mimeType: "application/pdf",
      size: 245000,
      storageKey: `templates/${ids.templateWorkspace}/service-agreement-template.pdf`,
      sourceType: "upload",
    }).execute();

    await db.insertInto("esign_config").values({
      id: ids.templateEsignConfig,
      taskId: ids.templateTaskEsign,
      fileId: ids.templateEsignFile,
      signerEmail: "",
      provider: "signnow",
      status: "pending",
    }).execute();

    await db.insertInto("file_request_config").values({
      id: ids.templateFileReqConfig,
      taskId: ids.templateTaskFileReq,
      targetFolderId: null,
    }).execute();

    await db.insertInto("approval_config").values({
      id: ids.templateApprovalConfig,
      taskId: ids.templateTaskApproval,
    }).execute();

    console.log("  Created template workspace with 3 sections, 6 tasks, and all configs.\n");

    // =====================
    // SCENARIO B: ACME CORP ONBOARDING (from template)
    // =====================
    console.log("Creating Scenario B: Acme Corp Onboarding...");

    await db.insertInto("workspace").values({
      id: ids.acmeWorkspace,
      name: "Acme Corp Onboarding",
      description: "Client onboarding workflow for Acme Corporation — includes compliance docs, team intro, and contract signing.",
      sourceTemplateId: ids.templateWorkspace,
      isTemplate: false,
      isPublished: true,
      hasBeenPublished: true,
      dueDate: daysFromNow(14),
    }).execute();

    // Workspace members (4 members: 2 managers, 2 members)
    const acmeMembers = [
      { userId: ids.platformAdmin, role: "manager" as const },
      { userId: ids.manager1, role: "manager" as const },
      { userId: ids.member1, role: "member" as const },
      { userId: ids.member2, role: "member" as const },
    ];

    // Add real users if they exist
    const realUserId = (ids as Record<string, string>).realUser;
    if (realUserId) {
      acmeMembers.push({ userId: realUserId, role: "manager" as const });
    }
    const wileyUserId = (ids as Record<string, string>).wileyUser;
    if (wileyUserId) {
      acmeMembers.push({ userId: wileyUserId, role: "manager" as const });
    }

    await db.insertInto("workspace_member").values(
      acmeMembers.map((m) => ({
        id: uuid(),
        workspaceId: ids.acmeWorkspace,
        userId: m.userId,
        role: m.role,
      }))
    ).execute();

    // Acme sections (including soft-deleted)
    await db.insertInto("section").values([
      { id: ids.acmeSection1, workspaceId: ids.acmeWorkspace, title: "Getting Started", position: 0 },
      { id: ids.acmeSection2, workspaceId: ids.acmeWorkspace, title: "Documents & Signing", position: 1 },
      { id: ids.acmeSection3, workspaceId: ids.acmeWorkspace, title: "Final Review", position: 2 },
      { id: ids.acmeSectionDeleted, workspaceId: ids.acmeWorkspace, title: "Old Section (Deleted)", position: 3, deletedAt: daysAgo(1) },
    ]).execute();

    // Acme tasks (mixed states: 2 completed, 2 in-progress, 2 not-started, 1 draft, 1 deleted)
    await db.insertInto("task").values([
      {
        id: ids.acmeTaskForm,
        sectionId: ids.acmeSection1,
        title: "Complete Company Information Form",
        description: "Fill out company details including legal name, address, and primary contacts.",
        position: 0,
        type: "FORM",
        status: "in_progress",
        completionRule: "all",
        dueDateType: "absolute",
        dueDateValue: daysFromNow(3),
      },
      {
        id: ids.acmeTaskAck,
        sectionId: ids.acmeSection1,
        title: "Acknowledge Terms of Service",
        description: "Review and acknowledge the terms of service and privacy policy.",
        position: 1,
        type: "ACKNOWLEDGEMENT",
        status: "completed",
        completionRule: "all",
        completedAt: daysAgo(1),
        dueDateType: "absolute",
        dueDateValue: daysFromNow(3),
      },
      {
        id: ids.acmeTaskBooking,
        sectionId: ids.acmeSection1,
        title: "Schedule Kickoff Meeting",
        description: "Book a 30-minute introductory call with your account manager.",
        position: 2,
        type: "TIME_BOOKING",
        status: "completed",
        completionRule: "any",
        completedAt: hoursAgo(2),
        dueDateType: "absolute",
        dueDateValue: daysFromNow(7),
      },
      {
        id: ids.acmeTaskEsign,
        sectionId: ids.acmeSection2,
        title: "Sign Service Agreement",
        description: "Review and electronically sign the service agreement.",
        position: 0,
        type: "E_SIGN",
        status: "not_started",
        completionRule: "all",
        dueDateType: "absolute",
        dueDateValue: daysFromNow(7),
      },
      {
        id: ids.acmeTaskFileReq,
        sectionId: ids.acmeSection2,
        title: "Upload Business License",
        description: "Upload a copy of your current business license or certificate of incorporation.",
        position: 1,
        type: "FILE_REQUEST",
        status: "in_progress",
        completionRule: "any",
        dueDateType: "absolute",
        dueDateValue: daysFromNow(7),
      },
      {
        id: ids.acmeTaskApproval,
        sectionId: ids.acmeSection3,
        title: "Approve Client Onboarding",
        description: "Final approval of all submitted documents and information.",
        position: 0,
        type: "APPROVAL",
        status: "not_started",
        completionRule: "all",
        dueDateType: "absolute",
        dueDateValue: daysFromNow(10),
      },
      {
        id: ids.acmeTaskDraft,
        sectionId: ids.acmeSection3,
        title: "Post-Onboarding Survey",
        description: "Optional feedback survey for the onboarding process.",
        position: 1,
        type: "FORM",
        status: "not_started",
        completionRule: "any",
        isDraft: true,
      },
      {
        id: ids.acmeTaskDeleted,
        sectionId: ids.acmeSectionDeleted,
        title: "Old Task (Deleted)",
        description: "This task was deleted.",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        status: "not_started",
        completionRule: "all",
        deletedAt: daysAgo(1),
      },
    ]).execute();

    // Acme task dependencies
    await db.insertInto("task_dependency").values([
      { id: uuid(), taskId: ids.acmeTaskEsign, dependsOnTaskId: ids.acmeTaskForm, type: "unlock" },
      { id: uuid(), taskId: ids.acmeTaskApproval, dependsOnTaskId: ids.acmeTaskEsign, type: "unlock" },
      { id: uuid(), taskId: ids.acmeTaskApproval, dependsOnTaskId: ids.acmeTaskFileReq, type: "both", offsetDays: 3 },
    ]).execute();

    // Acme task assignees
    await db.insertInto("task_assignee").values([
      { id: uuid(), taskId: ids.acmeTaskForm, userId: ids.member1, status: "completed", completedAt: hoursAgo(1) },
      { id: uuid(), taskId: ids.acmeTaskForm, userId: ids.member2, status: "pending" },
      { id: uuid(), taskId: ids.acmeTaskAck, userId: ids.member1, status: "completed", completedAt: daysAgo(1) },
      { id: uuid(), taskId: ids.acmeTaskAck, userId: ids.member2, status: "completed", completedAt: daysAgo(1) },
      { id: uuid(), taskId: ids.acmeTaskBooking, userId: ids.member1, status: "completed", completedAt: hoursAgo(2) },
      { id: uuid(), taskId: ids.acmeTaskEsign, userId: ids.member1, status: "pending" },
      { id: uuid(), taskId: ids.acmeTaskFileReq, userId: ids.member2, status: "pending" },
      { id: uuid(), taskId: ids.acmeTaskApproval, userId: ids.platformAdmin, status: "pending" },
      { id: uuid(), taskId: ids.acmeTaskApproval, userId: ids.manager1, status: "pending" },
    ]).execute();

    // Pending task assignees (for not-yet-joined users)
    await db.insertInto("pending_task_assignee").values([
      { id: uuid(), taskId: ids.acmeTaskForm, email: "newclient@acmecorp.com", createdBy: ids.manager1 },
      { id: uuid(), taskId: ids.acmeTaskAck, email: "newclient@acmecorp.com", createdBy: ids.manager1 },
      { id: uuid(), taskId: ids.acmeTaskFileReq, email: "legal@acmecorp.com", createdBy: ids.manager1 },
    ]).execute();

    // Acme files (with folder structure and versioning)
    await db.insertInto("file").values([
      // Folder
      {
        id: ids.acmeFolder1,
        workspaceId: ids.acmeWorkspace,
        uploadedBy: ids.manager1,
        name: "Onboarding Documents",
        mimeType: "folder",
        size: 0,
        storageKey: `workspaces/${ids.acmeWorkspace}/folders/onboarding-documents`,
        sourceType: "upload",
      },
      // File v1 (previous version)
      {
        id: ids.acmeFile1,
        workspaceId: ids.acmeWorkspace,
        uploadedBy: ids.manager1,
        name: "Service_Agreement_v1.pdf",
        mimeType: "application/pdf",
        size: 240000,
        storageKey: `workspaces/${ids.acmeWorkspace}/files/service-agreement-v1.pdf`,
        sourceType: "upload",
        folderId: ids.acmeFolder1,
        createdAt: daysAgo(3),
      },
      // File v2 (current version, links to v1)
      {
        id: ids.acmeFile2,
        workspaceId: ids.acmeWorkspace,
        uploadedBy: ids.manager1,
        name: "Service_Agreement_v2.pdf",
        mimeType: "application/pdf",
        size: 245000,
        storageKey: `workspaces/${ids.acmeWorkspace}/files/service-agreement-v2.pdf`,
        sourceType: "upload",
        folderId: ids.acmeFolder1,
        previousVersionId: ids.acmeFile1,
        createdAt: daysAgo(1),
      },
      // Welcome pack
      {
        id: ids.acmeFile3,
        workspaceId: ids.acmeWorkspace,
        uploadedBy: ids.manager1,
        name: "Onboarding_Welcome_Pack.pdf",
        mimeType: "application/pdf",
        size: 1200000,
        storageKey: `workspaces/${ids.acmeWorkspace}/files/onboarding-welcome-pack.pdf`,
        sourceType: "upload",
        folderId: ids.acmeFolder1,
      },
      // Guidelines
      {
        id: ids.acmeFile4,
        workspaceId: ids.acmeWorkspace,
        uploadedBy: ids.manager1,
        name: "Client_Guidelines.pdf",
        mimeType: "application/pdf",
        size: 89000,
        storageKey: `workspaces/${ids.acmeWorkspace}/files/client-guidelines.pdf`,
        sourceType: "upload",
      },
      // E-sign source file
      {
        id: ids.acmeEsignFile,
        workspaceId: ids.acmeWorkspace,
        uploadedBy: ids.manager1,
        name: "Service_Agreement_for_Signing.pdf",
        mimeType: "application/pdf",
        size: 245000,
        storageKey: `workspaces/${ids.acmeWorkspace}/files/service-agreement-signing.pdf`,
        sourceType: "upload",
      },
      // Uploaded file for file request
      {
        id: ids.acmeUploadedFile,
        workspaceId: ids.acmeWorkspace,
        uploadedBy: ids.member2,
        name: "Business_License_2024.pdf",
        mimeType: "application/pdf",
        size: 156000,
        storageKey: `workspaces/${ids.acmeWorkspace}/files/business-license-2024.pdf`,
        sourceType: "task_attachment",
        sourceTaskId: ids.acmeTaskFileReq,
        createdAt: hoursAgo(1),
      },
    ]).execute();

    // Acme form config
    await db.insertInto("form_config").values({
      id: ids.acmeFormConfig,
      taskId: ids.acmeTaskForm,
    }).execute();

    await db.insertInto("form_page").values([
      { id: ids.acmeFormPage1, formConfigId: ids.acmeFormConfig, title: "Company Details", position: 0 },
      { id: ids.acmeFormPage2, formConfigId: ids.acmeFormConfig, title: "Contact Information", position: 1 },
    ]).execute();

    await db.insertInto("form_element").values([
      {
        id: ids.acmeFormElement1,
        formPageId: ids.acmeFormPage1,
        type: "text",
        label: "Legal Company Name",
        placeholder: "e.g. Acme Corporation Inc.",
        required: true,
        position: 0,
        validation: JSON.stringify({ minLength: 2, maxLength: 100 }),
      },
      {
        id: ids.acmeFormElement2,
        formPageId: ids.acmeFormPage1,
        type: "number",
        label: "Number of Employees",
        placeholder: "e.g. 50",
        required: true,
        position: 1,
        validation: JSON.stringify({ min: 1, max: 100000 }),
      },
      {
        id: ids.acmeFormElement3,
        formPageId: ids.acmeFormPage1,
        type: "select",
        label: "Company Size",
        required: true,
        position: 2,
        options: JSON.stringify([
          { label: "1-10", value: "1-10" },
          { label: "11-50", value: "11-50" },
          { label: "51-200", value: "51-200" },
          { label: "200+", value: "200+" },
        ]),
      },
      {
        id: ids.acmeFormElement4,
        formPageId: ids.acmeFormPage2,
        type: "email",
        label: "Primary Contact Email",
        placeholder: "contact@company.com",
        required: true,
        position: 0,
        validation: JSON.stringify({ maxLength: 254 }),
      },
      {
        id: ids.acmeFormElement5,
        formPageId: ids.acmeFormPage2,
        type: "phone",
        label: "Phone Number",
        placeholder: "+1 (555) 000-0000",
        required: false,
        position: 1,
      },
      {
        id: ids.acmeFormElement6,
        formPageId: ids.acmeFormPage2,
        type: "textarea",
        label: "Business Address",
        placeholder: "Full street address including city, state, and ZIP",
        required: true,
        position: 2,
        validation: JSON.stringify({ minLength: 10, maxLength: 500 }),
      },
    ]).execute();

    // Acme form submissions (1 submitted, 1 draft)
    await db.insertInto("form_submission").values([
      {
        id: ids.acmeFormSubmission1,
        formConfigId: ids.acmeFormConfig,
        userId: ids.member1,
        status: "submitted",
        submittedAt: hoursAgo(1),
      },
      {
        id: ids.acmeFormSubmission2,
        formConfigId: ids.acmeFormConfig,
        userId: ids.member2,
        status: "draft",
        submittedAt: null,
      },
    ]).execute();

    // Form field responses for submitted form
    await db.insertInto("form_field_response").values([
      { id: uuid(), submissionId: ids.acmeFormSubmission1, elementId: ids.acmeFormElement1, value: JSON.stringify("Acme Corporation Inc.") },
      { id: uuid(), submissionId: ids.acmeFormSubmission1, elementId: ids.acmeFormElement2, value: JSON.stringify(150) },
      { id: uuid(), submissionId: ids.acmeFormSubmission1, elementId: ids.acmeFormElement3, value: JSON.stringify("51-200") },
      { id: uuid(), submissionId: ids.acmeFormSubmission1, elementId: ids.acmeFormElement4, value: JSON.stringify("contact@acmecorp.com") },
      { id: uuid(), submissionId: ids.acmeFormSubmission1, elementId: ids.acmeFormElement5, value: JSON.stringify("+1 (555) 123-4567") },
      { id: uuid(), submissionId: ids.acmeFormSubmission1, elementId: ids.acmeFormElement6, value: JSON.stringify("123 Business Park Drive, Suite 400, San Francisco, CA 94105") },
    ]).execute();

    // Draft form partial responses
    await db.insertInto("form_field_response").values([
      { id: uuid(), submissionId: ids.acmeFormSubmission2, elementId: ids.acmeFormElement1, value: JSON.stringify("Acme Corp") },
      { id: uuid(), submissionId: ids.acmeFormSubmission2, elementId: ids.acmeFormElement4, value: JSON.stringify("emily@acmecorp.com") },
    ]).execute();

    // Acme other configs
    await db.insertInto("acknowledgement_config").values({
      id: ids.acmeAckConfig,
      taskId: ids.acmeTaskAck,
      instructions: "By acknowledging below, you confirm that you have read and agree to our Terms of Service and Privacy Policy.",
    }).execute();

    await db.insertInto("time_booking_config").values({
      id: ids.acmeBookingConfig,
      taskId: ids.acmeTaskBooking,
      bookingLink: "https://cal.com/moxo/kickoff-meeting",
    }).execute();

    await db.insertInto("esign_config").values({
      id: ids.acmeEsignConfig,
      taskId: ids.acmeTaskEsign,
      fileId: ids.acmeEsignFile,
      signerEmail: "marcus@example.com",
      provider: "signnow",
      status: "pending",
    }).execute();

    await db.insertInto("file_request_config").values({
      id: ids.acmeFileReqConfig,
      taskId: ids.acmeTaskFileReq,
      targetFolderId: ids.acmeFolder1,
    }).execute();

    await db.insertInto("approval_config").values({
      id: ids.acmeApprovalConfig,
      taskId: ids.acmeTaskApproval,
    }).execute();

    await db.insertInto("approver").values([
      { id: uuid(), configId: ids.acmeApprovalConfig, userId: ids.platformAdmin, status: "pending" },
      { id: uuid(), configId: ids.acmeApprovalConfig, userId: ids.manager1, status: "pending" },
    ]).execute();

    // Acme acknowledgements
    await db.insertInto("acknowledgement").values([
      { id: ids.acmeAck1, configId: ids.acmeAckConfig, userId: ids.member1, status: "acknowledged", acknowledgedAt: daysAgo(1) },
      { id: ids.acmeAck2, configId: ids.acmeAckConfig, userId: ids.member2, status: "acknowledged", acknowledgedAt: daysAgo(1) },
    ]).execute();

    // Acme booking
    await db.insertInto("booking").values({
      id: ids.acmeBooking1,
      configId: ids.acmeBookingConfig,
      userId: ids.member1,
      status: "booked",
      calendarEventId: "cal_evt_abc123",
      meetLink: "https://meet.google.com/abc-defg-hij",
      bookedAt: hoursAgo(2),
    }).execute();

    // Acme messages (with threading and all types)
    await db.insertInto("message").values([
      // System messages
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.platformAdmin, content: "Workspace created", type: "system", createdAt: daysAgo(3) },
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.platformAdmin, content: "Sarah Chen joined as Manager", type: "system", createdAt: daysAgo(3) },
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.platformAdmin, content: "Marcus Johnson joined as Member", type: "system", createdAt: daysAgo(3) },
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.platformAdmin, content: "Emily Rivera joined as Member", type: "system", createdAt: daysAgo(3) },
      // Text messages
      { id: ids.acmeMsg1, workspaceId: ids.acmeWorkspace, userId: ids.manager1, content: "Welcome to the Acme Corp onboarding workspace! I've set up all the tasks you'll need to complete.", type: "text", createdAt: daysAgo(2) },
      { id: ids.acmeMsg2, workspaceId: ids.acmeWorkspace, userId: ids.member1, content: "Thanks Sarah! We'll get started on the forms today.", type: "text", createdAt: daysAgo(2) },
      // Task completion system messages
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.member1, content: "Marcus Johnson acknowledged Terms of Service", type: "system", referencedTaskId: ids.acmeTaskAck, createdAt: daysAgo(1) },
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.member2, content: "Emily Rivera acknowledged Terms of Service", type: "system", referencedTaskId: ids.acmeTaskAck, createdAt: daysAgo(1) },
      // More text messages
      { id: ids.acmeMsg3, workspaceId: ids.acmeWorkspace, userId: ids.member2, content: "Quick question — for the business license upload, do you need the original or is a scanned copy fine?", type: "text", createdAt: hoursAgo(3) },
      { id: ids.acmeMsg4, workspaceId: ids.acmeWorkspace, userId: ids.manager1, content: "A scanned copy in PDF format works perfectly!", type: "text", createdAt: hoursAgo(2) },
      // Reply message (threading)
      { id: ids.acmeMsgReply, workspaceId: ids.acmeWorkspace, userId: ids.member2, content: "Great, uploading now!", type: "text", replyToMessageId: ids.acmeMsg4, createdAt: hoursAgo(1) },
      // System message for form submission
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.member1, content: "Marcus Johnson submitted Company Information Form", type: "system", referencedTaskId: ids.acmeTaskForm, createdAt: hoursAgo(1) },
      // System message for meeting booking
      { id: uuid(), workspaceId: ids.acmeWorkspace, userId: ids.member1, content: "Marcus Johnson booked Kickoff Meeting", type: "system", referencedTaskId: ids.acmeTaskBooking, createdAt: hoursAgo(2) },
      // Annotation message
      { id: ids.acmeMsgAnnotation, workspaceId: ids.acmeWorkspace, userId: ids.manager1, content: "Please review the service agreement before signing.", type: "annotation", referencedFileId: ids.acmeEsignFile, createdAt: minutesAgo(30) },
      // Recent text
      { id: ids.acmeMsg5, workspaceId: ids.acmeWorkspace, userId: ids.manager1, content: "Great progress everyone! Just waiting on Emily's form submission and the business license.", type: "text", createdAt: minutesAgo(15) },
    ]).execute();

    // Acme comments (some edited)
    await db.insertInto("comment").values([
      { id: ids.acmeComment1, taskId: ids.acmeTaskForm, userId: ids.manager1, content: "Hi team, please make sure to use your legal company name as it appears on your registration documents.", createdAt: hoursAgo(5), updatedAt: hoursAgo(5) },
      { id: ids.acmeComment2, taskId: ids.acmeTaskForm, userId: ids.member1, content: "Got it, thanks Sarah!", createdAt: hoursAgo(4), updatedAt: hoursAgo(4) },
      { id: ids.acmeComment3, taskId: ids.acmeTaskEsign, userId: ids.manager1, content: "The service agreement has been uploaded and is ready for signing once the form is complete.", createdAt: hoursAgo(3), updatedAt: hoursAgo(2) }, // Edited
    ]).execute();

    // Acme notifications (read/unread mix)
    await db.insertInto("notification").values([
      { id: uuid(), userId: ids.member1, workspaceId: ids.acmeWorkspace, type: "task_assigned", title: "New task assigned", body: 'You have been assigned to "Complete Company Information Form"', data: { taskId: ids.acmeTaskForm }, read: true, readAt: daysAgo(2) },
      { id: uuid(), userId: ids.member2, workspaceId: ids.acmeWorkspace, type: "task_assigned", title: "New task assigned", body: 'You have been assigned to "Upload Business License"', data: { taskId: ids.acmeTaskFileReq }, read: false },
      { id: uuid(), userId: ids.member1, workspaceId: ids.acmeWorkspace, type: "comment_added", title: "New comment", body: 'Sarah Chen commented on "Complete Company Information Form"', data: { taskId: ids.acmeTaskForm, commentId: ids.acmeComment1 }, read: true, readAt: hoursAgo(4) },
      { id: uuid(), userId: ids.member2, workspaceId: ids.acmeWorkspace, type: "task_completed", title: "Task completed", body: 'Marcus Johnson completed "Acknowledge Terms of Service"', data: { taskId: ids.acmeTaskAck }, read: false },
      { id: uuid(), userId: ids.manager1, workspaceId: ids.acmeWorkspace, type: "form_submitted", title: "Form submitted", body: 'Marcus Johnson submitted "Company Information Form"', data: { taskId: ids.acmeTaskForm }, read: false },
    ]).execute();

    // Acme reminders
    await db.insertInto("reminder").values([
      { id: uuid(), workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, type: "before_due", offsetMinutes: 1440, enabled: true },
      { id: uuid(), workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskEsign, type: "before_due", offsetMinutes: 2880, enabled: true },
      { id: uuid(), workspaceId: ids.acmeWorkspace, taskId: null, type: "before_due", offsetMinutes: 4320, enabled: true },
    ]).execute();

    console.log("  Created Acme workspace with members, tasks, files, messages, comments, notifications.\n");

    // =====================
    // SCENARIO C: Q1 AUDIT (In-Progress)
    // =====================
    console.log("Creating Scenario C: Q1 Audit...");

    await db.insertInto("workspace").values({
      id: ids.auditWorkspace,
      name: "Q1 Audit Preparation",
      description: "Internal audit preparation for Q1 financials. All documents must be reviewed and approved before submission.",
      isTemplate: false,
      isPublished: true,
      hasBeenPublished: true,
      dueDate: daysFromNow(30),
    }).execute();

    // Audit members
    await db.insertInto("workspace_member").values([
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.platformAdmin, role: "manager" },
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.manager1, role: "member" },
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.member1, role: "member" },
    ]).execute();

    // Add real users
    if (realUserId) {
      await db.insertInto("workspace_member").values({ id: uuid(), workspaceId: ids.auditWorkspace, userId: realUserId, role: "manager" }).execute();
    }
    if (wileyUserId) {
      await db.insertInto("workspace_member").values({ id: uuid(), workspaceId: ids.auditWorkspace, userId: wileyUserId, role: "manager" }).execute();
    }

    // Audit sections
    await db.insertInto("section").values([
      { id: ids.auditSection1, workspaceId: ids.auditWorkspace, title: "Data Collection", position: 0 },
      { id: ids.auditSection2, workspaceId: ids.auditWorkspace, title: "Approvals", position: 1 },
    ]).execute();

    // Audit tasks (with relative due dates)
    await db.insertInto("task").values([
      {
        id: ids.auditTaskForm,
        sectionId: ids.auditSection1,
        title: "Submit Q1 Financial Summary",
        description: "Complete the financial summary form with Q1 revenue, expenses, and profit figures.",
        position: 0,
        type: "FORM",
        status: "completed",
        completionRule: "all",
        completedAt: daysAgo(2),
        dueDateType: "relative",
        dueDateValue: null,
      },
      {
        id: ids.auditTaskApproval1,
        sectionId: ids.auditSection2,
        title: "Manager Approval",
        description: "Manager review and approval of Q1 financial data.",
        position: 0,
        type: "APPROVAL",
        status: "in_progress",
        completionRule: "all",
        dueDateType: "relative",
        dueDateValue: null,
      },
      {
        id: ids.auditTaskApproval2,
        sectionId: ids.auditSection2,
        title: "Executive Approval",
        description: "Final executive sign-off on Q1 audit package.",
        position: 1,
        type: "APPROVAL",
        status: "not_started",
        completionRule: "all",
        dueDateType: "relative",
        dueDateValue: null,
      },
    ]).execute();

    // Audit task dependencies with date_anchor
    await db.insertInto("task_dependency").values([
      { id: uuid(), taskId: ids.auditTaskApproval1, dependsOnTaskId: ids.auditTaskForm, type: "both", offsetDays: 3 },
      { id: uuid(), taskId: ids.auditTaskApproval2, dependsOnTaskId: ids.auditTaskApproval1, type: "unlock" },
    ]).execute();

    // Audit task assignees
    await db.insertInto("task_assignee").values([
      { id: uuid(), taskId: ids.auditTaskForm, userId: ids.member1, status: "completed", completedAt: daysAgo(2) },
      { id: uuid(), taskId: ids.auditTaskApproval1, userId: ids.manager1, status: "pending" },
      { id: uuid(), taskId: ids.auditTaskApproval2, userId: ids.platformAdmin, status: "pending" },
    ]).execute();

    // Audit form config
    await db.insertInto("form_config").values({
      id: ids.auditFormConfig,
      taskId: ids.auditTaskForm,
    }).execute();

    await db.insertInto("form_page").values({
      id: ids.auditFormPage,
      formConfigId: ids.auditFormConfig,
      title: "Q1 Financial Data",
      position: 0,
    }).execute();

    await db.insertInto("form_element").values([
      { id: ids.auditFormElement1, formPageId: ids.auditFormPage, type: "number", label: "Q1 Revenue ($)", placeholder: "0.00", required: true, position: 0, validation: JSON.stringify({ min: 0 }) },
      { id: ids.auditFormElement2, formPageId: ids.auditFormPage, type: "number", label: "Q1 Expenses ($)", placeholder: "0.00", required: true, position: 1, validation: JSON.stringify({ min: 0 }) },
    ]).execute();

    // Audit approval configs with mixed states
    await db.insertInto("approval_config").values([
      { id: ids.auditApprovalConfig1, taskId: ids.auditTaskApproval1 },
      { id: ids.auditApprovalConfig2, taskId: ids.auditTaskApproval2 },
    ]).execute();

    await db.insertInto("approver").values([
      { id: uuid(), configId: ids.auditApprovalConfig1, userId: ids.manager1, status: "approved", decidedAt: daysAgo(1), comments: "Financial figures verified against source documents." },
      { id: uuid(), configId: ids.auditApprovalConfig1, userId: ids.member1, status: "rejected", decidedAt: hoursAgo(6), comments: "Please double-check the expense figure for March." },
      { id: uuid(), configId: ids.auditApprovalConfig2, userId: ids.platformAdmin, status: "pending" },
    ]).execute();

    // Google Calendar integration
    await db.insertInto("workspace_integration").values({
      id: ids.auditIntegration,
      workspaceId: ids.auditWorkspace,
      provider: "google_calendar",
      accessToken: "encrypted_access_token_placeholder",
      refreshToken: "encrypted_refresh_token_placeholder",
      tokenExpiresAt: daysFromNow(7),
      scope: "https://www.googleapis.com/auth/calendar.events",
      accountEmail: "audit@company.com",
      connectedBy: ids.platformAdmin,
    }).execute();

    // Audit messages
    await db.insertInto("message").values([
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.platformAdmin, content: "Workspace created", type: "system", createdAt: daysAgo(7) },
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.platformAdmin, content: "Hi team, the Q1 audit workspace is ready. Please submit financial data ASAP.", type: "text", createdAt: daysAgo(7) },
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.member1, content: "Marcus Johnson submitted Q1 Financial Summary", type: "system", referencedTaskId: ids.auditTaskForm, createdAt: daysAgo(2) },
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.manager1, content: "Sarah Chen approved Manager Approval", type: "system", referencedTaskId: ids.auditTaskApproval1, createdAt: daysAgo(1) },
      { id: uuid(), workspaceId: ids.auditWorkspace, userId: ids.member1, content: "Please review the March expenses - I think there's a discrepancy.", type: "text", createdAt: hoursAgo(6) },
    ]).execute();

    console.log("  Created Q1 Audit workspace with approval workflow and Google Calendar integration.\n");

    // =====================
    // SCENARIO D: DRAFT WORKSPACE
    // =====================
    console.log("Creating Scenario D: Draft Workspace...");

    await db.insertInto("workspace").values({
      id: ids.draftWorkspace,
      name: "New Client Setup",
      description: "Draft workspace for upcoming client - not yet published.",
      isTemplate: false,
      isPublished: false,
      hasBeenPublished: false,
      dueDate: daysFromNow(21),
    }).execute();

    // Draft workspace member (just the admin)
    await db.insertInto("workspace_member").values({
      id: uuid(),
      workspaceId: ids.draftWorkspace,
      userId: ids.platformAdmin,
      role: "manager",
    }).execute();

    // Draft section
    await db.insertInto("section").values({
      id: ids.draftSection1,
      workspaceId: ids.draftWorkspace,
      title: "Initial Setup",
      position: 0,
    }).execute();

    // Draft task
    await db.insertInto("task").values({
      id: ids.draftTaskForm,
      sectionId: ids.draftSection1,
      title: "Basic Information Form",
      description: "Collect basic client information.",
      position: 0,
      type: "FORM",
      status: "not_started",
      completionRule: "all",
    }).execute();

    // Draft form config
    await db.insertInto("form_config").values({
      id: ids.draftFormConfig,
      taskId: ids.draftTaskForm,
    }).execute();

    await db.insertInto("form_page").values({
      id: ids.draftFormPage,
      formConfigId: ids.draftFormConfig,
      title: "Client Info",
      position: 0,
    }).execute();

    await db.insertInto("form_element").values({
      id: ids.draftFormElement1,
      formPageId: ids.draftFormPage,
      type: "text",
      label: "Client Name",
      placeholder: "Enter client name",
      required: true,
      position: 0,
    }).execute();

    // Pending invitations for draft workspace
    await db.insertInto("pending_invitation").values([
      {
        id: ids.invitation1,
        workspaceId: ids.draftWorkspace,
        email: "newclient@company.com",
        role: "member",
        token: "inv_" + uuid().replace(/-/g, ""),
        expiresAt: daysFromNow(7),
        invitedBy: ids.platformAdmin,
      },
      {
        id: ids.invitation2,
        workspaceId: ids.draftWorkspace,
        email: "expired@company.com",
        role: "member",
        token: "inv_" + uuid().replace(/-/g, ""),
        expiresAt: daysAgo(3), // Expired
        invitedBy: ids.platformAdmin,
      },
    ]).execute();

    console.log("  Created draft workspace with pending invitations.\n");

    // =====================
    // COMPREHENSIVE AUDIT LOG
    // =====================
    console.log("Creating audit log entries...");

    const auditEntries = [
      // Template workspace creation
      { workspaceId: ids.templateWorkspace, taskId: null, eventType: "workspace.created", actorId: ids.platformAdmin, metadata: { name: "Client Onboarding Template", isTemplate: true }, source: "web", createdAt: daysAgo(30) },

      // Acme workspace creation and setup
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "workspace.created", actorId: ids.platformAdmin, metadata: { name: "Acme Corp Onboarding", sourceTemplateId: ids.templateWorkspace }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "workspace.member_added", actorId: ids.platformAdmin, metadata: { userId: ids.manager1, role: "manager", email: "sarah@example.com" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "workspace.member_added", actorId: ids.platformAdmin, metadata: { userId: ids.member1, role: "member", email: "marcus@example.com" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "workspace.member_added", actorId: ids.platformAdmin, metadata: { userId: ids.member2, role: "member", email: "emily@example.com" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "workspace.published", actorId: ids.platformAdmin, metadata: {}, source: "web", createdAt: daysAgo(3) },

      // Acme section creation
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "section.created", actorId: ids.manager1, metadata: { sectionId: ids.acmeSection1, title: "Getting Started" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "section.created", actorId: ids.manager1, metadata: { sectionId: ids.acmeSection2, title: "Documents & Signing" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "section.created", actorId: ids.manager1, metadata: { sectionId: ids.acmeSection3, title: "Final Review" }, source: "web", createdAt: daysAgo(3) },

      // Acme task creation
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, eventType: "task.created", actorId: ids.manager1, metadata: { title: "Complete Company Information Form", type: "FORM" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskAck, eventType: "task.created", actorId: ids.manager1, metadata: { title: "Acknowledge Terms of Service", type: "ACKNOWLEDGEMENT" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskBooking, eventType: "task.created", actorId: ids.manager1, metadata: { title: "Schedule Kickoff Meeting", type: "TIME_BOOKING" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskEsign, eventType: "task.created", actorId: ids.manager1, metadata: { title: "Sign Service Agreement", type: "E_SIGN" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskFileReq, eventType: "task.created", actorId: ids.manager1, metadata: { title: "Upload Business License", type: "FILE_REQUEST" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskApproval, eventType: "task.created", actorId: ids.manager1, metadata: { title: "Approve Client Onboarding", type: "APPROVAL" }, source: "web", createdAt: daysAgo(3) },

      // Task assignments
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, eventType: "task.assigned", actorId: ids.manager1, metadata: { assigneeId: ids.member1, assigneeName: "Marcus Johnson" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, eventType: "task.assigned", actorId: ids.manager1, metadata: { assigneeId: ids.member2, assigneeName: "Emily Rivera" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskAck, eventType: "task.assigned", actorId: ids.manager1, metadata: { assigneeId: ids.member1, assigneeName: "Marcus Johnson" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskAck, eventType: "task.assigned", actorId: ids.manager1, metadata: { assigneeId: ids.member2, assigneeName: "Emily Rivera" }, source: "web", createdAt: daysAgo(3) },

      // File uploads
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "file.uploaded", actorId: ids.manager1, metadata: { fileId: ids.acmeFile1, fileName: "Service_Agreement_v1.pdf" }, source: "web", createdAt: daysAgo(3) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "file.uploaded", actorId: ids.manager1, metadata: { fileId: ids.acmeFile2, fileName: "Service_Agreement_v2.pdf", previousVersionId: ids.acmeFile1 }, source: "web", createdAt: daysAgo(1) },

      // Acknowledgements
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskAck, eventType: "task.acknowledged", actorId: ids.member1, metadata: { userName: "Marcus Johnson" }, source: "web", createdAt: daysAgo(1) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskAck, eventType: "task.acknowledged", actorId: ids.member2, metadata: { userName: "Emily Rivera" }, source: "web", createdAt: daysAgo(1) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskAck, eventType: "task.completed", actorId: ids.member2, metadata: { completionRule: "all" }, source: "system", createdAt: daysAgo(1) },

      // Form submission
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, eventType: "form.submitted", actorId: ids.member1, metadata: { submissionId: ids.acmeFormSubmission1, userName: "Marcus Johnson" }, source: "web", createdAt: hoursAgo(1) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, eventType: "task.assignee_completed", actorId: ids.member1, metadata: { userName: "Marcus Johnson" }, source: "system", createdAt: hoursAgo(1) },

      // Meeting booking
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskBooking, eventType: "meeting.booked", actorId: ids.member1, metadata: { meetLink: "https://meet.google.com/abc-defg-hij", userName: "Marcus Johnson" }, source: "web", createdAt: hoursAgo(2) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskBooking, eventType: "task.completed", actorId: ids.member1, metadata: { completionRule: "any" }, source: "system", createdAt: hoursAgo(2) },

      // Comments
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, eventType: "comment.added", actorId: ids.manager1, metadata: { commentId: ids.acmeComment1 }, source: "web", createdAt: hoursAgo(5) },
      { workspaceId: ids.acmeWorkspace, taskId: ids.acmeTaskForm, eventType: "comment.added", actorId: ids.member1, metadata: { commentId: ids.acmeComment2 }, source: "web", createdAt: hoursAgo(4) },

      // Messages
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "message.sent", actorId: ids.manager1, metadata: { messageId: ids.acmeMsg1 }, source: "web", createdAt: daysAgo(2) },
      { workspaceId: ids.acmeWorkspace, taskId: null, eventType: "message.sent", actorId: ids.member1, metadata: { messageId: ids.acmeMsg2 }, source: "web", createdAt: daysAgo(2) },

      // Audit workspace events
      { workspaceId: ids.auditWorkspace, taskId: null, eventType: "workspace.created", actorId: ids.platformAdmin, metadata: { name: "Q1 Audit Preparation" }, source: "web", createdAt: daysAgo(7) },
      { workspaceId: ids.auditWorkspace, taskId: ids.auditTaskForm, eventType: "task.completed", actorId: ids.member1, metadata: { userName: "Marcus Johnson" }, source: "web", createdAt: daysAgo(2) },
      { workspaceId: ids.auditWorkspace, taskId: ids.auditTaskApproval1, eventType: "approval.approved", actorId: ids.manager1, metadata: { userName: "Sarah Chen", comments: "Verified" }, source: "web", createdAt: daysAgo(1) },
      { workspaceId: ids.auditWorkspace, taskId: ids.auditTaskApproval1, eventType: "approval.rejected", actorId: ids.member1, metadata: { userName: "Marcus Johnson", comments: "Please check March expenses" }, source: "web", createdAt: hoursAgo(6) },
      { workspaceId: ids.auditWorkspace, taskId: null, eventType: "integration.connected", actorId: ids.platformAdmin, metadata: { provider: "google_calendar", accountEmail: "audit@company.com" }, source: "web", createdAt: daysAgo(5) },

      // Draft workspace
      { workspaceId: ids.draftWorkspace, taskId: null, eventType: "workspace.created", actorId: ids.platformAdmin, metadata: { name: "New Client Setup", isPublished: false }, source: "web", createdAt: daysAgo(1) },
      { workspaceId: ids.draftWorkspace, taskId: null, eventType: "invitation.sent", actorId: ids.platformAdmin, metadata: { email: "newclient@company.com", role: "member" }, source: "web", createdAt: daysAgo(1) },
    ];

    await db.insertInto("moxo_audit_log_entry").values(
      auditEntries.map((e) => ({ id: uuid(), ...e }))
    ).execute();

    console.log(`  Created ${auditEntries.length} audit log entries.\n`);

    console.log("Seed complete!");
    console.log("\nSummary:");
    console.log("  - 5 users (1 platform admin, 4 regular)");
    console.log("  - 4 workspaces (1 template, 2 active, 1 draft)");
    console.log("  - 12 sections (including 1 soft-deleted)");
    console.log("  - 14 tasks (all 6 types, various states, 1 draft, 1 deleted)");
    console.log("  - Task dependencies (unlock, date_anchor, both types)");
    console.log("  - Form submissions (draft and submitted)");
    console.log("  - File versioning and folder structure");
    console.log("  - Message threading with all types (text, system, annotation)");
    console.log("  - Approval workflow with mixed states");
    console.log("  - Google Calendar integration");
    console.log("  - Pending invitations (valid and expired)");
  } catch (error) {
    console.error("Exception seeding database:", error);
    process.exit(1);
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
