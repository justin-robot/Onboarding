import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePreviewModal } from "../components/moxo-layout/file-preview-modal";

describe("FilePreviewModal", () => {
  const defaultFile = {
    id: "file-1",
    name: "document.pdf",
    mimeType: "application/pdf",
    size: 12345,
    url: "https://example.com/document.pdf",
    thumbnailUrl: "https://example.com/thumb.jpg",
    uploadedBy: "John Doe",
    uploadedAt: new Date("2024-01-15"),
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    file: defaultFile,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render modal when open", () => {
      render(<FilePreviewModal {...defaultProps} />);
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<FilePreviewModal {...defaultProps} open={false} />);
      expect(screen.queryByText("document.pdf")).not.toBeInTheDocument();
    });

    it("should render nothing when file is null", () => {
      render(<FilePreviewModal {...defaultProps} file={null} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should display file name", () => {
      render(<FilePreviewModal {...defaultProps} />);
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });

    it("should display file size", () => {
      render(<FilePreviewModal {...defaultProps} />);
      expect(screen.getByText(/12.*KB/i)).toBeInTheDocument();
    });

    it("should display uploader name", () => {
      render(<FilePreviewModal {...defaultProps} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should display upload date", () => {
      render(<FilePreviewModal {...defaultProps} />);
      expect(screen.getByText(/Jan/)).toBeInTheDocument();
    });
  });

  describe("preview content", () => {
    it("should render image preview for image files", () => {
      const imageFile = {
        ...defaultFile,
        name: "photo.jpg",
        mimeType: "image/jpeg",
        url: "https://example.com/photo.jpg",
      };
      render(<FilePreviewModal {...defaultProps} file={imageFile} />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    });

    it("should render PDF preview with iframe for PDF files", () => {
      render(<FilePreviewModal {...defaultProps} />);

      const iframe = screen.getByTitle("PDF Preview");
      expect(iframe).toHaveAttribute("src", expect.stringContaining("document.pdf"));
    });

    it("should render video player for video files", () => {
      const videoFile = {
        ...defaultFile,
        name: "video.mp4",
        mimeType: "video/mp4",
        url: "https://example.com/video.mp4",
      };
      render(<FilePreviewModal {...defaultProps} file={videoFile} />);

      const video = screen.getByTestId("video-player");
      expect(video).toHaveAttribute("src", "https://example.com/video.mp4");
    });

    it("should render audio player for audio files", () => {
      const audioFile = {
        ...defaultFile,
        name: "audio.mp3",
        mimeType: "audio/mpeg",
        url: "https://example.com/audio.mp3",
      };
      render(<FilePreviewModal {...defaultProps} file={audioFile} />);

      const audio = screen.getByTestId("audio-player");
      expect(audio).toHaveAttribute("src", "https://example.com/audio.mp3");
    });

    it("should render generic file icon for unsupported types", () => {
      const genericFile = {
        ...defaultFile,
        name: "data.bin",
        mimeType: "application/octet-stream",
      };
      render(<FilePreviewModal {...defaultProps} file={genericFile} />);

      expect(screen.getByTestId("file-icon")).toBeInTheDocument();
      expect(screen.getByText(/preview not available/i)).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("should have download button", () => {
      render(<FilePreviewModal {...defaultProps} />);

      const downloadButton = screen.getByRole("link", { name: /download/i });
      expect(downloadButton).toHaveAttribute("href", defaultFile.url);
      expect(downloadButton).toHaveAttribute("download");
    });

    it("should have open in new tab button", () => {
      render(<FilePreviewModal {...defaultProps} />);

      const openButton = screen.getByRole("link", { name: /open.*tab/i });
      expect(openButton).toHaveAttribute("href", defaultFile.url);
      expect(openButton).toHaveAttribute("target", "_blank");
    });

    it("should have close button", () => {
      render(<FilePreviewModal {...defaultProps} />);

      // The dialog has multiple close buttons, find the one inside the header
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it("should call onOpenChange when close button is clicked", async () => {
      render(<FilePreviewModal {...defaultProps} />);

      // Get all close buttons and click the first one
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      await userEvent.click(closeButtons[0]);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should have delete button when onDelete is provided", () => {
      const onDelete = vi.fn();
      render(<FilePreviewModal {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("should not have delete button when onDelete is not provided", () => {
      render(<FilePreviewModal {...defaultProps} />);

      expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    });

    it("should call onDelete when delete is confirmed", async () => {
      const onDelete = vi.fn();
      render(<FilePreviewModal {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await userEvent.click(deleteButton);

      // Confirm deletion in alert dialog
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await userEvent.click(confirmButton);

      expect(onDelete).toHaveBeenCalledWith(defaultFile.id);
    });
  });

  describe("keyboard navigation", () => {
    it("should close on escape key", async () => {
      render(<FilePreviewModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("version history", () => {
    it("should show version history when versions are provided", () => {
      const versions = [
        { id: "v2", name: "document.pdf", uploadedAt: new Date("2024-01-20") },
        { id: "v1", name: "document.pdf", uploadedAt: new Date("2024-01-15") },
      ];
      render(<FilePreviewModal {...defaultProps} versions={versions} />);

      expect(screen.getByText(/version history/i)).toBeInTheDocument();
      expect(screen.getByText(/2 versions/i)).toBeInTheDocument();
    });

    it("should not show version history when no versions", () => {
      render(<FilePreviewModal {...defaultProps} />);

      expect(screen.queryByText(/version history/i)).not.toBeInTheDocument();
    });

    it("should allow switching between versions", async () => {
      const onVersionSelect = vi.fn();
      const versions = [
        { id: "v2", name: "document.pdf", uploadedAt: new Date("2024-01-20T12:00:00") },
        { id: "v1", name: "document.pdf", uploadedAt: new Date("2024-01-15T12:00:00") },
      ];
      render(
        <FilePreviewModal
          {...defaultProps}
          versions={versions}
          onVersionSelect={onVersionSelect}
        />
      );

      // First, open the dropdown
      const dropdownTrigger = screen.getByRole("button", { name: /version history/i });
      await userEvent.click(dropdownTrigger);

      // Then click on the version in the dropdown menu
      const versionItem = await screen.findByText(/Jan 15/);
      await userEvent.click(versionItem);

      expect(onVersionSelect).toHaveBeenCalledWith("v1");
    });
  });

  describe("loading states", () => {
    it("should show loading state while fetching preview", () => {
      render(<FilePreviewModal {...defaultProps} loading />);

      expect(screen.getByTestId("preview-loading")).toBeInTheDocument();
    });

    it("should show error state if preview fails to load", () => {
      render(<FilePreviewModal {...defaultProps} error="Failed to load preview" />);

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });
});
