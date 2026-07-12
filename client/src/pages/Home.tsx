import { useEffect, useState } from 'react';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { initializeSampleData } from '@/lib/sampleData';
import TimeSlotCard from '@/components/TimeSlotCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Bell, Settings, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import type { CampDay, TimeSlot } from '@/types';

/**
 * Home Page - Camp Scheduler
 * Design: Outdoor Adventure Aesthetic
 * Timeline vertical com cards expansíveis, notificações a cada 10 min antes de cada hora
 */
export default function Home() {
  const { getDays, saveDays, saveDay } = useOfflineStorage();
  const { scheduleNotificationsForDay } = useNotificationManager();
  const [, setLocation] = useLocation();

  const [days, setDays] = useState<CampDay[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  // Carregar dados ao montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedDays = await getDays();

        if (savedDays.length === 0) {
          // Inicializar com dados de exemplo
          const sampleDays = initializeSampleData();
          await saveDays(sampleDays);
          setDays(sampleDays);

          // Agendar notificações para cada dia
          for (const day of sampleDays) {
            await scheduleNotificationsForDay(day);
          }
        } else {
          setDays(savedDays);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Atualizar contagem de notificações
  useEffect(() => {
    // Contar notificações não enviadas
    if (days.length > 0) {
      const currentDay = days[currentDayIndex];
      const pendingCount = currentDay.timeSlots.filter((slot) => !slot.completed).length;
      setNotificationCount(pendingCount);
    }
  }, [days, currentDayIndex]);

  const currentDay = days[currentDayIndex];

  const handlePreviousDay = () => {
    setCurrentDayIndex((prev) => (prev > 0 ? prev - 1 : days.length - 1));
  };

  const handleNextDay = () => {
    setCurrentDayIndex((prev) => (prev < days.length - 1 ? prev + 1 : 0));
  };

  const handleToggleComplete = async (slotId: string) => {
    if (!currentDay) return;

    const updatedDay = {
      ...currentDay,
      timeSlots: currentDay.timeSlots.map((slot) =>
        slot.id === slotId ? { ...slot, completed: !slot.completed } : slot
      ),
      updatedAt: Date.now(),
    };

    await saveDay(updatedDay);

    // Atualizar estado local
    const updatedDays = days.map((day) => (day.id === currentDay.id ? updatedDay : day));
    setDays(updatedDays);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-cream to-muted">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-warm-tan border-t-forest-green p-4" />
          <p className="text-lg font-semibold text-charcoal">A carregar...</p>
        </div>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-cream to-muted">
        <div className="text-center">
          <p className="text-lg text-charcoal">Nenhum dia de acampamento criado</p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Novo Dia
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-muted pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-2 border-warm-tan bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img
                src="/manus-storage/camp-logo_318861f1.png"
                alt="Camp Scheduler"
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold text-forest-green" style={{ fontFamily: "'Playfair Display', serif" }}>
                Camp Scheduler
              </h1>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button className="relative rounded-full p-2 hover:bg-muted transition-colors">
                <Bell className="h-5 w-5 text-forest-green" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setLocation('/settings')}
                className="rounded-full p-2 hover:bg-muted transition-colors"
              >
                <Settings className="h-5 w-5 text-forest-green" />
              </button>
              <button
                onClick={() => setLocation('/import')}
                className="rounded-full p-2 hover:bg-muted transition-colors"
              >
                <Upload className="h-5 w-5 text-forest-green" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Day Navigation */}
      {currentDay && (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousDay}
              className="h-10 w-10 p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex-1 text-center">
              <h2 className="text-3xl font-bold text-forest-green" style={{ fontFamily: "'Playfair Display', serif" }}>
                {currentDay.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentDay.timeSlots.filter((s) => s.completed).length} /{' '}
                {currentDay.timeSlots.length} concluído
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="h-10 w-10 p-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-forest-green to-sky-blue transition-all duration-500"
              style={{
                width: `${
                  (currentDay.timeSlots.filter((s) => s.completed).length /
                    currentDay.timeSlots.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      {currentDay && (
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-2">
            {currentDay.timeSlots.map((slot, index) => (
              <div
                key={slot.id}
                className="animate-in fade-in slide-in-from-bottom-4"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'both',
                }}
              >
                <TimeSlotCard
                  slot={slot}
                  onToggleComplete={handleToggleComplete}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>Aplicação funciona offline • Notificações 10 min antes de cada atividade</p>
      </footer>
    </div>
  );
}
