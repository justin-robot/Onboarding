"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Input } from "@repo/design/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/design/components/ui/avatar";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design/components/ui/popover";
import {
  MessageSquare,
  Video,
  Send,
  Paperclip,
  Smile,
  ArrowDown,
  Image as ImageIcon,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { toast } from "sonner";

// Common emoji categories for quick access
const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "😘", "😗"] },
  { name: "Gestures", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🖐️", "✋", "👏", "🙌", "🤝", "🙏", "💪"] },
  { name: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖"] },
  { name: "Objects", emojis: ["⭐", "🔥", "✨", "💯", "✅", "❌", "⚡", "💡", "🎉", "🎊", "🎁", "📌", "📍", "🔔", "💬", "📝"] },
];

type MessageType = "text" | "annotation" | "system" | "file";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  createdAt: Date;
  attachment?: {
    name: string;
    type: string;
    url?: string;
    thumbnailUrl?: string;
  };
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
  meetings: Meeting[];
  currentUserId: string;
  workspaceId: string;
  onSendMessage?: (content: string, attachment?: File) => Promise<void>;
  onJoinMeeting?: (meetingId: string) => void;
}

export function ChatPanel({
  messages,
  meetings,
  currentUserId,
  workspaceId,
  onSendMessage,
  onJoinMeeting,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "meetings">("chat");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      await onSendMessage?.(newMessage.trim(), selectedFile || undefined);
      setNewMessage("");
      setSelectedFile(null);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
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
    setEmojiPickerOpen(false);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex h-full flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "meetings")} className="flex h-full flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
          <TabsTrigger value="chat" className="text-xs">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Chat
            {messages.length > 0 && (
              <span className="ml-1 text-muted-foreground">({messages.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs">
            <Video className="mr-1.5 h-3.5 w-3.5" />
            Meetings
            {meetings.length > 0 && (
              <span className="ml-1 text-muted-foreground">({meetings.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
          {/* Messages */}
          <ScrollArea
            viewportRef={scrollAreaRef}
            className="flex-1"
            onScrollCapture={handleScroll}
            scrollbarClassName="bg-muted-foreground/20 hover:bg-muted-foreground/40"
          >
            <div className="p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
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

            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                className="flex-1"
              />

              {/* Emoji picker */}
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Smile className="h-4 w-4" />
                  </Button>
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

              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !selectedFile) || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="flex-1 mt-0 overflow-auto">
          <div className="p-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground px-2">{date}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  if (message.type === "system") {
    return (
      <div className="text-center">
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={message.senderAvatarUrl} alt={message.senderName} />
        <AvatarFallback className="text-xs">
          {message.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={cn("max-w-[75%]", isOwn && "text-right")}>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-medium">{message.senderName}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(message.createdAt, "h:mm a")}
          </span>
        </div>

        {message.type === "annotation" && message.attachment && (
          <div className="mb-1.5 rounded-lg border border-border bg-muted/50 p-2">
            <div className="flex items-center gap-2">
              {message.attachment.thumbnailUrl ? (
                <img
                  src={message.attachment.thumbnailUrl}
                  alt={message.attachment.name}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{message.attachment.name}</p>
                <p className="text-[10px] text-muted-foreground">Annotated</p>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isOwn
              ? "bg-blue-500 text-white"
              : "bg-muted"
          )}
        >
          {message.content}
        </div>
      </div>
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
              <Avatar key={p.id} className="h-5 w-5 border border-background">
                <AvatarImage src={p.avatarUrl} alt={p.name} />
                <AvatarFallback className="text-[8px]">
                  {p.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
