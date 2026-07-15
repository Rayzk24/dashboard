import type { Habit, HabitEntry, Task } from '../types/domain';
import { todayKey } from './format';
export function habitDue(habit: Habit, date = todayKey()) { if (!habit.is_active || habit.archived_at) return false; if (habit.frequency === 'daily') return true; const weekday = new Date(`${date}T12:00:00`).getDay(); return habit.week_days.includes(weekday); }
export function completionForDate(habits: Habit[], entries: HabitEntry[], date: string) { const due = habits.filter((habit) => habitDue(habit, date)); const done = due.filter((habit) => entries.some((entry) => entry.habit_id === habit.id && entry.entry_date === date && entry.completed)).length; return { due: due.length, done, rate: due.length ? done / due.length : 0 }; }
export function taskPriority(task: Task) { return task.priority === 'high' ? 0 : task.priority === 'normal' ? 1 : 2; }
