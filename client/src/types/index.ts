/**
 * Camp Scheduler - Type Definitions
 * Estruturas de dados para esquemas diários de acampamento
 */

export interface TimeSlot {
  id: string;
  time: string; // Formato HH:MM (e.g., "07:50")
  title: string; // Título da atividade (e.g., "Despertador")
  description: string; // Descrição detalhada
  notes: string[]; // Notas/instruções adicionais
  assignees?: string[]; // Pessoas responsáveis
  completed?: boolean;
  notificationSent?: boolean;
}

export interface CampDay {
  id: string;
  dayNumber: number;
  title: string; // Título do dia (e.g., "Día 6 - PILONES")
  date?: string; // Data no formato YYYY-MM-DD
  timeSlots: TimeSlot[];
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface Notification {
  id: string;
  dayId: string;
  timeSlotId: string;
  title: string;
  body: string;
  scheduledTime: number; // Timestamp de quando enviar (10 min antes)
  sent: boolean;
  createdAt: number;
}

export interface AppState {
  days: CampDay[];
  currentDayId: string | null;
  notifications: Notification[];
  lastSync: number;
}

export interface NotificationSchedule {
  timeSlotId: string;
  dayId: string;
  title: string;
  description: string;
  scheduledTime: number; // 10 minutos antes da hora
  originalTime: string; // Hora original (HH:MM)
}
