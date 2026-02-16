import { describe, it, expect, afterAll, vi } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { memberService } from "../services/member";
import { invitationService } from "../services/invitation";

describe("InvitationService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdInvitationIds: string[] = [];
  const createdMemberIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
    for (const id of createdMemberIds) {
      await database.deleteFrom("workspace_member").where("id", "=", id).execute();
    }
    for (const id of createdInvitationIds) {
      await database.deleteFrom("pending_invitation").where("id", "=", id).execute();
    }
    for (const id of createdWorkspaceIds) {
      await database.deleteFrom("workspace").where("id", "=", id).execute();
    }
    for (const id of createdUserIds) {
      await database.deleteFrom("user").where("id", "=", id).execute();
    }
  });

  // Helper to create a test user
  async function createTestUser(email?: string) {
    const user = await database
      .insertInto("user")
      .values({
        name: `Test User ${Date.now()}`,
        email: email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        emailVerified: false,
        banned: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    createdUserIds.push(user.id);
    return user;
  }

  // Helper to create a workspace with an admin
  async function createTestWorkspace() {
    const workspace = await workspaceService.create({ name: `Invitation Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const admin = await createTestUser();
    const member = await memberService.addMember({
      workspaceId: workspace.id,
      userId: admin.id,
      role: "admin",
    });
    createdMemberIds.push(member.id);

    return { workspace, admin };
  }

  describe("create", () => {
    it("should create an invitation with generated token", async () => {
      const { workspace, admin } = await createTestWorkspace();
      const inviteeEmail = `invitee-${Date.now()}@example.com`;

      const result = await invitationService.create({
        workspaceId: workspace.id,
        email: inviteeEmail,
        role: "user",
        invitedBy: admin.id,
      });
      createdInvitationIds.push(result.invitation!.id);

      expect(result.success).toBe(true);
      expect(result.invitation!.workspaceId).toBe(workspace.id);
      expect(result.invitation!.email).toBe(inviteeEmail);
      expect(result.invitation!.role).toBe("user");
      expect(result.invitation!.token).toBeDefined();
      expect(result.invitation!.token.length).toBeGreaterThan(20);
      expect(result.invitation!.invitedBy).toBe(admin.id);
    });

    it("should set expiry to 72 hours from now", async () => {
      const { workspace, admin } = await createTestWorkspace();
      const inviteeEmail = `invitee-${Date.now()}@example.com`;

      const before = Date.now();
      const result = await invitationService.create({
        workspaceId: workspace.id,
        email: inviteeEmail,
        role: "user",
        invitedBy: admin.id,
      });
      createdInvitationIds.push(result.invitation!.id);
      const after = Date.now();

      const expiresAt = result.invitation!.expiresAt.getTime();
      const expectedMin = before + 72 * 60 * 60 * 1000;
      const expectedMax = after + 72 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it("should reject duplicate invitation for same email in workspace", async () => {
      const { workspace, admin } = await createTestWorkspace();
      const inviteeEmail = `invitee-${Date.now()}@example.com`;

      // First invitation
      const result1 = await invitationService.create({
        workspaceId: workspace.id,
        email: inviteeEmail,
        role: "user",
        invitedBy: admin.id,
      });
      createdInvitationIds.push(result1.invitation!.id);

      // Second invitation for same email
      const result2 = await invitationService.create({
        workspaceId: workspace.id,
        email: inviteeEmail,
        role: "admin",
        invitedBy: admin.id,
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toBe("ALREADY_INVITED");
    });

    it("should reject if email is already a member", async () => {
      const { workspace, admin } = await createTestWorkspace();
      const existingUser = await createTestUser();

      // Add as member
      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: existingUser.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      // Try to invite same email
      const result = await invitationService.create({
        workspaceId: workspace.id,
        email: existingUser.email,
        role: "user",
        invitedBy: admin.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("ALREADY_MEMBER");
    });

    it("should allow same email to be invited to different workspaces", async () => {
      const { workspace: workspace1, admin: admin1 } = await createTestWorkspace();
      const { workspace: workspace2, admin: admin2 } = await createTestWorkspace();
      const inviteeEmail = `invitee-${Date.now()}@example.com`;

      const result1 = await invitationService.create({
        workspaceId: workspace1.id,
        email: inviteeEmail,
        role: "user",
        invitedBy: admin1.id,
      });
      createdInvitationIds.push(result1.invitation!.id);

      const result2 = await invitationService.create({
        workspaceId: workspace2.id,
        email: inviteeEmail,
        role: "admin",
        invitedBy: admin2.id,
      });
      createdInvitationIds.push(result2.invitation!.id);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe("getByToken", () => {
    it("should return invitation by token", async () => {
      const { workspace, admin } = await createTestWorkspace();
      const inviteeEmail = `invitee-${Date.now()}@example.com`;

      const result = await invitationService.create({
        workspaceId: workspace.id,
        email: inviteeEmail,
        role: "user",
        invitedBy: admin.id,
      });
      createdInvitationIds.push(result.invitation!.id);

      const found = await invitationService.getByToken(result.invitation!.token);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(result.invitation!.id);
    });

    it("should return null for invalid token", async () => {
      const found = await invitationService.getByToken("invalid-token");
      expect(found).toBeNull();
    });
  });

  describe("redeem", () => {
    it("should create member and delete invitation on valid token", async () => {
      const { workspace, admin } = await createTestWorkspace();
      const inviteeEmail = `invitee-${Date.now()}@example.com`;

      // Create invitation
      const inviteResult = await invitationService.create({
        workspaceId: workspace.id,
        email: inviteeEmail,
        role: "account_manager",
        invitedBy: admin.id,
      });
      // Don't add to cleanup - redeem will delete it

      // Create user account (simulating signup)
      const newUser = await createTestUser(inviteeEmail);

      // Redeem invitation
      const redeemResult = await invitationService.redeem(inviteResult.invitation!.token, newUser.id);
      if (redeemResult.success && redeemResult.member) {
        createdMemberIds.push(redeemResult.member.id);
      }

      expect(redeemResult.success).toBe(true);
      expect(redeemResult.member).toBeDefined();
      expect(redeemResult.member!.workspaceId).toBe(workspace.id);
      expect(redeemResult.member!.userId).toBe(newUser.id);
      expect(redeemResult.member!.role).toBe("account_manager");

      // Verify invitation is deleted
      const found = await invitationService.getByToken(inviteResult.invitation!.token);
      expect(found).toBeNull();
    });

    it("should reject expired token", async () => {
      const { workspace, admin } = await createTestWorkspace();
      const inviteeEmail = `invitee-${Date.now()}@example.com`;

      // Create invitation
      const inviteResult = await invitationService.create({
        workspaceId: workspace.id,
        email: inviteeEmail,
        role: "user",
        invitedBy: admin.id,
      });
      createdInvitationIds.push(inviteResult.invitation!.id);

      // Manually expire the invitation
      await database
        .updateTable("pending_invitation")
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where("id", "=", inviteResult.invitation!.id)
        .execute();

      const newUser = await createTestUser(inviteeEmail);

      // Try to redeem
      const redeemResult = await invitationService.redeem(inviteResult.invitation!.token, newUser.id);

      expect(redeemResult.success).toBe(false);
      expect(redeemResult.error).toBe("EXPIRED");
    });

    it("should reject invalid token", async () => {
      const newUser = await createTestUser();

      const redeemResult = await invitationService.redeem("invalid-token", newUser.id);

      expect(redeemResult.success).toBe(false);
      expect(redeemResult.error).toBe("INVALID_TOKEN");
    });
  });

  describe("getByWorkspaceId", () => {
    it("should return all pending invitations for a workspace", async () => {
      const { workspace, admin } = await createTestWorkspace();

      const invite1 = await invitationService.create({
        workspaceId: workspace.id,
        email: `invitee1-${Date.now()}@example.com`,
        role: "user",
        invitedBy: admin.id,
      });
      createdInvitationIds.push(invite1.invitation!.id);

      const invite2 = await invitationService.create({
        workspaceId: workspace.id,
        email: `invitee2-${Date.now()}@example.com`,
        role: "admin",
        invitedBy: admin.id,
      });
      createdInvitationIds.push(invite2.invitation!.id);

      const invitations = await invitationService.getByWorkspaceId(workspace.id);

      expect(invitations).toHaveLength(2);
    });
  });

  describe("cancel", () => {
    it("should delete an invitation", async () => {
      const { workspace, admin } = await createTestWorkspace();

      const invite = await invitationService.create({
        workspaceId: workspace.id,
        email: `invitee-${Date.now()}@example.com`,
        role: "user",
        invitedBy: admin.id,
      });
      // Don't add to cleanup - we're deleting it

      const deleted = await invitationService.cancel(invite.invitation!.id);
      expect(deleted).toBe(true);

      const found = await invitationService.getByToken(invite.invitation!.token);
      expect(found).toBeNull();
    });

    it("should return false for non-existent invitation", async () => {
      const deleted = await invitationService.cancel("non-existent-id");
      expect(deleted).toBe(false);
    });
  });
});
