export type DailyEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  code_done: boolean;
  learning_done: boolean;
  outside_done: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type DailyEntryPatch = Partial<
  Pick<DailyEntry, 'code_done' | 'learning_done' | 'outside_done' | 'notes'>
>;

export type SummerGoal = {
  id: string;
  user_id: string;
  goal_key: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type SummerGoalPatch = Partial<Pick<SummerGoal, 'completed'>>;
