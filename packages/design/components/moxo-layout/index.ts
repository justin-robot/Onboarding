// Layout
export { MoxoLayout, ResizeHandle } from "./moxo-layout";

// Sidebar
export { WorkspaceSidebar } from "./workspace-sidebar";
export type { Workspace, WorkspaceSidebarProps } from "./workspace-sidebar";

// Activity Feed
export { ActivityFeed } from "./activity-feed";
export type { AuditEntry, ActivityFeedProps, AuditEventType } from "./activity-feed";

// Task Card
export { TaskCard } from "./task-card";
export type { TaskCardProps, TaskType } from "./task-card";

// Section Header
export { SectionHeader, SectionContent } from "./section-header";
export type { SectionHeaderProps, SectionStatus } from "./section-header";

// Timeline
export { Timeline, ProgressTracker } from "./timeline";
export type { TimelineProps, TimelineStep, TimelineStepStatus } from "./timeline";

// Action Details Panel
export { ActionDetails } from "./action-details";
export type { ActionDetailsProps, Attachment } from "./action-details";

// Flow View (main content)
export { FlowView } from "./flow-view";
export type { FlowViewProps, FlowSection, FlowTask } from "./flow-view";

// Responsive hooks
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  useBreakpoint,
} from "./use-media-query";
export type { Breakpoint } from "./use-media-query";

// Upload Dialog
export { UploadDialog } from "./upload-dialog";
export type { UploadDialogProps, UploadedFile } from "./upload-dialog";

// File Preview Modal
export { FilePreviewModal } from "./file-preview-modal";
export type { FilePreviewModalProps, PreviewFile, FileVersion } from "./file-preview-modal";
