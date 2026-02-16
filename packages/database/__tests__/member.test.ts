import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { memberService } from "../services/member";

describe("MemberService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdMemberIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
    for (const id of createdMemberIds) {
      await database.deleteFrom("workspace_member").where("id", "=", id).execute();
    }
    for (const id of createdWorkspaceIds) {
      await database.deleteFrom("workspace").where("id", "=", id).execute();
    }
    for (const id of createdUserIds) {
      await database.deleteFrom("user").where("id", "=", id).execute();
    }
  });

  // Helper to create a test user
  async function createTestUser() {
    const user = await database
      .insertInto("user")
      .values({
        name: `Test User ${Date.now()}`,
        email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        emailVerified: false,
        banned: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    createdUserIds.push(user.id);
    return user;
  }

  // Helper to create a workspace
  async function createTestWorkspace() {
    const workspace = await workspaceService.create({ name: `Member Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);
    return workspace;
  }

  describe("addMember", () => {
    it("should add a member with admin role", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "admin",
      });
      createdMemberIds.push(member.id);

      expect(member.id).toBeDefined();
      expect(member.workspaceId).toBe(workspace.id);
      expect(member.userId).toBe(user.id);
      expect(member.role).toBe("admin");
    });

    it("should add a member with account_manager role", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "account_manager",
      });
      createdMemberIds.push(member.id);

      expect(member.role).toBe("account_manager");
    });

    it("should add a member with user role", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      expect(member.role).toBe("user");
    });

    it("should reject duplicate member (same workspace and user)", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      // Try to add same user again
      await expect(
        memberService.addMember({
          workspaceId: workspace.id,
          userId: user.id,
          role: "admin",
        })
      ).rejects.toThrow();
    });

    it("should allow same user in different workspaces", async () => {
      const workspace1 = await createTestWorkspace();
      const workspace2 = await createTestWorkspace();
      const user = await createTestUser();

      const member1 = await memberService.addMember({
        workspaceId: workspace1.id,
        userId: user.id,
        role: "admin",
      });
      createdMemberIds.push(member1.id);

      const member2 = await memberService.addMember({
        workspaceId: workspace2.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member2.id);

      expect(member1.id).not.toBe(member2.id);
      expect(member1.role).toBe("admin");
      expect(member2.role).toBe("user");
    });
  });

  describe("removeMember", () => {
    it("should remove a member from workspace", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      // Don't add to cleanup - we're removing it

      const result = await memberService.removeMember(workspace.id, user.id);
      expect(result).toBe(true);

      // Verify member is gone
      const members = await memberService.getByWorkspaceId(workspace.id);
      expect(members).toHaveLength(0);
    });

    it("should return false for non-existent member", async () => {
      const workspace = await createTestWorkspace();

      const result = await memberService.removeMember(workspace.id, "non-existent-user");
      expect(result).toBe(false);
    });
  });

  describe("updateRole", () => {
    it("should update member role", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      const updated = await memberService.updateRole(workspace.id, user.id, "admin");

      expect(updated).not.toBeNull();
      expect(updated!.role).toBe("admin");
    });

    it("should return null for non-existent member", async () => {
      const workspace = await createTestWorkspace();

      const result = await memberService.updateRole(workspace.id, "non-existent-user", "admin");
      expect(result).toBeNull();
    });

    it("should update from admin to account_manager", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "admin",
      });
      createdMemberIds.push(member.id);

      const updated = await memberService.updateRole(workspace.id, user.id, "account_manager");

      expect(updated!.role).toBe("account_manager");
    });
  });

  describe("getByWorkspaceId", () => {
    it("should return all members for a workspace", async () => {
      const workspace = await createTestWorkspace();
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      const member1 = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user1.id,
        role: "admin",
      });
      createdMemberIds.push(member1.id);

      const member2 = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user2.id,
        role: "account_manager",
      });
      createdMemberIds.push(member2.id);

      const member3 = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user3.id,
        role: "user",
      });
      createdMemberIds.push(member3.id);

      const members = await memberService.getByWorkspaceId(workspace.id);

      expect(members).toHaveLength(3);
    });

    it("should return empty array for workspace with no members", async () => {
      const workspace = await createTestWorkspace();

      const members = await memberService.getByWorkspaceId(workspace.id);

      expect(members).toHaveLength(0);
    });
  });

  describe("getMember", () => {
    it("should get a specific member by workspace and user", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "admin",
      });
      createdMemberIds.push(member.id);

      const found = await memberService.getMember(workspace.id, user.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(member.id);
      expect(found!.role).toBe("admin");
    });

    it("should return null for non-existent member", async () => {
      const workspace = await createTestWorkspace();

      const found = await memberService.getMember(workspace.id, "non-existent-user");

      expect(found).toBeNull();
    });
  });

  describe("isMember", () => {
    it("should return true if user is a member", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      const result = await memberService.isMember(workspace.id, user.id);
      expect(result).toBe(true);
    });

    it("should return false if user is not a member", async () => {
      const workspace = await createTestWorkspace();

      const result = await memberService.isMember(workspace.id, "non-existent-user");
      expect(result).toBe(false);
    });
  });

  describe("hasRole", () => {
    it("should return true if user has the specified role", async () => {
      const workspace = await createTestWorkspace();
      const user = await createTestUser();

      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "admin",
      });
      createdMemberIds.push(member.id);

      expect(await memberService.hasRole(workspace.id, user.id, "admin")).toBe(true);
      expect(await memberService.hasRole(workspace.id, user.id, "user")).toBe(false);
    });

    it("should return false if user is not a member", async () => {
      const workspace = await createTestWorkspace();

      const result = await memberService.hasRole(workspace.id, "non-existent-user", "admin");
      expect(result).toBe(false);
    });
  });

  describe("getWorkspacesForUser", () => {
    it("should return all workspaces a user is a member of", async () => {
      const workspace1 = await createTestWorkspace();
      const workspace2 = await createTestWorkspace();
      const user = await createTestUser();

      const member1 = await memberService.addMember({
        workspaceId: workspace1.id,
        userId: user.id,
        role: "admin",
      });
      createdMemberIds.push(member1.id);

      const member2 = await memberService.addMember({
        workspaceId: workspace2.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member2.id);

      const workspaces = await memberService.getWorkspacesForUser(user.id);

      expect(workspaces).toHaveLength(2);
      expect(workspaces.map(w => w.workspaceId).sort()).toEqual([workspace1.id, workspace2.id].sort());
    });

    it("should return empty array if user has no memberships", async () => {
      const user = await createTestUser();

      const workspaces = await memberService.getWorkspacesForUser(user.id);

      expect(workspaces).toHaveLength(0);
    });
  });
});
