import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://shqspoipwrvvaapscdms.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: get current user profile from users table
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data;
}

// Helper: fetch all schedules with time_slots
export async function fetchSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select(`*, time_slots(*)`)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

// Helper: fetch single schedule
export async function fetchSchedule(id: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select(`*, time_slots(*)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Helper: fetch activities
export async function fetchActivities() {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
