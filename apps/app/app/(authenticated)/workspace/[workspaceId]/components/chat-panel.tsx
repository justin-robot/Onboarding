"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { UserAvatar } from "@repo/design/components/ui/user-avatar";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import {
  Video,
  Paperclip,
  Smile,
  ArrowDown,
  Image as ImageIcon,
  FileText,
  X,
  Loader2,
  MoreHorizontal,
  Reply,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { isEdited } from "@repo/design/lib/date-utils";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { toast } from "sonner";

// Common emoji categories for quick access
const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "😘", "😗"] },
  { name: "Gestures", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🖐️", "✋", "👏", "🙌", "🤝", "🙏", "💪"] },
  { name: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖"] },
  { name: "Objects", emojis: ["⭐", "🔥", "✨", "💯", "✅", "❌", "⚡", "💡", "🎉", "🎊", "🎁", "📌", "📍", "🔔", "💬", "📝"] },
];

type MessageType = "text" | "annotation" | "system" | "file" | "meeting_started";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  createdAt: Date;
  updatedAt?: Date;
  replyToMessageId?: string;
  replyToMessage?: {
    id: string;
    content: string;
    senderName: string;
    senderAvatarUrl?: string;
  };
  attachment?: {
    name: string;
    type: string;
    url?: string;
    thumbnailUrl?: string;
    uploadedBy?: string;
  };
  meetingId?: string;
  meetingUrl?: string;
}

interface Meeting {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  participants: Array<{ id: string; name: string; avatarUrl?: string }>;
  isActive?: boolean;
  meetingUrl?: string;
}

interface ChatPanelProps {
  messages: Message[];
  meetings?: Meeting[];
  currentUserId: string;
  workspaceId: string;
  onSendMessage?: (content: string, attachment?: File, replyToMessageId?: string) => Promise<void>;
  onJoinMeeting?: (meetingId: string) => void;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  /** Optional custom content for the Meetings tab (e.g., MeetingsPanel component) */
  meetingsContent?: React.ReactNode;
  /** Initial/controlled active tab */
  activeTab?: "chat" | "meetings";
  /** Callback when tab changes */
  onTabChange?: (tab: "chat" | "meetings") => void;
}

export function ChatPanel({
  messages,
  meetings = [],
  currentUserId,
  workspaceId,
  onSendMessage,
  onJoinMeeting,
  onEditMessage,
  onDeleteMessage,
  meetingsContent,
  activeTab: controlledActiveTab,
  onTabChange,
}: ChatPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<"chat" | "meetings">("chat");

  // Use controlled tab if provided, otherwise use internal state
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: "chat" | "meetings") => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Count active meetings for badge
  const activeMeetingsCount = meetings.filter((m) => m.isActive).length;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Handle scroll to show/hide scroll-to-bottom button
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage?.(newMessage.trim(), selectedFile || undefined, replyingTo?.id);
      setNewMessage("");
      setSelectedFile(null);
      setReplyingTo(null);
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    // Keep picker open so users can select multiple emojis
    // Picker closes when clicking outside
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex h-full flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "meetings")} className="flex h-full flex-col">
        <TabsList className="w-full grid grid-cols-2 gap-0 rounded-none bg-transparent p-2 h-auto">
          <TabsTrigger
            value="chat"
            className="text-sm font-medium py-2.5 rounded-lg border border-transparent data-[state=active]:bg-muted data-[state=active]:border-border data-[state=inactive]:bg-transparent text-muted-foreground data-[state=active]:text-foreground shadow-none"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="meetings"
            className="relative text-sm font-medium py-2.5 rounded-lg border border-transparent data-[state=active]:bg-muted data-[state=active]:border-border data-[state=inactive]:bg-transparent text-muted-foreground data-[state=active]:text-foreground shadow-none"
          >
            Meetings
            {activeMeetingsCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                {activeMeetingsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="relative flex-1 flex flex-col mt-0 overflow-hidden">
          {/* Messages */}
          <ScrollArea
            viewportRef={scrollAreaRef}
            className="flex-1 min-h-0"
            onScrollCapture={handleScroll}
            scrollbarClassName="bg-muted-foreground/20 hover:bg-muted-foreground/40"
          >
            <div className="p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-muted-foreground">
                    Start the conversation by sending a message
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date}>
                      <DateSeparator date={date} />
                      <div className="space-y-3 mt-3">
                        {dateMessages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.senderId === currentUserId}
                            currentUserId={currentUserId}
                            onReply={handleReply}
                            onEdit={onEditMessage}
                            onDelete={onDeleteMessage}
                            onJoinMeeting={onJoinMeeting}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full shadow-md"
                onClick={scrollToBottom}
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                New Messages
              </Button>
            </div>
          )}

          {/* Message input */}
          <div className="border-t border-border p-3">
            {/* Reply preview */}
            {replyingTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">Replying to </span>
                  <span className="text-xs font-medium">{replyingTo.senderName}</span>
                  <p className="text-sm text-muted-foreground truncate">{replyingTo.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={cancelReply}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Selected file preview */}
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={clearSelectedFile}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
            />

            {/* Input container with embedded icons */}
            <div className="flex items-end rounded-lg border border-border bg-background px-3 py-1.5 focus-within:ring-1 focus-within:ring-ring">
              <textarea
                ref={inputRef}
                placeholder="Send message... (Shift + Enter for new line)"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                rows={1}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed resize-none min-h-[24px] max-h-[120px] py-0.5"
              />

              {isSending && (
                <div className="p-1.5 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Emoji picker */}
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSending}
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="end">
                  <div className="space-y-2">
                    {EMOJI_CATEGORIES.map((category) => (
                      <div key={category.name}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {category.name}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {category.emojis.map((emoji) => (
                            <button
                              key={emoji}
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-lg"
                              onClick={() => handleEmojiSelect(emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Attachment button */}
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="flex-1 mt-0 overflow-hidden">
          {meetingsContent ? (
            <div className="h-full">{meetingsContent}</div>
          ) : (
            <div className="p-4 overflow-x-hidden overflow-y-auto">
              {meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Video className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium">No meetings scheduled</p>
                  <p className="text-xs text-muted-foreground">
                    Meetings will appear here when scheduled
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onJoin={() => onJoinMeeting?.(meeting.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
        {date}
      </span>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  onReply: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onJoinMeeting?: (meetingId: string) => void;
}

function MessageBubble({
  message,
  isOwn,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onJoinMeeting,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  // System messages - Moxo style with blue square icon
  if (message.type === "system") {
    // Replace sender name with "You" for current user's actions
    let displayContent = message.content;
    if (message.senderId === currentUserId) {
      // Try to replace the sender's name at the start with "You"
      const senderNamePattern = new RegExp(`^${message.senderName}\\s`);
      if (senderNamePattern.test(displayContent)) {
        displayContent = displayContent.replace(senderNamePattern, "You ");
      }
    }

    // Format date: "Today, Time" or "Yesterday, Time" or "Mon, Time"
    const dateStr = isToday(message.createdAt)
      ? "Today"
      : isYesterday(message.createdAt)
      ? "Yesterday"
      : format(message.createdAt, "EEE");

    return (
      <div className="flex items-start gap-3 py-2">
        <div className="w-3 h-3 mt-1 rounded-sm bg-blue-500 shrink-0" />
        <div>
          <p className="text-sm text-foreground">{displayContent}</p>
          <p className="text-xs text-muted-foreground">
            {dateStr}, {format(message.createdAt, "h:mm a")}
          </p>
        </div>
      </div>
    );
  }

  // Meeting started notification - inline with Join button
  if (message.type === "meeting_started") {
    return (
      <div className="flex justify-center items-center gap-3 py-3">
        <span className="text-sm text-muted-foreground">
          {message.content} - {format(message.createdAt, "h:mm a")}
        </span>
        {message.meetingId && onJoinMeeting && (
          <Button
            size="sm"
            onClick={() => onJoinMeeting(message.meetingId!)}
          >
            Join
          </Button>
        )}
      </div>
    );
  }

  // Regular messages (text, annotation, file)
  return (
    <div
      className="group relative flex gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar always on left */}
      <UserAvatar
        name={message.senderName}
        userId={message.senderId}
        imageUrl={message.senderAvatarUrl}
        size="md"
        className="shrink-0"
      />

      <div className="flex-1 max-w-[80%]">
        {/* Name and timestamp - Moxo format: "Name Today, Time" */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold">{message.senderName}</span>
          <span className="text-xs text-muted-foreground">
            {isToday(message.createdAt) ? "Today" : isYesterday(message.createdAt) ? "Yesterday" : format(message.createdAt, "EEE")}, {format(message.createdAt, "h:mm a")}
            {message.updatedAt && isEdited(message.createdAt, message.updatedAt) && (
              <span className="ml-1 italic">(edited)</span>
            )}
          </span>
        </div>

        {/* Quoted message (reply-to) - Moxo style with 66 quote marks */}
        {message.replyToMessage && (
          <div className="mb-2">
            <p className="text-xs text-muted-foreground mb-1">
              Re: <span className="text-primary font-medium">{message.replyToMessage.senderName}</span>
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <UserAvatar
                name={message.replyToMessage.senderName}
                imageUrl={message.replyToMessage.senderAvatarUrl}
                size="sm"
                className="shrink-0"
              />
              <span className="text-lg text-muted-foreground font-serif">"</span>
              <p className="text-sm text-muted-foreground truncate flex-1">
                {message.replyToMessage.content}
              </p>
              <span className="text-lg text-muted-foreground font-serif">"</span>
            </div>
          </div>
        )}

        {/* Annotation message */}
        {message.type === "annotation" && message.attachment && (
          <div className="mb-2">
            <p className="text-sm mb-2">
              <span className="italic text-muted-foreground">Annotated </span>
              <a
                href={message.attachment.url}
                className="text-primary hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                {message.attachment.name}
              </a>
              ...
            </p>
            <div className="rounded-lg border border-border overflow-hidden max-w-xs">
              {message.attachment.thumbnailUrl ? (
                <img
                  src={message.attachment.thumbnailUrl}
                  alt={message.attachment.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* File attachment message */}
        {message.type === "file" && message.attachment && (
          <div className="flex gap-3 p-3 rounded-lg border border-border bg-card max-w-sm">
            {/* Thumbnail */}
            <div className="shrink-0 rounded overflow-hidden">
              {message.attachment.thumbnailUrl ? (
                <img
                  src={message.attachment.thumbnailUrl}
                  alt={message.attachment.name}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            {/* File info */}
            <div className="flex-1 min-w-0">
              <a
                href={message.attachment.url}
                className="text-sm font-medium text-primary hover:underline truncate block"
                target="_blank"
                rel="noopener noreferrer"
              >
                Re: {message.attachment.name}...
              </a>
              {message.attachment.uploadedBy && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Uploaded by {message.attachment.uploadedBy}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Text content - plain text like Moxo */}
        {(message.type === "text" || (message.type !== "file" && message.content)) && (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
      </div>

      {/* Hover actions - positioned at top-right of message */}
      {isHovered && (
        <div className="absolute right-0 -top-2 flex items-center gap-0.5 bg-background border border-border rounded-md shadow-sm px-1 py-0.5">
          {/* Reply button */}
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onReply(message)}
            title="Reply"
          >
            <Reply className="h-4 w-4" />
          </button>

          {/* More menu - only show if user has actions available */}
          {isOwn && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(message.id, message.content)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  onJoin,
}: {
  meeting: Meeting;
  onJoin: () => void;
}) {
  const timeStr = `${format(meeting.startTime, "h:mm a")} - ${format(meeting.endTime, "h:mm a")}`;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-medium text-sm">{meeting.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{timeStr}</p>
        </div>
        {meeting.isActive && (
          <Button size="sm" onClick={onJoin}>
            Join
          </Button>
        )}
      </div>

      {meeting.participants && meeting.participants.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex -space-x-1.5">
            {meeting.participants.slice(0, 3).map((p) => (
              <UserAvatar
                key={p.id}
                name={p.name}
                userId={p.id}
                imageUrl={p.avatarUrl}
                size="xs"
                className="border border-background"
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {meeting.participants.length} participant{meeting.participants.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};

  messages.forEach((message) => {
    const date = message.createdAt;
    let key: string;

    if (isToday(date)) {
      key = "Today";
    } else if (isYesterday(date)) {
      key = "Yesterday";
    } else {
      key = format(date, "MMMM d, yyyy");
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(message);
  });

  return groups;
}

export type { Message, Meeting, ChatPanelProps };
