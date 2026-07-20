import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAppData } from "../../app/AppDataProvider";
import {
  allocationTotal,
  durationMinutes,
  inheritedRate,
  lastProjectForClient,
  sessionAmounts,
} from "../../lib/finance";
import { euro, numberOrNull } from "../../lib/format";
import {
  logicalDayKey,
  minutesFromHoursMinutes,
  sessionPresets,
} from "../../lib/habits";
import {
  defaultProjectStatus,
  missionStatusControlValue,
  projectStatusFromControl,
  projectStatusOptions,
} from "../../lib/missionPresentation";
import type {
  Client,
  Project,
  TimeCategory,
  WorkSession,
} from "../../types/domain";
import { AppSelect } from "./AppSelect";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);
const submit = (
  event: FormEvent<HTMLFormElement>,
  action: () => Promise<void>,
) => {
  event.preventDefault();
  void action();
};

export function ClientForm({
  client,
  onDone,
}: {
  client?: Client;
  onDone?: () => void;
}) {
  const { create, saving, update } = useAppData();
  const [name, setName] = useState(client?.name ?? "");
  const [rate, setRate] = useState(client?.hourly_rate?.toString() ?? "");
  const save = async () => {
    if (!name.trim()) return;
    const values = { name: name.trim(), hourly_rate: numberOrNull(rate) };
    if (client) await update("clients", client.id, values);
    else await create("clients", { ...values, status: "active" });
    onDone?.();
  };
  return (
    <form className="form-grid" onSubmit={(event) => submit(event, save)}>
      <Field label="Nom ou pseudo">
        <input
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="Tarif horaire (€ / h)">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          placeholder="Tarif global"
        />
      </Field>
      <button disabled={saving} className="button primary">
        {client ? "Enregistrer" : "Créer le client"}
      </button>
    </form>
  );
}

export function MissionForm({
  clientId,
  mission,
  onDone,
}: {
  clientId: string;
  mission?: Project;
  onDone?: () => void;
}) {
  const { create, saving, update } = useAppData();
  const [name, setName] = useState(mission?.name ?? "");
  const [status, setStatus] = useState<Project["status"]>(
    mission?.status ?? defaultProjectStatus,
  );
  const [description, setDescription] = useState(mission?.description ?? "");
  const [rate, setRate] = useState(mission?.hourly_rate?.toString() ?? "");
  const save = async () => {
    if (!name.trim()) return;
    const values = {
      name: name.trim(),
      status,
      description,
      hourly_rate: numberOrNull(rate),
      billing_method: "hourly",
    };
    if (mission) await update("projects", mission.id, values);
    else await create("projects", { ...values, client_id: clientId });
    onDone?.();
  };
  return (
    <form className="form-grid" onSubmit={(event) => submit(event, save)}>
      <Field label="Nom de la mission">
        <input
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="Statut">
        <AppSelect
          ariaLabel="Statut de la mission"
          value={missionStatusControlValue(status)}
          onChange={(value) => setStatus(projectStatusFromControl(value))}
          options={projectStatusOptions}
        />
      </Field>
      <Field label="Description facultative">
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label="Tarif horaire facultatif">
        <input
          type="number"
          min="0"
          step="0.01"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          placeholder="Tarif du client"
        />
      </Field>
      <button disabled={saving} className="button primary">
        {mission ? "Enregistrer" : "Créer la mission"}
      </button>
    </form>
  );
}

export function SessionForm({
  clientId: fixedClientId,
  projectId: fixedProjectId,
  running = false,
  lockClient = false,
  session,
  onDone,
}: {
  clientId?: string;
  projectId?: string;
  running?: boolean;
  lockClient?: boolean;
  session?: WorkSession;
  onDone?: () => void;
}) {
  const {
    allocations,
    clients,
    create,
    projects,
    saving,
    sessions,
    settings,
    update,
  } = useAppData();
  const [clientId, setClientId] = useState(
    session?.client_id ?? fixedClientId ?? "",
  );
  const [projectId, setProjectId] = useState(
    session?.project_id ?? fixedProjectId ?? "",
  );
  const [title, setTitle] = useState(session?.title ?? "");
  const [date, setDate] = useState(
    session?.session_date ??
      logicalDayKey(new Date(), Number(settings?.day_rollover_hour ?? 5)),
  );
  const [hours, setHours] = useState(
    String(Math.floor(Number(session?.duration_minutes ?? 60) / 60)),
  );
  const [minutes, setMinutes] = useState(
    String(Number(session?.duration_minutes ?? 60) % 60),
  );
  const [description, setDescription] = useState(
    session?.public_description ?? "",
  );
  const [advanced, setAdvanced] = useState(
    Boolean(
      session?.private_notes || session?.commission_rate || session?.started_at,
    ),
  );
  const [rate, setRate] = useState(session ? String(session.hourly_rate) : "");
  const [commission, setCommission] = useState(
    session?.commission_rate ? String(session.commission_rate) : "",
  );
  const [category, setCategory] = useState<TimeCategory>(
    session?.time_category ?? "billable",
  );
  const [privateNotes, setPrivateNotes] = useState(
    session?.private_notes ?? "",
  );
  const [times, setTimes] = useState(
    Boolean(session?.started_at || session?.ended_at),
  );
  const [startTime, setStartTime] = useState(
    session?.started_at
      ? new Date(session.started_at).toTimeString().slice(0, 5)
      : "",
  );
  const [endTime, setEndTime] = useState(
    session?.ended_at
      ? new Date(session.ended_at).toTimeString().slice(0, 5)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const client = clients.find((item) => item.id === clientId);
  const options = projects.filter(
    (item) => item.client_id === clientId && item.status !== "archived",
  );
  const project = options.find((item) => item.id === projectId);
  useEffect(() => {
    if (session || !clientId) return;
    if (fixedProjectId) {
      setProjectId(fixedProjectId);
      return;
    }
    const suggestion = lastProjectForClient(clientId, sessions);
    setProjectId(
      suggestion && options.some((item) => item.id === suggestion)
        ? suggestion
        : "",
    );
  }, [clientId, fixedProjectId, options, session, sessions]);
  const duration = minutesFromHoursMinutes(
    Number(hours || 0),
    Number(minutes || 0),
  );
  const exactStart =
    times && startTime ? new Date(`${date}T${startTime}`).toISOString() : null;
  const exactEnd =
    times && endTime ? new Date(`${date}T${endTime}`).toISOString() : null;
  const actualDuration = running
    ? 0
    : durationMinutes(exactStart, exactEnd, duration);
  const appliedRate = session
    ? Number(rate || 0)
    : inheritedRate(
        numberOrNull(rate),
        project,
        client,
        Number(settings?.default_hourly_rate ?? 12),
      );
  const appliedCommission =
    numberOrNull(commission) ?? Number(project?.commission_rate ?? 0);
  const preview = sessionAmounts(
    actualDuration,
    appliedRate,
    appliedCommission,
    category,
  );
  const durationLabel = [
    Math.floor(actualDuration / 60)
      ? `${Math.floor(actualDuration / 60)} h`
      : "",
    actualDuration % 60 ? `${actualDuration % 60} min` : "",
  ]
    .filter(Boolean)
    .join(" ") || "0 min";
  const commissionLabel = appliedCommission.toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  });
  const save = async () => {
    setError(null);
    if (!client || !title.trim()) {
      setError("Le titre de la session est obligatoire.");
      return;
    }
    const alreadyAllocated = session
      ? allocationTotal(session.id, allocations)
      : 0;
    if (preview.gross < alreadyAllocated) {
      setError(
        `Cette session possède déjà ${euro(alreadyAllocated)} attribués par des règlements. Son nouveau montant ne peut pas être inférieur à cette somme. Modifiez d’abord les règlements concernés.`,
      );
      return;
    }
    const values = {
      project_id: projectId || null,
      title: title.trim(),
      session_date: date,
      started_at: running ? new Date().toISOString() : exactStart,
      ended_at: running ? null : exactEnd,
      duration_minutes: running ? null : actualDuration,
      is_running: running,
      public_description: description,
      private_notes: privateNotes,
      hourly_rate: appliedRate,
      commission_rate: appliedCommission,
      time_category: category,
      gross_amount: preview.gross,
      commission_amount: preview.commission,
      net_amount: preview.net,
    };
    try {
      if (session) await update("work_sessions", session.id, values);
      else await create("work_sessions", { ...values, client_id: client.id });
      onDone?.();
    } catch {
      setError("La session n’a pas pu être enregistrée.");
    }
  };
  return (
    <form
      className="form-grid session-form"
      onSubmit={(event) => submit(event, save)}
    >
      {error && <p className="form-hint">{error}</p>}
      <Field label="Client">
        {(lockClient || session) && client ? (
          <div className="locked-field">{client.name}</div>
        ) : (
          <AppSelect
            ariaLabel="Client de la session"
            value={clientId}
            onChange={setClientId}
            options={[
              { value: "", label: "Choisir un client" },
              ...clients
                .filter((item) => item.status !== "archived")
                .map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        )}
      </Field>
      <Field label="Mission facultative">
        <AppSelect
          ariaLabel="Mission de la session"
          value={projectId}
          onChange={setProjectId}
          disabled={!clientId}
          options={[
            { value: "", label: "Aucune mission" },
            ...options.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
      </Field>
      <Field label="Titre de la session">
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Conversion des modèles"
        />
      </Field>
      <Field label="Date">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>
      {running ? (
        <div className="timer-info">
          La minuterie démarre maintenant et reste active après un
          rafraîchissement.
        </div>
      ) : (
        <>
          <div className="field-row">
            <Field label="Heures">
              <input
                inputMode="numeric"
                type="number"
                min="0"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              />
            </Field>
            <Field label="Minutes">
              <input
                inputMode="numeric"
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </Field>
          </div>
          <div className="duration-presets">
            {sessionPresets.map((preset) => (
              <button
                type="button"
                key={preset.minutes}
                className={duration === preset.minutes ? "selected" : ""}
                aria-pressed={duration === preset.minutes}
                onClick={() => {
                  setHours(String(Math.floor(preset.minutes / 60)));
                  setMinutes(String(preset.minutes % 60));
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
      <Field label="Description publique">
        <textarea
          className="session-description"
          rows={3}
          value={description}
          onChange={(event) => {
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            setDescription(event.target.value);
          }}
          placeholder="Travail réalisé, paragraphes compris…"
        />
      </Field>
      {!running && (
        <div className="session-financial-preview">
          <p className="financial-formula">
            <span>{durationLabel}</span>
            <span aria-hidden="true">×</span>
            <span>{euro(appliedRate)} / h</span>
            <span aria-hidden="true">=</span>
            <b>{euro(preview.gross)}</b>
          </p>
          {appliedCommission > 0 && (
            <div className="financial-breakdown">
              <div>
                <span>Valeur du travail</span>
                <b>{euro(preview.gross)}</b>
              </div>
              <div>
                <span>Commission de {commissionLabel} %</span>
                <b>−{euro(preview.commission)}</b>
              </div>
              <div className="financial-net">
                <span>Net personnel</span>
                <strong>{euro(preview.net)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
      <button
        className="text-link"
        type="button"
        onClick={() => setAdvanced(!advanced)}
      >
        {advanced ? "Masquer les options avancées" : "Options avancées"}
      </button>
      {advanced && (
        <div className="advanced-session">
          <div className="field-row">
            <Field label="Tarif exceptionnel">
              <input
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="Tarif hérité"
              />
            </Field>
            <Field label="Commission (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          <Field label="Catégorie">
            <AppSelect
              ariaLabel="Catégorie de la session"
              value={category}
              onChange={(value) =>
                setCategory(value as TimeCategory)
              }
              options={[
                { value: "billable", label: "Facturable" },
                { value: "research", label: "Apprentissage / recherche" },
              ]}
            />
          </Field>
          <Field label="Note privée">
            <textarea
              rows={2}
              value={privateNotes}
              onChange={(event) => setPrivateNotes(event.target.value)}
              placeholder="Jamais incluse dans les rapports"
            />
          </Field>
          <button
            type="button"
            className="text-link"
            onClick={() => setTimes(!times)}
          >
            {times ? "Masquer les heures exactes" : "Saisir les heures exactes"}
          </button>
          {times && (
            <div className="field-row">
              <Field label="Début">
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </Field>
              <Field label="Fin">
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </Field>
            </div>
          )}
        </div>
      )}
      <button disabled={saving} className="button primary">
        {running
          ? "Démarrer la minuterie"
          : session
            ? "Enregistrer les modifications"
            : "Enregistrer la session"}
      </button>
    </form>
  );
}

export function PaymentForm({
  client,
  projectId,
  onDone,
}: {
  client: Client;
  projectId?: string;
  onDone?: () => void;
}) {
  const { manage, saving } = useAppData();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const received = Number(amount);
    if (!Number.isFinite(received) || received <= 0) {
      setError("Saisissez un montant positif.");
      return;
    }
    setError(null);
    try {
      await manage("create_payment_and_rebuild_allocations", {
        p_client_id: client.id,
        p_project_id: projectId ?? null,
        p_amount: received,
        p_payment_date: date,
      });
      onDone?.();
    } catch {
      setError("Le règlement n’a pas pu être enregistré.");
    }
  };
  return (
    <form className="form-grid" onSubmit={(event) => submit(event, save)}>
      {error && <p className="form-hint">{error}</p>}
      <Field label="Montant reçu (€)">
        <input
          autoFocus
          required
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <Field label="Date">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>
      <p className="form-hint">
        Le règlement est réparti automatiquement sur les sessions facturables
        les plus anciennes restantes.
      </p>
      <button disabled={saving} className="button primary">
        Enregistrer le règlement
      </button>
    </form>
  );
}

export function PurchaseForm({ onDone }: { onDone?: () => void }) {
  const { create, saving } = useAppData();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"urgent" | "useful" | "not_urgent">(
    "useful",
  );
  const [certainty, setCertainty] = useState<"sure" | "thinking" | "idea">(
    "thinking",
  );
  const [note, setNote] = useState("");
  const save = async () => {
    if (!name.trim()) return;
    await create("purchases", {
      name: name.trim(),
      estimated_price: numberOrNull(price),
      url: url || null,
      category: category || null,
      priority,
      certainty,
      status: "considering",
      note,
    });
    onDone?.();
  };
  return (
    <form className="form-grid" onSubmit={(event) => submit(event, save)}>
      <Field label="Achat">
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="Prix estimé (€)">
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </Field>
      <Field label="Lien facultatif">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </Field>
      <Field label="Catégorie">
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </Field>
      <div className="field-row">
        <Field label="Priorité">
          <AppSelect
            ariaLabel="Priorité de l’achat"
            value={priority}
            onChange={(value) =>
              setPriority(value as typeof priority)
            }
            options={[
              { value: "urgent", label: "Urgent" },
              { value: "useful", label: "Utile" },
              { value: "not_urgent", label: "Pas urgent" },
            ]}
          />
        </Field>
        <Field label="Certitude">
          <AppSelect
            ariaLabel="Certitude de l’achat"
            value={certainty}
            onChange={(value) =>
              setCertainty(value as typeof certainty)
            }
            options={[
              { value: "sure", label: "Sûr" },
              { value: "thinking", label: "À réfléchir" },
              { value: "idea", label: "Idée" },
            ]}
          />
        </Field>
      </div>
      <Field label="Note">
        <textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <button disabled={saving} className="button primary">
        Ajouter l'achat
      </button>
    </form>
  );
}

export function stopRunningSession(
  session: WorkSession,
  update: ReturnType<typeof useAppData>["update"],
) {
  const end = new Date().toISOString();
  const minutes = durationMinutes(session.started_at, end);
  const amounts = sessionAmounts(
    minutes,
    Number(session.hourly_rate),
    Number(session.commission_rate),
    session.time_category,
  );
  return update("work_sessions", session.id, {
    is_running: false,
    ended_at: end,
    duration_minutes: minutes,
    gross_amount: amounts.gross,
    commission_amount: amounts.commission,
    net_amount: amounts.net,
  });
}
