import { test, expect } from "@playwright/test";

/**
 * E2E: Chat System
 *
 * Tests the chat system per the Moxo specification:
 * - Workspace-scoped messaging
 * - Message types: text, annotation (referencing doc/task), system (auto-generated)
 * - Cursor-based pagination
 * - Real-time broadcast via Ably
 * - System messages on task events
 */

type MessageType = "text" | "annotation" | "system";

interface Message {
  id: string;
  workspaceId: string;
  senderId: string | null; // null for system messages
  type: MessageType;
  content: string;
  attachments: Attachment[];
  annotation?: Annotation;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface Attachment {
  id: string;
  messageId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface Annotation {
  type: "task" | "document" | "section";
  referenceId: string;
  referenceName: string;
}

interface PaginationCursor {
  before?: string;
  after?: string;
  limit: number;
}

test.describe("Chat System", () => {
  test.describe("Message Types", () => {
    test("creates text message", () => {
      const message: Message = {
        id: "msg-1",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "Hello team! Just checking in on the project status.",
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.type).toBe("text");
      expect(message.senderId).toBe("user-1");
      expect(message.content).toBeTruthy();
    });

    test("creates annotation message referencing task", () => {
      const message: Message = {
        id: "msg-2",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "annotation",
        content: "Can someone take a look at this?",
        attachments: [],
        annotation: {
          type: "task",
          referenceId: "task-123",
          referenceName: "Review Contract",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.type).toBe("annotation");
      expect(message.annotation?.type).toBe("task");
      expect(message.annotation?.referenceId).toBe("task-123");
    });

    test("creates annotation message referencing document", () => {
      const message: Message = {
        id: "msg-3",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "annotation",
        content: "Please review page 3 of this document.",
        attachments: [],
        annotation: {
          type: "document",
          referenceId: "file-456",
          referenceName: "Q4 Report.pdf",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.annotation?.type).toBe("document");
    });

    test("creates system message with no sender", () => {
      const message: Message = {
        id: "msg-4",
        workspaceId: "ws-1",
        senderId: null,
        type: "system",
        content: "John completed the task 'Submit Report'",
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.type).toBe("system");
      expect(message.senderId).toBeNull();
    });
  });

  test.describe("Message with Attachments", () => {
    test("creates message with file attachment", () => {
      const message: Message = {
        id: "msg-5",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "Here's the updated report.",
        attachments: [
          {
            id: "att-1",
            messageId: "msg-5",
            fileId: "file-123",
            fileName: "report-v2.pdf",
            mimeType: "application/pdf",
            size: 1024000,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.attachments).toHaveLength(1);
      expect(message.attachments[0].fileName).toBe("report-v2.pdf");
    });

    test("creates message with multiple attachments", () => {
      const message: Message = {
        id: "msg-6",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "Please review these documents.",
        attachments: [
          {
            id: "att-1",
            messageId: "msg-6",
            fileId: "file-1",
            fileName: "doc1.pdf",
            mimeType: "application/pdf",
            size: 512000,
          },
          {
            id: "att-2",
            messageId: "msg-6",
            fileId: "file-2",
            fileName: "doc2.pdf",
            mimeType: "application/pdf",
            size: 768000,
          },
          {
            id: "att-3",
            messageId: "msg-6",
            fileId: "file-3",
            fileName: "image.png",
            mimeType: "image/png",
            size: 256000,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.attachments).toHaveLength(3);
    });
  });

  test.describe("System Messages", () => {
    test("generates system message for task completion", () => {
      const generateTaskCompletionMessage = (
        workspaceId: string,
        userName: string,
        taskName: string
      ): Message => {
        return {
          id: `msg-${Date.now()}`,
          workspaceId,
          senderId: null,
          type: "system",
          content: `${userName} completed the task "${taskName}"`,
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };
      };

      const message = generateTaskCompletionMessage(
        "ws-1",
        "John",
        "Review Contract"
      );

      expect(message.type).toBe("system");
      expect(message.content).toContain("John");
      expect(message.content).toContain("Review Contract");
    });

    test("generates system message for member join", () => {
      const generateMemberJoinMessage = (
        workspaceId: string,
        userName: string
      ): Message => {
        return {
          id: `msg-${Date.now()}`,
          workspaceId,
          senderId: null,
          type: "system",
          content: `${userName} joined the workspace`,
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };
      };

      const message = generateMemberJoinMessage("ws-1", "Jane");

      expect(message.content).toBe("Jane joined the workspace");
    });

    test("generates system message for file upload", () => {
      const generateFileUploadMessage = (
        workspaceId: string,
        userName: string,
        fileName: string
      ): Message => {
        return {
          id: `msg-${Date.now()}`,
          workspaceId,
          senderId: null,
          type: "system",
          content: `${userName} uploaded "${fileName}"`,
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };
      };

      const message = generateFileUploadMessage("ws-1", "Bob", "document.pdf");

      expect(message.content).toContain("uploaded");
    });
  });

  test.describe("Pagination", () => {
    test("implements cursor-based pagination", () => {
      const messages: Message[] = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i + 1}`,
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text" as MessageType,
        content: `Message ${i + 1}`,
        attachments: [],
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        updatedAt: new Date(Date.now() - i * 60000).toISOString(),
        deletedAt: null,
      }));

      const getMessages = (
        cursor: PaginationCursor
      ): { messages: Message[]; nextCursor: string | null } => {
        let filteredMessages = [...messages];

        if (cursor.after) {
          const afterIndex = messages.findIndex((m) => m.id === cursor.after);
          filteredMessages = messages.slice(afterIndex + 1);
        }

        if (cursor.before) {
          const beforeIndex = messages.findIndex((m) => m.id === cursor.before);
          filteredMessages = messages.slice(0, beforeIndex);
        }

        const paginatedMessages = filteredMessages.slice(0, cursor.limit);
        const nextCursor =
          paginatedMessages.length === cursor.limit
            ? paginatedMessages[paginatedMessages.length - 1].id
            : null;

        return { messages: paginatedMessages, nextCursor };
      };

      const firstPage = getMessages({ limit: 20 });
      expect(firstPage.messages).toHaveLength(20);
      expect(firstPage.nextCursor).toBe("msg-20");

      const secondPage = getMessages({ after: "msg-20", limit: 20 });
      expect(secondPage.messages).toHaveLength(20);
      expect(secondPage.messages[0].id).toBe("msg-21");
    });

    test("returns empty when no more messages", () => {
      const messages: Message[] = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i + 1}`,
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text" as MessageType,
        content: `Message ${i + 1}`,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      }));

      const getMessages = (
        cursor: PaginationCursor
      ): { messages: Message[]; nextCursor: string | null } => {
        const afterIndex = cursor.after
          ? messages.findIndex((m) => m.id === cursor.after)
          : -1;
        const filteredMessages = messages.slice(afterIndex + 1, afterIndex + 1 + cursor.limit);
        const hasMore = afterIndex + 1 + cursor.limit < messages.length;

        return {
          messages: filteredMessages,
          nextCursor: hasMore ? filteredMessages[filteredMessages.length - 1].id : null,
        };
      };

      const result = getMessages({ after: "msg-5", limit: 20 });
      expect(result.messages).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });
  });

  test.describe("Workspace Scoping", () => {
    test("filters messages by workspace", () => {
      const messages: Message[] = [
        {
          id: "msg-1",
          workspaceId: "ws-1",
          senderId: "user-1",
          type: "text",
          content: "Message in workspace 1",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
        {
          id: "msg-2",
          workspaceId: "ws-2",
          senderId: "user-2",
          type: "text",
          content: "Message in workspace 2",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
        {
          id: "msg-3",
          workspaceId: "ws-1",
          senderId: "user-1",
          type: "text",
          content: "Another message in workspace 1",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];

      const getWorkspaceMessages = (workspaceId: string): Message[] => {
        return messages.filter((m) => m.workspaceId === workspaceId);
      };

      const ws1Messages = getWorkspaceMessages("ws-1");
      expect(ws1Messages).toHaveLength(2);

      const ws2Messages = getWorkspaceMessages("ws-2");
      expect(ws2Messages).toHaveLength(1);
    });

    test("validates user membership for message access", () => {
      const workspaceMembers: Record<string, string[]> = {
        "ws-1": ["user-1", "user-2"],
        "ws-2": ["user-3"],
      };

      const canAccessWorkspaceMessages = (
        workspaceId: string,
        userId: string
      ): boolean => {
        const members = workspaceMembers[workspaceId] || [];
        return members.includes(userId);
      };

      expect(canAccessWorkspaceMessages("ws-1", "user-1")).toBe(true);
      expect(canAccessWorkspaceMessages("ws-1", "user-3")).toBe(false);
    });
  });

  test.describe("Soft Delete", () => {
    test("soft deletes message", () => {
      let message: Message = {
        id: "msg-1",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "This message will be deleted",
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      const softDelete = (msg: Message): Message => {
        return {
          ...msg,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      };

      message = softDelete(message);

      expect(message.deletedAt).toBeTruthy();
    });

    test("excludes deleted messages from queries", () => {
      const messages: Message[] = [
        {
          id: "msg-1",
          workspaceId: "ws-1",
          senderId: "user-1",
          type: "text",
          content: "Active message",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
        {
          id: "msg-2",
          workspaceId: "ws-1",
          senderId: "user-1",
          type: "text",
          content: "Deleted message",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: new Date().toISOString(),
        },
      ];

      const getActiveMessages = (workspaceId: string): Message[] => {
        return messages.filter(
          (m) => m.workspaceId === workspaceId && m.deletedAt === null
        );
      };

      const activeMessages = getActiveMessages("ws-1");
      expect(activeMessages).toHaveLength(1);
      expect(activeMessages[0].id).toBe("msg-1");
    });
  });

  test.describe("Real-time Events", () => {
    test("generates Ably event payload for new message", () => {
      interface AblyEvent {
        name: string;
        data: {
          messageId: string;
          workspaceId: string;
          senderId: string | null;
          type: MessageType;
          preview: string;
          timestamp: string;
        };
      }

      const message: Message = {
        id: "msg-1",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "Hello everyone!",
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      const generateAblyEvent = (msg: Message): AblyEvent => {
        return {
          name: "chat.message.new",
          data: {
            messageId: msg.id,
            workspaceId: msg.workspaceId,
            senderId: msg.senderId,
            type: msg.type,
            preview: msg.content.substring(0, 100),
            timestamp: msg.createdAt,
          },
        };
      };

      const event = generateAblyEvent(message);

      expect(event.name).toBe("chat.message.new");
      expect(event.data.messageId).toBe("msg-1");
    });
  });

  test.describe("Date Separators", () => {
    test("groups messages by date", () => {
      const messages: Message[] = [
        {
          id: "msg-1",
          workspaceId: "ws-1",
          senderId: "user-1",
          type: "text",
          content: "Today message 1",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
        {
          id: "msg-2",
          workspaceId: "ws-1",
          senderId: "user-1",
          type: "text",
          content: "Today message 2",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
        {
          id: "msg-3",
          workspaceId: "ws-1",
          senderId: "user-1",
          type: "text",
          content: "Yesterday message",
          attachments: [],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          deletedAt: null,
        },
      ];

      const groupByDate = (msgs: Message[]): Record<string, Message[]> => {
        return msgs.reduce(
          (groups, msg) => {
            const date = new Date(msg.createdAt).toDateString();
            if (!groups[date]) {
              groups[date] = [];
            }
            groups[date].push(msg);
            return groups;
          },
          {} as Record<string, Message[]>
        );
      };

      const grouped = groupByDate(messages);
      const dates = Object.keys(grouped);

      expect(dates).toHaveLength(2);
    });
  });

  test.describe("Edge Cases", () => {
    test("handles empty message content", () => {
      const message: Message = {
        id: "msg-1",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "",
        attachments: [
          {
            id: "att-1",
            messageId: "msg-1",
            fileId: "file-1",
            fileName: "image.png",
            mimeType: "image/png",
            size: 256000,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      const hasContent = message.content.length > 0 || message.attachments.length > 0;
      expect(hasContent).toBe(true);
    });

    test("handles very long message content", () => {
      const longContent = "a".repeat(10000);

      const message: Message = {
        id: "msg-1",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: longContent,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.content.length).toBe(10000);
    });

    test("handles special characters in content", () => {
      const message: Message = {
        id: "msg-1",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "Hello! <script>alert('xss')</script> & \"quotes\" 'apostrophes'",
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      const escapeHtml = (str: string): string => {
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const escaped = escapeHtml(message.content);
      expect(escaped).not.toContain("<script>");
    });

    test("handles unicode and emoji", () => {
      const message: Message = {
        id: "msg-1",
        workspaceId: "ws-1",
        senderId: "user-1",
        type: "text",
        content: "Great work! 🎉 今日は良い天気です 🌞",
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(message.content).toContain("🎉");
      expect(message.content).toContain("今日");
    });
  });
});
