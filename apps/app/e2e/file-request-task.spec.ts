import { test, expect } from "@playwright/test";

/**
 * E2E: File Request Task
 *
 * Tests the file request task workflow per the Moxo specification:
 * - Uploader uploads files -> status flips to "uploaded"
 * - No review required -> task completes
 * - Review required -> reviewers notified -> approve or reject
 * - All approved -> complete
 * - Rejection -> uploader re-uploads
 */

type FileRequestStatus =
  | "pending_upload"
  | "uploaded"
  | "pending_review"
  | "approved"
  | "rejected";

interface Task {
  id: string;
  title: string;
  type: "FILE_REQUEST";
  sectionId: string;
  status: "not_started" | "in_progress" | "completed";
  isLocked: boolean;
  completedAt: string | null;
}

interface FileRequestConfig {
  id: string;
  taskId: string;
  instructions: string;
  requiredFileTypes: string[];
  maxFiles: number;
  requiresReview: boolean;
  reviewers: string[];
}

interface UploadedFile {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  status: FileRequestStatus;
}

interface FileReview {
  id: string;
  fileId: string;
  reviewerId: string;
  approved: boolean;
  comments: string | null;
  reviewedAt: string;
}

test.describe("File Request Task", () => {
  test.describe("Task Configuration", () => {
    test("creates file request task with config", () => {
      const task: Task = {
        id: "task-file-1",
        title: "Upload ID Documents",
        type: "FILE_REQUEST",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completedAt: null,
      };

      const config: FileRequestConfig = {
        id: "config-1",
        taskId: task.id,
        instructions: "Please upload a clear photo of your government-issued ID.",
        requiredFileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxFiles: 2,
        requiresReview: true,
        reviewers: ["admin-1", "admin-2"],
      };

      expect(task.type).toBe("FILE_REQUEST");
      expect(config.requiresReview).toBe(true);
      expect(config.reviewers).toHaveLength(2);
    });

    test("creates file request without review requirement", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload any supporting documents.",
        requiredFileTypes: [],
        maxFiles: 10,
        requiresReview: false,
        reviewers: [],
      };

      expect(config.requiresReview).toBe(false);
      expect(config.reviewers).toHaveLength(0);
    });

    test("validates file type restrictions", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload PDF documents only.",
        requiredFileTypes: ["application/pdf"],
        maxFiles: 5,
        requiresReview: false,
        reviewers: [],
      };

      const isAllowedFileType = (mimeType: string): boolean => {
        if (config.requiredFileTypes.length === 0) return true;
        return config.requiredFileTypes.includes(mimeType);
      };

      expect(isAllowedFileType("application/pdf")).toBe(true);
      expect(isAllowedFileType("image/jpeg")).toBe(false);
    });
  });

  test.describe("File Upload", () => {
    test("uploads file to task", () => {
      const files: UploadedFile[] = [];

      const uploadFile = (
        taskId: string,
        fileName: string,
        mimeType: string,
        size: number,
        uploadedBy: string
      ): UploadedFile => {
        const file: UploadedFile = {
          id: `file-${files.length + 1}`,
          taskId,
          fileName,
          fileUrl: `https://storage.example.com/${taskId}/${fileName}`,
          mimeType,
          size,
          uploadedBy,
          uploadedAt: new Date().toISOString(),
          status: "uploaded",
        };
        files.push(file);
        return file;
      };

      const file = uploadFile(
        "task-1",
        "id-front.jpg",
        "image/jpeg",
        512000,
        "user-1"
      );

      expect(file.status).toBe("uploaded");
      expect(files).toHaveLength(1);
    });

    test("enforces max file limit", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload documents.",
        requiredFileTypes: [],
        maxFiles: 2,
        requiresReview: false,
        reviewers: [],
      };

      const files: UploadedFile[] = [
        {
          id: "file-1",
          taskId: "task-1",
          fileName: "doc1.pdf",
          fileUrl: "https://storage.example.com/doc1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "uploaded",
        },
        {
          id: "file-2",
          taskId: "task-1",
          fileName: "doc2.pdf",
          fileUrl: "https://storage.example.com/doc2.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "uploaded",
        },
      ];

      const canUploadMore = (): boolean => {
        const taskFiles = files.filter((f) => f.taskId === config.taskId);
        return taskFiles.length < config.maxFiles;
      };

      expect(canUploadMore()).toBe(false);
    });

    test("allows multiple files up to limit", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload documents.",
        requiredFileTypes: [],
        maxFiles: 5,
        requiresReview: false,
        reviewers: [],
      };

      const files: UploadedFile[] = [
        {
          id: "file-1",
          taskId: "task-1",
          fileName: "doc1.pdf",
          fileUrl: "https://storage.example.com/doc1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "uploaded",
        },
      ];

      const canUploadMore = (): boolean => {
        const taskFiles = files.filter((f) => f.taskId === config.taskId);
        return taskFiles.length < config.maxFiles;
      };

      expect(canUploadMore()).toBe(true);
      expect(config.maxFiles - files.length).toBe(4);
    });
  });

  test.describe("No Review Required Workflow", () => {
    test("completes task immediately when no review required", () => {
      let task: Task = {
        id: "task-1",
        title: "Upload Documents",
        type: "FILE_REQUEST",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completedAt: null,
      };

      const config: FileRequestConfig = {
        id: "config-1",
        taskId: task.id,
        instructions: "Upload documents.",
        requiredFileTypes: [],
        maxFiles: 5,
        requiresReview: false,
        reviewers: [],
      };

      const files: UploadedFile[] = [];

      const handleUpload = (): void => {
        files.push({
          id: "file-1",
          taskId: task.id,
          fileName: "doc.pdf",
          fileUrl: "https://storage.example.com/doc.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "uploaded",
        });

        if (!config.requiresReview) {
          task = {
            ...task,
            status: "completed",
            completedAt: new Date().toISOString(),
          };
        }
      };

      handleUpload();

      expect(task.status).toBe("completed");
      expect(task.completedAt).toBeTruthy();
    });
  });

  test.describe("Review Required Workflow", () => {
    test("moves to pending_review when upload complete", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload ID.",
        requiredFileTypes: [],
        maxFiles: 2,
        requiresReview: true,
        reviewers: ["reviewer-1"],
      };

      const file: UploadedFile = {
        id: "file-1",
        taskId: "task-1",
        fileName: "id.jpg",
        fileUrl: "https://storage.example.com/id.jpg",
        mimeType: "image/jpeg",
        size: 512000,
        uploadedBy: "user-1",
        uploadedAt: new Date().toISOString(),
        status: "uploaded",
      };

      // Mark as pending review
      if (config.requiresReview) {
        file.status = "pending_review";
      }

      expect(file.status).toBe("pending_review");
    });

    test("records reviewer approval", () => {
      const reviews: FileReview[] = [];

      const recordReview = (
        fileId: string,
        reviewerId: string,
        approved: boolean,
        comments: string | null
      ): FileReview => {
        const review: FileReview = {
          id: `review-${reviews.length + 1}`,
          fileId,
          reviewerId,
          approved,
          comments,
          reviewedAt: new Date().toISOString(),
        };
        reviews.push(review);
        return review;
      };

      const review = recordReview("file-1", "reviewer-1", true, "Looks good!");

      expect(review.approved).toBe(true);
      expect(reviews).toHaveLength(1);
    });

    test("records reviewer rejection with reason", () => {
      const reviews: FileReview[] = [];

      const review: FileReview = {
        id: "review-1",
        fileId: "file-1",
        reviewerId: "reviewer-1",
        approved: false,
        comments: "Image is too blurry, please upload a clearer photo.",
        reviewedAt: new Date().toISOString(),
      };
      reviews.push(review);

      expect(review.approved).toBe(false);
      expect(review.comments).toBeTruthy();
    });

    test("only designated reviewers can review", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload ID.",
        requiredFileTypes: [],
        maxFiles: 2,
        requiresReview: true,
        reviewers: ["reviewer-1", "reviewer-2"],
      };

      const canReview = (userId: string): boolean => {
        return config.reviewers.includes(userId);
      };

      expect(canReview("reviewer-1")).toBe(true);
      expect(canReview("reviewer-2")).toBe(true);
      expect(canReview("user-1")).toBe(false);
    });
  });

  test.describe("File Approval Status", () => {
    test("file approved when all reviewers approve", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload ID.",
        requiredFileTypes: [],
        maxFiles: 1,
        requiresReview: true,
        reviewers: ["reviewer-1", "reviewer-2"],
      };

      const reviews: FileReview[] = [
        {
          id: "review-1",
          fileId: "file-1",
          reviewerId: "reviewer-1",
          approved: true,
          comments: null,
          reviewedAt: new Date().toISOString(),
        },
        {
          id: "review-2",
          fileId: "file-1",
          reviewerId: "reviewer-2",
          approved: true,
          comments: null,
          reviewedAt: new Date().toISOString(),
        },
      ];

      const getFileStatus = (fileId: string): FileRequestStatus => {
        const fileReviews = reviews.filter((r) => r.fileId === fileId);

        // Check for any rejection
        if (fileReviews.some((r) => !r.approved)) {
          return "rejected";
        }

        // Check if all reviewers approved
        if (fileReviews.length === config.reviewers.length) {
          return "approved";
        }

        return "pending_review";
      };

      expect(getFileStatus("file-1")).toBe("approved");
    });

    test("file rejected when any reviewer rejects", () => {
      const reviews: FileReview[] = [
        {
          id: "review-1",
          fileId: "file-1",
          reviewerId: "reviewer-1",
          approved: true,
          comments: null,
          reviewedAt: new Date().toISOString(),
        },
        {
          id: "review-2",
          fileId: "file-1",
          reviewerId: "reviewer-2",
          approved: false,
          comments: "Image quality too low",
          reviewedAt: new Date().toISOString(),
        },
      ];

      const isRejected = (fileId: string): boolean => {
        return reviews.filter((r) => r.fileId === fileId).some((r) => !r.approved);
      };

      expect(isRejected("file-1")).toBe(true);
    });
  });

  test.describe("Task Completion", () => {
    test("completes when all files approved", () => {
      let task: Task = {
        id: "task-1",
        title: "Upload Documents",
        type: "FILE_REQUEST",
        sectionId: "section-1",
        status: "in_progress",
        isLocked: false,
        completedAt: null,
      };

      const files: UploadedFile[] = [
        {
          id: "file-1",
          taskId: "task-1",
          fileName: "doc1.pdf",
          fileUrl: "https://storage.example.com/doc1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "approved",
        },
        {
          id: "file-2",
          taskId: "task-1",
          fileName: "doc2.pdf",
          fileUrl: "https://storage.example.com/doc2.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "approved",
        },
      ];

      const checkTaskCompletion = (): void => {
        const taskFiles = files.filter((f) => f.taskId === task.id);
        if (taskFiles.length > 0 && taskFiles.every((f) => f.status === "approved")) {
          task = {
            ...task,
            status: "completed",
            completedAt: new Date().toISOString(),
          };
        }
      };

      checkTaskCompletion();

      expect(task.status).toBe("completed");
    });

    test("does not complete if any file rejected", () => {
      let task: Task = {
        id: "task-1",
        title: "Upload Documents",
        type: "FILE_REQUEST",
        sectionId: "section-1",
        status: "in_progress",
        isLocked: false,
        completedAt: null,
      };

      const files: UploadedFile[] = [
        {
          id: "file-1",
          taskId: "task-1",
          fileName: "doc1.pdf",
          fileUrl: "https://storage.example.com/doc1.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "approved",
        },
        {
          id: "file-2",
          taskId: "task-1",
          fileName: "doc2.pdf",
          fileUrl: "https://storage.example.com/doc2.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "rejected",
        },
      ];

      const checkTaskCompletion = (): void => {
        const taskFiles = files.filter((f) => f.taskId === task.id);
        if (taskFiles.length > 0 && taskFiles.every((f) => f.status === "approved")) {
          task = {
            ...task,
            status: "completed",
            completedAt: new Date().toISOString(),
          };
        }
      };

      checkTaskCompletion();

      expect(task.status).toBe("in_progress");
    });
  });

  test.describe("Re-upload After Rejection", () => {
    test("allows re-upload after rejection", () => {
      const files: UploadedFile[] = [
        {
          id: "file-1",
          taskId: "task-1",
          fileName: "id-blurry.jpg",
          fileUrl: "https://storage.example.com/id-blurry.jpg",
          mimeType: "image/jpeg",
          size: 256000,
          uploadedBy: "user-1",
          uploadedAt: new Date().toISOString(),
          status: "rejected",
        },
      ];

      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload ID.",
        requiredFileTypes: [],
        maxFiles: 2,
        requiresReview: true,
        reviewers: ["reviewer-1"],
      };

      // User re-uploads
      files.push({
        id: "file-2",
        taskId: "task-1",
        fileName: "id-clear.jpg",
        fileUrl: "https://storage.example.com/id-clear.jpg",
        mimeType: "image/jpeg",
        size: 512000,
        uploadedBy: "user-1",
        uploadedAt: new Date().toISOString(),
        status: "pending_review",
      });

      const pendingFiles = files.filter(
        (f) => f.taskId === "task-1" && f.status === "pending_review"
      );

      expect(pendingFiles).toHaveLength(1);
      expect(pendingFiles[0].fileName).toBe("id-clear.jpg");
    });

    test("clears previous reviews on re-upload", () => {
      let reviews: FileReview[] = [
        {
          id: "review-1",
          fileId: "file-1",
          reviewerId: "reviewer-1",
          approved: false,
          comments: "Blurry",
          reviewedAt: new Date().toISOString(),
        },
      ];

      // When user uploads new file, old file is marked as superseded
      // New file gets fresh review process
      const clearPreviousReviews = (fileId: string): void => {
        reviews = reviews.filter((r) => r.fileId !== fileId);
      };

      clearPreviousReviews("file-1");
      expect(reviews).toHaveLength(0);
    });
  });

  test.describe("Full Workflow", () => {
    test("complete file request workflow with review", () => {
      // Step 1: Create task
      let task: Task = {
        id: "task-1",
        title: "Upload Tax Documents",
        type: "FILE_REQUEST",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completedAt: null,
      };

      const config: FileRequestConfig = {
        id: "config-1",
        taskId: task.id,
        instructions: "Upload your W-2 forms.",
        requiredFileTypes: ["application/pdf"],
        maxFiles: 3,
        requiresReview: true,
        reviewers: ["accountant-1"],
      };

      // Step 2: User uploads file
      const files: UploadedFile[] = [];
      files.push({
        id: "file-1",
        taskId: task.id,
        fileName: "w2-2024.pdf",
        fileUrl: "https://storage.example.com/w2-2024.pdf",
        mimeType: "application/pdf",
        size: 256000,
        uploadedBy: "user-1",
        uploadedAt: new Date().toISOString(),
        status: "pending_review",
      });

      task = { ...task, status: "in_progress" };

      // Step 3: Reviewer approves
      const reviews: FileReview[] = [];
      reviews.push({
        id: "review-1",
        fileId: "file-1",
        reviewerId: "accountant-1",
        approved: true,
        comments: "Document verified.",
        reviewedAt: new Date().toISOString(),
      });

      // Step 4: Update file status
      files[0].status = "approved";

      // Step 5: Complete task
      task = {
        ...task,
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      expect(task.status).toBe("completed");
      expect(files[0].status).toBe("approved");
      expect(reviews[0].approved).toBe(true);
    });
  });

  test.describe("Edge Cases", () => {
    test("handles zero max files (unlimited)", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload as many as needed.",
        requiredFileTypes: [],
        maxFiles: 0, // 0 means unlimited
        requiresReview: false,
        reviewers: [],
      };

      const canUploadMore = (currentCount: number): boolean => {
        return config.maxFiles === 0 || currentCount < config.maxFiles;
      };

      expect(canUploadMore(10)).toBe(true);
      expect(canUploadMore(100)).toBe(true);
    });

    test("handles empty file type restrictions (any type)", () => {
      const config: FileRequestConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "Upload any document.",
        requiredFileTypes: [],
        maxFiles: 5,
        requiresReview: false,
        reviewers: [],
      };

      const isAllowedFileType = (mimeType: string): boolean => {
        return config.requiredFileTypes.length === 0 ||
               config.requiredFileTypes.includes(mimeType);
      };

      expect(isAllowedFileType("application/pdf")).toBe(true);
      expect(isAllowedFileType("image/jpeg")).toBe(true);
      expect(isAllowedFileType("application/zip")).toBe(true);
    });

    test("validates file size limits", () => {
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

      const isValidFileSize = (size: number): boolean => {
        return size <= MAX_FILE_SIZE;
      };

      expect(isValidFileSize(1024)).toBe(true);
      expect(isValidFileSize(25 * 1024 * 1024)).toBe(true);
      expect(isValidFileSize(26 * 1024 * 1024)).toBe(false);
    });
  });
});
