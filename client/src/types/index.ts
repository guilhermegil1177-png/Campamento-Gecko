export type UserRole = 'director' | 'monitor' | 'admin';

export interface GeckoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  camp_id?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// === CAMPS ===
export interface Camp {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date?: string;
  end_date?: string;
  active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// === SCHEDULES ===
export interface Schedule {
  id: string;
  title: string;
  description: string;
  date: string;
  camp_id?: string;
  created_by: string;
  creator?: GeckoUser;
  time_slots?: TimeSlot[];
  created_at: string;
  updated_at: string;
}

// === TIME SLOTS ===
export interface TimeSlot {
  id: string;
  schedule_id: string;
  time: string;
  title: string;
  description: string;
  notes: string[];
  assignees: string[];
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

// === ACTIVITIES ===
export type ActivityCategory = 'outdoor' | 'indoor' | 'craft' | 'sport';
export type ActivityDifficulty = 'easy' | 'medium' | 'hard';

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  instructions: string;
  video_url?: string;
  image_url?: string;
  materials: string[];
  duration_minutes: number;
  difficulty: ActivityDifficulty;
  camp_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// === PROTOCOLS (novo) ===
export type ProtocolCategory = 'safety' | 'emergency' | 'routine' | 'general';

export interface Protocol {
  id: string;
  title: string;
  content: string;
  category: ProtocolCategory;
  camp_id?: string;
  created_by: string;
  creator?: GeckoUser;
  created_at: string;
  updated_at: string;
}

// === MESSAGES ===
export interface Message {
  id: string;
  camp_id?: string;
  sender_id: string;
  sender?: GeckoUser;
  receiver_id?: string;       // null = global
  content: string;
  is_private: boolean;
  attachment_url?: string;
  created_at: string;
}

// === NOTIFICATIONS ===
export type NotificationType =
  | 'info'
  | 'warning'
  | 'success'
  | 'error'
  | 'chat'
  | 'schedule'
  | 'activity'
  | 'director_alert';

export interface AppNotification {
  id: string;
  user_id: string;
  camp_id?: string;
  schedule_id?: string;
  time_slot_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

// === MONITOR LOGS (novo) ===
export type MonitorLogType = 'presence' | 'incident' | 'observation' | 'warning';

export interface MonitorLog {
  id: string;
  monitor_id: string;
  monitor?: GeckoUser;
  camp_id: string;
  created_by: string;
  type: MonitorLogType;
  title: string;
  content: string;
  created_at: string;
}

// === AUTH ===
export interface AuthState {
  user: GeckoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
