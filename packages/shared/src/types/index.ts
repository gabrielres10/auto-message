export type MessageStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export interface SendMessageJobData {
  messageId: string;
  recipient: string;
  content: string;
  scheduledAt: string; // ISO 8601
}

export interface ScheduledMessageDTO {
  id: string;
  userId: string;
  recipient: string;
  content: string;
  scheduledAt: string;
  status: MessageStatus;
  jobId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageInput {
  recipient: string;
  content: string;
  scheduledAt: string; // ISO 8601
}
