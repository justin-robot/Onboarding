import { database } from "../index";
import { memberService } from "./member";
import type { PendingInvitation, WorkspaceMember } from "../schemas/main";
import type { MemberRole } from "./member";
import { randomBytes } from "crypto";

// Result types
export interface CreateInvitationResult {
  success: boolean;
  invitation?: PendingInvitation;
  error?: "ALREADY_INVITED" | "ALREADY_MEMBER";
}

export interface RedeemInvitationResult {
  success: boolean;
  member?: WorkspaceMember;
  error?: "INVALID_TOKEN" | "EXPIRED";
}

// Expiry duration: 72 hours in milliseconds
const INVITATION_EXPIRY_MS = 72 * 60 * 60 * 1000;

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export const invitationService = {
  /**
   * Create a new invitation
   * Does NOT send email - that should be handled by the application layer
   */
  async create(input: {
    workspaceId: string;
    email: string;
    role: MemberRole;
    invitedBy: string;
  }): Promise<CreateInvitationResult> {
    const { workspaceId, email, role, invitedBy } = input;

    // Check if email is already a member (by looking up user by email)
    const existingUser = await database
      .selectFrom("user")
      .select(["id"])
      .where("email", "=", email)
      .executeTakeFirst();

    if (existingUser) {
      const isMember = await memberService.isMember(workspaceId, existingUser.id);
      if (isMember) {
        return { success: false, error: "ALREADY_MEMBER" };
      }
    }

    // Check if there's already a pending invitation for this email in this workspace
    const existingInvitation = await database
      .selectFrom("pending_invitation")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("email", "=", email)
      .executeTakeFirst();

    if (existingInvitation) {
      return { success: false, error: "ALREADY_INVITED" };
    }

    // Generate token and set expiry
    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

    // Create invitation
    const invitation = await database
      .insertInto("pending_invitation")
      .values({
        workspaceId,
        email,
        role,
        token,
        expiresAt,
        invitedBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { success: true, invitation };
  },

  /**
   * Get an invitation by token
   */
  async getByToken(token: string): Promise<PendingInvitation | null> {
    const invitation = await database
      .selectFrom("pending_invitation")
      .selectAll()
      .where("token", "=", token)
      .executeTakeFirst();

    return invitation ?? null;
  },

  /**
   * Redeem an invitation - creates member and deletes invitation
   */
  async redeem(token: string, userId: string): Promise<RedeemInvitationResult> {
    // Find invitation
    const invitation = await this.getByToken(token);

    if (!invitation) {
      return { success: false, error: "INVALID_TOKEN" };
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return { success: false, error: "EXPIRED" };
    }

    // Create member
    const member = await database
      .insertInto("workspace_member")
      .values({
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Delete invitation
    await database
      .deleteFrom("pending_invitation")
      .where("id", "=", invitation.id)
      .execute();

    return { success: true, member };
  },

  /**
   * Get all pending invitations for a workspace
   */
  async getByWorkspaceId(workspaceId: string): Promise<PendingInvitation[]> {
    return database
      .selectFrom("pending_invitation")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .execute();
  },

  /**
   * Cancel (delete) an invitation
   */
  async cancel(invitationId: string): Promise<boolean> {
    const result = await database
      .deleteFrom("pending_invitation")
      .where("id", "=", invitationId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Get invitations for a specific email across all workspaces
   */
  async getByEmail(email: string): Promise<PendingInvitation[]> {
    return database
      .selectFrom("pending_invitation")
      .selectAll()
      .where("email", "=", email)
      .execute();
  },

  /**
   * Delete expired invitations (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const result = await database
      .deleteFrom("pending_invitation")
      .where("expiresAt", "<", new Date())
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0n);
  },
};
