import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  accessService,
  AccessDeniedError,
  NotWorkspaceMemberError,
  InsufficientPermissionsError,
} from "../services/access";
import { memberService } from "../services/member";

// Mock the memberService
vi.mock("../services/member", () => ({
  memberService: {
    getMember: vi.fn(),
    getWorkspacesForUser: vi.fn(),
  },
}));

// Mock the database for getTaskWithAccessCheck
vi.mock("../index", () => ({
  database: {
    selectFrom: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn(),
  },
}));

describe("accessService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireWorkspaceAccess", () => {
    it("should return role when user is a member", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.requireWorkspaceAccess(
        "workspace-1",
        "user-1"
      );

      expect(result).toEqual({ role: "admin" });
    });

    it("should throw NotWorkspaceMemberError when user is not a member", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue(null);

      await expect(
        accessService.requireWorkspaceAccess("workspace-1", "user-1")
      ).rejects.toThrow(NotWorkspaceMemberError);
    });
  });

  describe("requireMinimumRole", () => {
    it("should return role when user has sufficient permissions", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.requireMinimumRole(
        "workspace-1",
        "user-1",
        "account_manager"
      );

      expect(result).toEqual({ role: "admin" });
    });

    it("should throw InsufficientPermissionsError when role is too low", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        accessService.requireMinimumRole("workspace-1", "user-1", "admin")
      ).rejects.toThrow(InsufficientPermissionsError);
    });

    it("should allow user with exact required role", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "account_manager",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.requireMinimumRole(
        "workspace-1",
        "user-1",
        "account_manager"
      );

      expect(result).toEqual({ role: "account_manager" });
    });
  });

  describe("canReadWorkspace", () => {
    it("should return true when user is a member", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canReadWorkspace("workspace-1", "user-1");

      expect(result).toBe(true);
    });

    it("should return false when user is not a member", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue(null);

      const result = await accessService.canReadWorkspace("workspace-1", "user-1");

      expect(result).toBe(false);
    });
  });

  describe("canUpdateWorkspace", () => {
    it("should return true for admin", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canUpdateWorkspace("workspace-1", "user-1");

      expect(result).toBe(true);
    });

    it("should return false for account_manager", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "account_manager",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canUpdateWorkspace("workspace-1", "user-1");

      expect(result).toBe(false);
    });

    it("should return false for user", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canUpdateWorkspace("workspace-1", "user-1");

      expect(result).toBe(false);
    });
  });

  describe("canManageMembers", () => {
    it("should return true for admin", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canManageMembers("workspace-1", "user-1");

      expect(result).toBe(true);
    });

    it("should return false for non-admin", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "account_manager",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canManageMembers("workspace-1", "user-1");

      expect(result).toBe(false);
    });
  });

  describe("canManageSections", () => {
    it("should return true for admin", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canManageSections("workspace-1", "user-1");

      expect(result).toBe(true);
    });

    it("should return true for account_manager", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "account_manager",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canManageSections("workspace-1", "user-1");

      expect(result).toBe(true);
    });

    it("should return false for user", async () => {
      vi.mocked(memberService.getMember).mockResolvedValue({
        id: "member-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await accessService.canManageSections("workspace-1", "user-1");

      expect(result).toBe(false);
    });
  });

  describe("getAccessibleWorkspaces", () => {
    it("should return list of workspace IDs", async () => {
      vi.mocked(memberService.getWorkspacesForUser).mockResolvedValue([
        {
          id: "member-1",
          workspaceId: "workspace-1",
          userId: "user-1",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "member-2",
          workspaceId: "workspace-2",
          userId: "user-1",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await accessService.getAccessibleWorkspaces("user-1");

      expect(result).toEqual(["workspace-1", "workspace-2"]);
    });

    it("should return empty array when user has no memberships", async () => {
      vi.mocked(memberService.getWorkspacesForUser).mockResolvedValue([]);

      const result = await accessService.getAccessibleWorkspaces("user-1");

      expect(result).toEqual([]);
    });
  });
});

describe("Error classes", () => {
  it("AccessDeniedError should have correct name and message", () => {
    const error = new AccessDeniedError("Custom message");
    expect(error.name).toBe("AccessDeniedError");
    expect(error.message).toBe("Custom message");
  });

  it("AccessDeniedError should have default message", () => {
    const error = new AccessDeniedError();
    expect(error.message).toBe("Access denied");
  });

  it("NotWorkspaceMemberError should have correct name", () => {
    const error = new NotWorkspaceMemberError("workspace-1");
    expect(error.name).toBe("NotWorkspaceMemberError");
    expect(error.message).toBe("You are not a member of this workspace");
  });

  it("InsufficientPermissionsError should have correct name and message", () => {
    const error = new InsufficientPermissionsError("admin");
    expect(error.name).toBe("InsufficientPermissionsError");
    expect(error.message).toBe("This action requires admin role or higher");
  });
});
