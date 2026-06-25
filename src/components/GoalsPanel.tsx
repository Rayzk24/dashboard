import { Flag } from 'lucide-react';
import type { SummerGoal, SummerGoalPatch } from '../types';
import CheckboxRow from './CheckboxRow';

type GoalsPanelProps = {
  goals: SummerGoal[];
  onUpdate: (goalId: string, patch: SummerGoalPatch) => void;
};

export default function GoalsPanel({ goals, onUpdate }: GoalsPanelProps) {
  const completed = goals.filter((goal) => goal.completed).length;

  return (
    <section className="panel p-6 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-forest">
            Objectifs de l'été
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">Progression</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-sm font-bold text-ink">
          <Flag size={16} />
          {completed} / {goals.length}
        </div>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <CheckboxRow
            checked={goal.completed}
            key={goal.id}
            label={goal.title}
            onToggle={() => onUpdate(goal.id, { completed: !goal.completed })}
          />
        ))}
      </div>
    </section>
  );
}
