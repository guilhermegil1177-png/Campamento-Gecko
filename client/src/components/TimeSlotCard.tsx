import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimeSlot } from '@/types';

interface TimeSlotCardProps {
  slot: TimeSlot;
  onToggleComplete?: (id: string) => void;
}

export default function TimeSlotCard({ slot, onToggleComplete }: TimeSlotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`
        relative mb-4 rounded-lg border-2 transition-all duration-300
        ${slot.completed ? 'border-green-400 bg-green-50' : 'border-warm-tan bg-white'}
        hover:shadow-lg hover:-translate-y-1
      `}
    >
      {/* Time Badge */}
      <div className="absolute -left-3 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-forest-green text-cream font-mono font-bold text-sm shadow-md">
        {slot.time}
      </div>

      {/* Card Content */}
      <div className="ml-8 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-charcoal" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {slot.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {slot.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {slot.completed && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-400">
                <Check className="h-5 w-5 text-white" />
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-3 border-t border-border pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Full Description */}
            {slot.description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Descrição
                </p>
                <p className="mt-1 text-sm text-foreground">{slot.description}</p>
              </div>
            )}

            {/* Notes */}
            {slot.notes && slot.notes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Notas
                </p>
                <ul className="mt-2 space-y-1">
                  {slot.notes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-forest-green flex-shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assignees */}
            {slot.assignees && slot.assignees.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Responsáveis
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slot.assignees.map((assignee, idx) => (
                    <span
                      key={idx}
                      className="inline-block rounded-full bg-sky-blue/10 px-3 py-1 text-xs font-medium text-sky-blue"
                    >
                      {assignee}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Button */}
            {onToggleComplete && (
              <Button
                onClick={() => onToggleComplete(slot.id)}
                variant={slot.completed ? 'outline' : 'default'}
                className="mt-4 w-full"
              >
                {slot.completed ? 'Marcar como Pendente' : 'Marcar Concluído'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
