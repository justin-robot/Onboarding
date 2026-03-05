import { database } from "@repo/database";

// Ably is loaded via require() to avoid Turbopack static analysis issues
// The ably package has dependencies (keyv, got) that use dynamic requires
let AblyModule: typeof import("ably") | null = null;

function loadAblySync(): typeof import("ably") | null {
  if (AblyModule) return AblyModule;

  // Only load on server (Node.js environment)
  if (typeof window !== "undefined") return null;

  try {
    // Use require() to avoid static analysis by bundlers
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AblyModule = require("ably");
    return AblyModule;
  } catch (error) {
    console.warn("Failed to load Ably module:", error);
    return null;
  }
}

async function loadAbly(): Promise<typeof import("ably") | null> {
  return loadAblySync();
}

// Channel name patterns
export const CHANNELS = {
  /** Workspace activity channel - task updates, section changes */
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,
  /** Workspace chat channel - chat messages */
  workspaceChat: (workspaceId: string) => `workspace:${workspaceId}:chat`,
  /** User private channel - direct notifications */
  user: (userId: string) => `user:${userId}`,
} as const;

// Event types for workspace channel
export const WORKSPACE_EVENTS = {
  // Task events
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  TASK_COMPLETED: "task:completed",
  TASK_ASSIGNED: "task:assigned",
  // Section events
  SECTION_CREATED: "section:created",
  SECTION_UPDATED: "section:updated",
  SECTION_DELETED: "section:deleted",
  SECTION_STATUS_CHANGED: "section:status_changed",
  // File events
  FILE_UPLOADED: "file:uploaded",
  FILE_DELETED: "file:deleted",
  // Member events
  MEMBER_ADDED: "member:added",
  MEMBER_REMOVED: "member:removed",
  // Audit events
  AUDIT_CREATED: "audit:created",
} as const;

// Event types for chat channel
export const CHAT_EVENTS = {
  MESSAGE_SENT: "message:sent",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",
  TYPING_STARTED: "typing:started",
  TYPING_STOPPED: "typing:stopped",
} as const;

// Event types for user channel
export const USER_EVENTS = {
  NOTIFICATION: "notification",
  WORKSPACE_INVITATION: "workspace:invitation",
} as const;

export type WorkspaceEvent = (typeof WORKSPACE_EVENTS)[keyof typeof WORKSPACE_EVENTS];
export type ChatEvent = (typeof CHAT_EVENTS)[keyof typeof CHAT_EVENTS];
export type UserEvent = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];

// Token request result - matches Ably's TokenRequest structure
export interface AblyTokenRequest {
  keyName?: string;
  clientId?: string;
  timestamp?: number;
  nonce?: string;
  mac?: string;
  capability?: string;
  ttl?: number;
}

// Get Ably REST client (async to support dynamic import)
async function getAblyClient(): Promise<InstanceType<typeof import("ably").Rest> | null> {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.warn("ABLY_API_KEY not configured. Realtime features will be disabled.");
    return null;
  }

  const Ably = await loadAbly();
  if (!Ably) return null;

  return new Ably.Rest({ key: apiKey });
}

export const ablyService = {
  /**
   * Generate a token request for a user with workspace-scoped capabilities
   * Validates that the user is a member of the workspace
   */
  async createTokenRequest(
    userId: string,
    workspaceId: string
  ): Promise<AblyTokenRequest | null> {
    const ably = await getAblyClient();
    if (!ably) return null;

    // Validate workspace membership
    const membership = await database
      .selectFrom("workspace_member")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    if (!membership) {
      throw new Error("User is not a member of this workspace");
    }

    // Build capability - what channels the user can access
    const capability: Record<string, string[]> = {
      // Full access to workspace channels
      [CHANNELS.workspace(workspaceId)]: ["subscribe", "publish", "presence"],
      [CHANNELS.workspaceChat(workspaceId)]: ["subscribe", "publish", "presence"],
      // User's private channel
      [CHANNELS.user(userId)]: ["subscribe"],
    };

    // Create token request
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId,
      capability: JSON.stringify(capability),
      ttl: 60 * 60 * 1000, // 1 hour
    });

    // Return the token request - client SDK will use this to authenticate
    return tokenRequest as AblyTokenRequest;
  },

  /**
   * Generate a token request for multiple workspaces
   */
  async createTokenRequestForWorkspaces(
    userId: string,
    workspaceIds: string[]
  ): Promise<AblyTokenRequest | null> {
    const ably = await getAblyClient();
    if (!ably) return null;

    // Validate membership for all workspaces
    const memberships = await database
      .selectFrom("workspace_member")
      .selectAll()
      .where("userId", "=", userId)
      .where("workspaceId", "in", workspaceIds)
      .execute();

    const validWorkspaceIds = memberships.map((m) => m.workspaceId);

    if (validWorkspaceIds.length === 0) {
      throw new Error("User is not a member of any of the specified workspaces");
    }

    // Build capability for all valid workspaces
    const capability: Record<string, string[]> = {
      [CHANNELS.user(userId)]: ["subscribe"],
    };

    for (const wsId of validWorkspaceIds) {
      capability[CHANNELS.workspace(wsId)] = ["subscribe", "publish", "presence"];
      capability[CHANNELS.workspaceChat(wsId)] = ["subscribe", "publish", "presence"];
    }

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId,
      capability: JSON.stringify(capability),
      ttl: 60 * 60 * 1000,
    });

    return tokenRequest as AblyTokenRequest;
  },

  /**
   * Broadcast an event to a workspace channel
   */
  async broadcast(
    channel: string,
    event: string,
    data: unknown
  ): Promise<boolean> {
    const ably = await getAblyClient();
    if (!ably) return false;

    try {
      const ablyChannel = ably.channels.get(channel);
      await ablyChannel.publish(event, data);
      return true;
    } catch (error) {
      console.error(`Failed to broadcast event ${event} to ${channel}:`, error);
      return false;
    }
  },

  /**
   * Broadcast a workspace event
   */
  async broadcastToWorkspace(
    workspaceId: string,
    event: WorkspaceEvent,
    data: unknown
  ): Promise<boolean> {
    return this.broadcast(CHANNELS.workspace(workspaceId), event, data);
  },

  /**
   * Broadcast a chat event
   */
  async broadcastToChat(
    workspaceId: string,
    event: ChatEvent,
    data: unknown
  ): Promise<boolean> {
    return this.broadcast(CHANNELS.workspaceChat(workspaceId), event, data);
  },

  /**
   * Broadcast to a user's private channel
   */
  async broadcastToUser(
    userId: string,
    event: UserEvent,
    data: unknown
  ): Promise<boolean> {
    return this.broadcast(CHANNELS.user(userId), event, data);
  },

  /**
   * Get channel name helpers
   */
  channels: CHANNELS,

  /**
   * Parse a channel name to extract type and ID
   */
  parseChannel(channelName: string): {
    type: "workspace" | "workspace_chat" | "user" | "unknown";
    id: string;
  } {
    if (channelName.startsWith("workspace:") && channelName.includes(":chat")) {
      const id = channelName.replace("workspace:", "").replace(":chat", "");
      return { type: "workspace_chat", id };
    }
    if (channelName.startsWith("workspace:")) {
      const id = channelName.replace("workspace:", "");
      return { type: "workspace", id };
    }
    if (channelName.startsWith("user:")) {
      const id = channelName.replace("user:", "");
      return { type: "user", id };
    }
    return { type: "unknown", id: "" };
  },
};
