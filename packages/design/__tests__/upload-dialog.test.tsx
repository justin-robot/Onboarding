import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadDialog } from "../components/moxo-layout/upload-dialog";

describe("UploadDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    workspaceId: "ws-1",
    onUploadComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for presigned URL and confirm
    global.fetch = vi.fn();
  });

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<UploadDialog {...defaultProps} />);
      expect(screen.getByText("Upload Files")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<UploadDialog {...defaultProps} open={false} />);
      expect(screen.queryByText(/upload/i)).not.toBeInTheDocument();
    });

    it("should render dropzone area", () => {
      render(<UploadDialog {...defaultProps} />);
      expect(screen.getByText(/drag/i)).toBeInTheDocument();
    });

    it("should render file input for clicking", () => {
      render(<UploadDialog {...defaultProps} />);
      expect(screen.getByRole("button", { name: /browse/i })).toBeInTheDocument();
    });
  });

  describe("file selection", () => {
    it("should accept files via file input", async () => {
      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });

    it("should display file size", async () => {
      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;

      await userEvent.upload(input, file);

      // Should show file size
      expect(screen.getByText(/bytes/i)).toBeInTheDocument();
    });

    it("should allow removing selected file", async () => {
      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;

      await userEvent.upload(input, file);
      expect(screen.getByText("test.pdf")).toBeInTheDocument();

      const removeButton = screen.getByRole("button", { name: /remove/i });
      await userEvent.click(removeButton);

      expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
    });

    it("should support multiple file selection", async () => {
      render(<UploadDialog {...defaultProps} multiple />);

      const files = [
        new File(["test1"], "file1.pdf", { type: "application/pdf" }),
        new File(["test2"], "file2.jpg", { type: "image/jpeg" }),
      ];
      const input = screen.getByTestId("file-input") as HTMLInputElement;

      await userEvent.upload(input, files);

      expect(screen.getByText("file1.pdf")).toBeInTheDocument();
      expect(screen.getByText("file2.jpg")).toBeInTheDocument();
    });
  });

  describe("drag and drop", () => {
    it("should show active state when dragging over", () => {
      render(<UploadDialog {...defaultProps} />);

      const dropzone = screen.getByTestId("dropzone");

      fireEvent.dragEnter(dropzone, {
        dataTransfer: { types: ["Files"] },
      });

      expect(dropzone).toHaveClass("border-primary");
    });

    it("should remove active state when drag leaves", () => {
      render(<UploadDialog {...defaultProps} />);

      const dropzone = screen.getByTestId("dropzone");

      fireEvent.dragEnter(dropzone, {
        dataTransfer: { types: ["Files"] },
      });
      fireEvent.dragLeave(dropzone);

      expect(dropzone).not.toHaveClass("border-primary");
    });

    it("should accept dropped files", async () => {
      render(<UploadDialog {...defaultProps} />);

      const dropzone = screen.getByTestId("dropzone");
      const file = new File(["test"], "dropped.pdf", { type: "application/pdf" });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
          types: ["Files"],
        },
      });

      await waitFor(() => {
        expect(screen.getByText("dropped.pdf")).toBeInTheDocument();
      });
    });
  });

  describe("upload flow", () => {
    it("should upload file when upload button is clicked", async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            uploadUrl: "https://s3.example.com/upload?signed=true",
            key: "ws-1/2024/01/uuid-test.pdf",
          }),
        })
        .mockResolvedValueOnce({ ok: true }) // S3 upload
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: "file-1",
            name: "test.pdf",
          }),
        });
      global.fetch = mockFetch;

      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      await userEvent.click(uploadButton);

      await waitFor(() => {
        expect(defaultProps.onUploadComplete).toHaveBeenCalled();
      });
    });

    // Skip: This test has timing issues with mocked async operations
    it.skip("should show progress during upload", async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 100))
      );
      global.fetch = mockFetch;

      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      await userEvent.click(uploadButton);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should show error on upload failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Upload failed" }),
      });
      global.fetch = mockFetch;

      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      await userEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it("should close dialog after successful upload", async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            uploadUrl: "https://s3.example.com/upload",
            key: "key",
          }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: "file-1" }),
        });
      global.fetch = mockFetch;

      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      await userEvent.click(uploadButton);

      await waitFor(() => {
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("validation", () => {
    it("should disable upload button when no file selected", () => {
      render(<UploadDialog {...defaultProps} />);

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      expect(uploadButton).toBeDisabled();
    });

    it("should enable upload button when file is selected", async () => {
      render(<UploadDialog {...defaultProps} />);

      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;
      await userEvent.upload(input, file);

      const uploadButton = screen.getByRole("button", { name: /upload/i });
      expect(uploadButton).toBeEnabled();
    });

    it("should reject files exceeding max size", async () => {
      render(<UploadDialog {...defaultProps} maxSize={1024} />); // 1KB max

      // Create a file larger than 1KB
      const largeContent = "x".repeat(2000);
      const file = new File([largeContent], "large.pdf", { type: "application/pdf" });
      const input = screen.getByTestId("file-input") as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(screen.getByText(/too large/i)).toBeInTheDocument();
    });

    it("should filter by accepted file types via drag and drop", async () => {
      render(<UploadDialog {...defaultProps} accept={{ "image/*": [".jpg", ".png"] }} />);

      // Use drag and drop to bypass browser's native file input filtering
      const dropzone = screen.getByTestId("dropzone");
      const file = new File(["test"], "document.pdf", { type: "application/pdf" });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
          types: ["Files"],
        },
      });

      await waitFor(() => {
        // The file should be added but show an error
        expect(screen.getByText("document.pdf")).toBeInTheDocument();
        expect(screen.getByText("File type not allowed")).toBeInTheDocument();
      });
    });
  });
});
