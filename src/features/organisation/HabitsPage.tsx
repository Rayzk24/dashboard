import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ListPlus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useAppData } from "../../app/AppDataProvider";
import { AppSelect } from "../../components/ui/AppSelect";
import { Modal, Status } from "../../components/ui/Modal";
import {
  addDays,
  completion,
  habitScheduled,
  habitStats,
  logicalDayKey,
  weekDates,
  weekStart,
} from "../../lib/habits";
import type { Habit } from "../../types/domain";

export function HabitsPage() {
  const data = useAppData();
  const day = logicalDayKey(
    new Date(),
    Number(data.settings?.day_rollover_hour ?? 5),
  );
  const [week, setWeek] = useState(() => weekStart(day));
  const [selectedDate, setSelectedDate] = useState(day);
  const [form, setForm] = useState<"new" | Habit | null>(null);
  const dates = weekDates(week);
  const stats = useMemo(
    () => habitStats(data.habits, data.habitEntries, day, 30),
    [data.habits, data.habitEntries, day],
  );
  const active = data.habits
    .filter((habit) => !habit.archived_at)
    .sort((a, b) => a.position - b.position);
  const monthDates = Array.from({ length: 35 }, (_, index) =>
    addDays(weekStart(day).slice(0, 8) + "01", index),
  );
  return (
    <section className="page habits-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Habitudes</p>
          <h1>La régularité, jour après jour.</h1>
        </div>
        <button className="button primary" onClick={() => setForm("new")}>
          <ListPlus size={16} /> Ajouter une habitude
        </button>
      </div>
      <section className="panel weekly-panel">
        <header className="section-title">
          <div>
            <p className="eyebrow">Vue hebdomadaire</p>
            <h2>
              {dates[0]} → {dates[6]}
            </h2>
          </div>
          <div className="week-actions">
            <button
              className="icon-button"
              onClick={() => setWeek(addDays(week, -7))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="button subtle"
              onClick={() => setWeek(weekStart(day))}
            >
              <RotateCcw size={15} /> Aujourd’hui
            </button>
            <button
              className="icon-button"
              onClick={() => setWeek(addDays(week, 7))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </header>
        <div className="weekly-scroll">
          <div
            className="weekly-grid"
            style={{
              gridTemplateColumns:
                "minmax(132px,1.4fr) repeat(7,minmax(48px,1fr))",
            }}
          >
            <div className="weekly-corner">Habitude</div>
            {dates.map((date) => (
              <button
                className={`weekly-date ${date === day ? "today" : ""}`}
                key={date}
                onClick={() => setSelectedDate(date)}
              >
                <b>
                  {new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
                    .format(new Date(`${date}T12:00:00`))
                    .replace(".", "")}
                </b>
                <span>{date.slice(-2)}</span>
              </button>
            ))}
            {active.map((habit) => (
              <HabitWeekRow
                key={habit.id}
                habit={habit}
                dates={dates}
                selected={selectedDate}
                onSelected={setSelectedDate}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="habit-stat-grid">
        <Stat
          label="Validations (30 j)"
          value={`${stats.completed} / ${stats.scheduled}`}
        />
        <Stat
          label="Taux de complétion"
          value={`${Math.round(stats.rate * 100)} %`}
        />
        <Stat label="Streak actuel" value={`${stats.streak} j`} />
        <Stat label="Meilleur streak" value={`${stats.best} j`} />
        <Stat label="Jours réussis" value={`${stats.successfulDays}`} />
      </section>
      <div className="habits-bottom">
        <section className="panel">
          <header className="section-title">
            <div>
              <p className="eyebrow">Mois</p>
              <h2>Vue d’ensemble</h2>
            </div>
            <Status>{selectedDate}</Status>
          </header>
          <div className="month-grid">
            {monthDates.map((date) => {
              const state = completion(active, data.habitEntries, date);
              return (
                <button
                  key={date}
                  className={`month-day ${date === selectedDate ? "selected" : state.scheduled === 0 ? "empty" : state.complete ? "complete" : state.completed ? "partial" : "miss"}`}
                  onClick={() => setSelectedDate(date)}
                >
                  {date.slice(-2)}
                </button>
              );
            })}
          </div>
          <div className="month-legend">
            <span className="complete">Complet</span>
            <span className="partial">Partiel</span>
            <span className="miss">Manqué</span>
          </div>
        </section>
        <section className="panel">
          <header className="section-title">
            <div>
              <p className="eyebrow">Détail</p>
              <h2>{selectedDate}</h2>
            </div>
          </header>
          {active
            .filter((habit) => habitScheduled(habit, selectedDate))
            .map((habit) => (
              <HabitToggle key={habit.id} habit={habit} date={selectedDate} />
            ))}
        </section>
      </div>
      <section className="panel habit-manage-panel">
        <header className="section-title">
          <div>
            <p className="eyebrow">Gérer</p>
            <h2>Habitudes</h2>
          </div>
        </header>
        {data.habits
          .sort((a, b) => a.position - b.position)
          .map((habit) => (
            <div className="habit-manage-row" key={habit.id}>
              <span>
                <b>{habit.name}</b>
                <small>
                  {habit.archived_at
                    ? "Archivée"
                    : habit.frequency === "daily"
                      ? "Tous les jours"
                      : "Jours spécifiques"}
                </small>
              </span>
              <button className="text-link" onClick={() => setForm(habit)}>
                Modifier
              </button>
              <button
                className="text-link"
                onClick={() =>
                  void data.update(
                    "habits",
                    habit.id,
                    habit.archived_at
                      ? { archived_at: null, is_active: true }
                      : {
                          archived_at: new Date().toISOString(),
                          is_active: false,
                        },
                  )
                }
              >
                {habit.archived_at ? "Réactiver" : "Archiver"}
              </button>
            </div>
          ))}
      </section>
      {form && (
        <HabitForm
          habit={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  );
}
function HabitToggle({ habit, date }: { habit: Habit; date: string }) {
  const data = useAppData();
  const entry = data.habitEntries.find(
    (item) => item.habit_id === habit.id && item.entry_date === date,
  );
  return (
    <button
      className={`check-row ${entry?.completed ? "done" : ""}`}
      onClick={() =>
        void (entry
          ? data.update("habit_entries", entry.id, {
              completed: !entry.completed,
            })
          : data.create("habit_entries", {
              habit_id: habit.id,
              entry_date: date,
              completed: true,
            }))
      }
    >
      <span className="check-mark">
        {entry?.completed && <Check size={15} />}
      </span>
      {habit.name}
    </button>
  );
}
function HabitWeekRow({
  habit,
  dates,
  selected,
  onSelected,
}: {
  habit: Habit;
  dates: string[];
  selected: string;
  onSelected: (date: string) => void;
}) {
  const data = useAppData();
  return (
    <>
      {
        <div className="weekly-habit">
          <span>{habit.name}</span>
        </div>
      }
      {dates.map((date) => {
        const scheduled = habitScheduled(habit, date);
        const entry = data.habitEntries.find(
          (item) => item.habit_id === habit.id && item.entry_date === date,
        );
        return (
          <button
            className={`week-cell ${scheduled ? "" : "not-due"} ${entry?.completed ? "complete" : ""} ${date === selected ? "selected" : ""}`}
            disabled={!scheduled}
            key={`${habit.id}-${date}`}
            onClick={() => {
              onSelected(date);
              void (entry
                ? data.update("habit_entries", entry.id, {
                    completed: !entry.completed,
                  })
                : data.create("habit_entries", {
                    habit_id: habit.id,
                    entry_date: date,
                    completed: true,
                  }));
            }}
          >
            {entry?.completed && <Check size={16} />}
          </button>
        );
      })}
    </>
  );
}
function HabitForm({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const data = useAppData();
  const [name, setName] = useState(habit?.name ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly_days">(
    habit?.frequency ?? "daily",
  );
  const [days, setDays] = useState<number[]>(habit?.week_days ?? []);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (day: number) =>
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );
  const save = async () => {
    if (!name.trim()) return;
    const values = {
      name: name.trim(),
      frequency,
      week_days: frequency === "daily" ? [] : days,
    };
    if (habit) await data.update("habits", habit.id, values);
    else
      await data.create("habits", {
        ...values,
        position: data.habits.length + 1,
        is_active: true,
      });
    onClose();
  };
  const remove = async () => {
    if (!habit) return;
    setError(null);
    try {
      await data.manage("delete_habit_with_history", { p_habit_id: habit.id });
      onClose();
    } catch {
      setError("L’habitude n’a pas pu être supprimée.");
    }
  };
  const count = habit
    ? data.habitEntries.filter((entry) => entry.habit_id === habit.id).length
    : 0;
  return (
    <Modal
      title={habit ? "Modifier l’habitude" : "Nouvelle habitude"}
      onClose={onClose}
    >
      <div className="form-grid">
        <label className="field">
          <span>Nom</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Fréquence</span>
          <AppSelect
            ariaLabel="Fréquence de l’habitude"
            value={frequency}
            onChange={(value) =>
              setFrequency(value as typeof frequency)
            }
            options={[
              { value: "daily", label: "Tous les jours" },
              { value: "weekly_days", label: "Certains jours" },
            ]}
          />
        </label>
        {frequency === "weekly_days" && (
          <div className="weekday-picker">
            {[
              { label: "L", value: 1 },
              { label: "M", value: 2 },
              { label: "M", value: 3 },
              { label: "J", value: 4 },
              { label: "V", value: 5 },
              { label: "S", value: 6 },
              { label: "D", value: 0 },
            ].map(({ label, value }) => (
              <button
                className={days.includes(value) ? "selected" : ""}
                key={value}
                onClick={() => toggle(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          className="button primary"
          disabled={data.saving}
          onClick={() => void save()}
        >
          Enregistrer
        </button>
        {habit && (
          <>
            <button
              className="button brick"
              disabled={data.saving}
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={16} /> Supprimer définitivement
            </button>
            {confirming && (
              <section className="danger-confirm">
                <p>
                  <b>Supprimer définitivement cette habitude ?</b>
                </p>
                <p>
                  {count
                    ? "Cette habitude possède des validations enregistrées. Sa suppression effacera également tout son historique et ne pourra pas être annulée."
                    : "Cette action ne pourra pas être annulée."}
                </p>
                {error && <p className="form-hint">{error}</p>}
                <div className="button-row">
                  <button
                    className="button subtle"
                    onClick={() => setConfirming(false)}
                  >
                    Annuler
                  </button>
                  <button
                    className="button brick"
                    disabled={data.saving}
                    onClick={() => void remove()}
                  >
                    {data.saving ? "Suppression…" : "Confirmer la suppression"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
