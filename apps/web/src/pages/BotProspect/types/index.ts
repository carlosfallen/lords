// Types aligned with the REAL leads table (not prospectContacts)

export type LeadTemperature = 'cold' | 'warm' | 'hot' | 'cooled';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageSenderType = 'bot' | 'human' | 'lead';

/** A real CRM lead from the leads table */
export interface Lead {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  city: string | null;
  temperature: LeadTemperature;
  status: string;
  source: string | null;
  isConverted: boolean;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A message from leadConversations table */
export interface Message {
  id: string;
  leadId: string;
  direction: MessageDirection;
  senderType: MessageSenderType;
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  isRead: boolean;
  waMessageId: string | null;
  createdAt: string;
}

/** A lead with its messages for the chat view */
export interface LeadWithMessages extends Lead {
  messages: Message[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  botActive?: boolean;
}

/** Queue stats from real DB counts */
export interface QueueStats {
  total: number;
  pending: number;
  active: number;
  done: number;
  failed: number;
  isRunning: boolean;
}

/** Queue item from prospect_queues joined with leads */
export interface QueueItem {
  id: string;
  status: string;
  priority: number;
  attempts: number;
  lastError: string | null;
  scheduledAt: string;
  createdAt: string;
  contactName: string | null;
  contactPhone: string | null;
  campaignName: string | null;
}

/** Campaign */
export interface Campaign {
  id: string;
  name: string;
  channelType: string;
  status: string;
  playbookBasePrompt: string | null;
  sendRatePerHour: number;
  isActive: boolean;
  createdAt: string;
}

/** Brain event from Dolphin Engine via feed.message WS */
export interface BrainEvent {
  id: string;
  timestamp: string;
  phone: string;
  intent: string;
  confidence: number;
  mode: string;
  userInput: string;
  botResponse: string;
  latencyMs: number;
  contextUsed: boolean;
  action?: string;
  error?: string;
  pipeline?: {
    funnelPhase: string;
    microObjective: string;
    microStrategy: string;
    triggers: string[];
    semanticBank: string;
    validationPassed: boolean;
    validationRetries: number;
    generationParams: Record<string, number>;
  };
}

/** WhatsApp connection status */
export interface WhatsAppStatus {
  connected: boolean;
  session?: string;
  phoneNumber?: string;
}
