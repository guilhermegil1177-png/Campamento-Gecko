/**
 * Campamento Gecko - Type Definitions
 * Alinhado com schema Supabase do PDF
 */

// === AUTH & USERS ===
export type UserRole = 'director' | 'monitor' | 'admin';

export interface GeckoUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: GeckoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// === SCHEDULES ===
export interface Schedule {
  id: string;
  title: string;        // ex: "Día 6 - PILONES"
  description: string;
  date: string;         // YYYY-MM-DD
  created_by: string;   // FK: users.id
  creator?: GeckoUser;
  time_slots?: TimeSlot[];
  created_at: string;
  updated_at: string;
}

// === TIME SLOTS ===
export interface TimeSlot {
  id: string;
  schedule_id: string;
  time: string;           // "07:50"
  title: string;
  description: string;
  notes: string[];        // JSON array
  assignees: string[];    // JSON array de nomes/IDs monitores
  completed: boolean;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

// === ACTIVITIES (Biblioteca) ===
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
  materials: string[];      // JSON array
  duration_minutes: number;
  difficulty: ActivityDifficulty;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// === MESSAGES ===
export interface Message {
  id: string;
  schedule_id: string;
  sender_id: string;
  sender?: GeckoUser;
  content: string;
  attachment_url?: string;
  created_at: string;
}

// === NOTIFICATIONS ===
export interface AppNotification {
  id: string;
  user_id: string;
  schedule_id?: string;
  time_slot_id?: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// === LOCAL / OFFLINE (compatibilidade backward) ===
export interface CampDay {
  id: string;
  dayNumber: number;
  title: string;
  date?: string;
  timeSlots: TimeSlot[];
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  schedules: Schedule[];
  currentScheduleId: string | null;
  notifications: AppNotification[];
  lastSync: number;
}
