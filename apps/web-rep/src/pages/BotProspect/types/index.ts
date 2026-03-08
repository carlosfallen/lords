export type ContactStatus = 'pending' | 'queued' | 'in_progress' | 'scheduled' | 'no_interest' | 'no_response' | 'callback' | 'done';
export type ConversationStatus = 'queued' | 'active' | 'human_takeover' | 'waiting_response' | 'completed' | 'failed';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageSenderType = 'bot' | 'human' | 'lead';

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  opt_in: number;
  opt_in_at: string | null;
  city?: string | null;
  state?: string | null;
  status: ContactStatus;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  type: string;
  sender_type: MessageSenderType;
  sender_id: string | null;
  zapi_message_id: string | null;
  status: string;
  error_detail: string | null;
  sent_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  phone: string;
  status: ConversationStatus;
  bot_active: number;
  step: number;
  result: string | null;
  assigned_to: string | null;
  started_at: string | null;
  ended_at: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithContact extends Conversation {
  contact: Contact;
  messages: Message[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isHumanTakeover?: boolean;
}

export interface QueueStats {
  total: number;
  pending: number;
  inProgress: number;
  scheduled: number;
  noInterest: number;
  done: number;
  optInRequired: number;
  isRunning: boolean;
  processing: number;
}

export interface AuditLog {
  id: string;
  event: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  actor_type: string;
  payload: string | null;
  ip: string | null;
  created_at: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  session?: string;
  smartphoneConnected?: boolean;
  phoneNumber?: string;
  batteryLevel?: number;
}
