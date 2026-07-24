import {
  BriefcaseBusiness,
  Clock3,
  Database,
  Download,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppData } from "../../app/AppDataProvider";
import { AppSelect } from "../../components/ui/AppSelect";
import { PasswordChangeModal } from "./PasswordChangeModal";

export function SettingsPage({ onSignOut }: { onSignOut: () => void }) {
  const data = useAppData();
  const [name, setName] = useState(data.settings?.display_name || "Rayzk");
  const [site, setSite] = useState(data.settings?.public_site || "rayzk.fr");
  const [rate, setRate] = useState(
    String(data.settings?.default_hourly_rate || 12),
  );
  const [rollover, setRollover] = useState(
    String(data.settings?.day_rollover_hour ?? 5),
  );
  const [passwordModal, setPasswordModal] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const settingsInitialized = useRef(false);

  useEffect(() => {
    if (!data.settings || settingsInitialized.current) return;
    setName(data.settings.display_name || "Rayzk");
    setSite(data.settings.public_site || "rayzk.fr");
    setRate(String(data.settings.default_hourly_rate || 12));
    setRollover(String(data.settings.day_rollover_hour ?? 5));
    settingsInitialized.current = true;
  }, [data.settings]);

  const save = () =>
    void data.update("app_settings", data.userId, {
      display_name: name || "Rayzk",
      public_site: site || "rayzk.fr",
      default_hourly_rate: Number(rate || 12),
      day_rollover_hour: Math.max(0, Math.min(8, Number(rollover || 5))),
    });

  const exportJson = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      data: {
        habits: data.habits,
        habit_entries: data.habitEntries,
        daily_notes: data.dailyNotes,
        clients: data.clients,
        projects: data.projects,
        work_sessions: data.sessions,
        payments: data.payments,
        payment_allocations: data.allocations,
        tasks: data.tasks,
        purchases: data.purchases,
        settings: data.settings,
      },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `rayzk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page settings-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Réglages</p>
          <h1>Ton espace, à ta façon.</h1>
          <p className="page-subtitle">
            Profil, rythme de travail et sauvegarde au même endroit.
          </p>
        </div>
      </div>

      <div className="settings-stack">
        <section className="panel settings-group">
          <header className="settings-group-heading">
            <span className="settings-group-icon blue">
              <UserRound size={18} />
            </span>
            <div>
              <h2>Profil</h2>
              <p>
                Les informations visibles dans l’application et les rapports.
              </p>
            </div>
          </header>
          <div className="settings-group-fields">
            <label className="field">
              <span>Nom affiché</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Site affiché</span>
              <input
                value={site}
                onChange={(event) => setSite(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="panel settings-group">
          <header className="settings-group-heading">
            <span className="settings-group-icon violet">
              <BriefcaseBusiness size={18} />
            </span>
            <div>
              <h2>Freelance</h2>
              <p>La valeur par défaut utilisée pour les nouvelles sessions.</p>
            </div>
          </header>
          <label className="field">
            <span>Tarif horaire global (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </label>
        </section>

        <section className="panel settings-group">
          <header className="settings-group-heading">
            <span className="settings-group-icon green">
              <Clock3 size={18} />
            </span>
            <div>
              <h2>Habitudes</h2>
              <p>Définis l’heure à laquelle commence ta nouvelle journée.</p>
            </div>
          </header>
          <label className="field">
            <span>Changement de jour</span>
            <AppSelect
              ariaLabel="Heure de changement de jour"
              value={rollover}
              onChange={setRollover}
              options={Array.from({ length: 9 }, (_, hour) => ({
                value: String(hour),
                label: `${String(hour).padStart(2, "0")}:00`,
              }))}
            />
          </label>
          <p className="form-hint">
            Les habitudes et les nouvelles sessions saisies avant cette heure
            sont rattachées à la veille.
          </p>
        </section>

        <button className="button primary settings-save" onClick={save}>
          <Save size={16} /> Enregistrer les préférences
        </button>

        <section className="panel settings-group export-panel">
          <header className="settings-group-heading">
            <span className="settings-group-icon amber">
              <Database size={18} />
            </span>
            <div>
              <h2>Données</h2>
              <p>Conserve une copie locale complète avant une migration.</p>
            </div>
          </header>
          <p>
            Le fichier JSON contient tes données personnelles. La restauration
            se fait actuellement manuellement dans Supabase.
          </p>
          <button className="button subtle" onClick={exportJson}>
            <Download size={16} /> Télécharger l’export JSON
          </button>
        </section>

        <section className="panel settings-group account-group">
          <header className="settings-group-heading">
            <span className="settings-group-icon blue">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2>Compte</h2>
              <p>Sécurité du compte et session active sur cet appareil.</p>
            </div>
          </header>
          {accountNotice && (
            <p className="form-message success" role="status">
              {accountNotice}
            </p>
          )}
          <div className="account-actions">
            <button
              className="settings-action-row"
              onClick={() => {
                setAccountNotice(null);
                setPasswordModal(true);
              }}
            >
              <span className="settings-group-icon blue">
                <KeyRound size={17} />
              </span>
              <span>
                <b>Modifier le mot de passe</b>
                <small>Vérifie le mot de passe actuel avant la modification.</small>
              </span>
            </button>
            <button className="button brick" onClick={onSignOut}>
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>
        </section>
      </div>
      {passwordModal && (
        <PasswordChangeModal
          onClose={() => setPasswordModal(false)}
          onSuccess={() =>
            setAccountNotice("Votre mot de passe a bien été modifié.")
          }
          userId={data.userId}
          dataCounts={{
            clients: data.clients.length,
            habits: data.habits.length,
            sessions: data.sessions.length,
          }}
          refreshData={data.refresh}
        />
      )}
    </section>
  );
}
