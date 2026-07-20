import { useMemo, useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useAppData } from "../../app/AppDataProvider";
import { AppSelect } from "../../components/ui/AppSelect";
import { PurchaseForm } from "../../components/ui/Forms";
import { Empty, Modal } from "../../components/ui/Modal";
import { euro, numberOrNull } from "../../lib/format";
import {
  filterAndSortPurchases,
  type PurchaseFilter,
} from "../../lib/purchases";
import type { Purchase } from "../../types/domain";

export function PersonalPage() {
  const data = useAppData();
  const [filter, setFilter] = useState<PurchaseFilter>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const rows = useMemo(
    () => filterAndSortPurchases(data.purchases, filter),
    [filter, data.purchases],
  );
  const planned = data.purchases
    .filter((item) => item.status === "planned")
    .reduce((sum, item) => sum + Number(item.estimated_price || 0), 0);
  return (
    <section className="page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Personnel</p>
          <h1>Les achats qui comptent vraiment.</h1>
        </div>
        <button className="button primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Ajouter un achat
        </button>
      </div>
      <section className="panel purchases-panel">
        <header className="section-title purchases-header">
          <div>
            <p className="eyebrow">Liste d’achats</p>
            <h2>{euro(planned)} prévus</h2>
          </div>
          <div className="filter-tabs purchase-filter-tabs">
            {(["all", "planned", "considering"] as const).map((item) => (
              <button
                key={item}
                className={filter === item ? "selected" : ""}
                onClick={() => setFilter(item)}
              >
                {item === "all"
                  ? "Tout"
                  : item === "planned"
                    ? "Prévus"
                    : "Envisagés"}
              </button>
            ))}
          </div>
        </header>
        {rows.length ? (
          <div className="purchase-list">
            {rows.map((item) => (
              <article className="purchase-row" key={item.id}>
                <div>
                  <span
                    className={`priority-dot ${item.priority === "not_urgent" ? "normal" : item.priority}`}
                  />
                  <b>{item.name}</b>
                  <small>
                    {item.category || "Sans catégorie"} ·{" "}
                    {item.certainty === "sure"
                      ? "Sûr"
                      : item.certainty === "idea"
                        ? "Idée"
                        : "À réfléchir"}
                  </small>
                </div>
                <div className="purchase-actions">
                  <strong>
                    {item.estimated_price === null
                      ? "—"
                      : euro(Number(item.estimated_price))}
                  </strong>
                  <AppSelect
                    className="purchase-status-select"
                    ariaLabel={`Statut de ${item.name}`}
                    value={item.status}
                    onChange={(value) =>
                      void data.update("purchases", item.id, {
                        status: value,
                        purchased_at:
                          value === "bought"
                            ? new Date().toISOString().slice(0, 10)
                            : null,
                      })
                    }
                    options={[
                      { value: "considering", label: "Envisagé" },
                      { value: "planned", label: "Prévu" },
                      { value: "bought", label: "Acheté" },
                      { value: "abandoned", label: "Abandonné" },
                    ]}
                  />
                  <button
                    className="icon-button"
                    onClick={() => setEditing(item)}
                    aria-label="Modifier"
                  >
                    <Pencil size={16} />
                  </button>
                  {item.url && (
                    <a
                      className="icon-button"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Ouvrir le lien"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    className="icon-button"
                    aria-label="Supprimer"
                    onClick={() => {
                      if (window.confirm(`Supprimer « ${item.name} » ?`))
                        void data.remove("purchases", item.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty>Aucun achat dans cette vue.</Empty>
        )}
      </section>
      {adding && (
        <Modal title="Nouvel achat" onClose={() => setAdding(false)}>
          <PurchaseForm onDone={() => setAdding(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Modifier l’achat" onClose={() => setEditing(null)}>
          <PurchaseEdit purchase={editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </section>
  );
}
function PurchaseEdit({
  purchase,
  onDone,
}: {
  purchase: Purchase;
  onDone: () => void;
}) {
  const { update } = useAppData();
  const [name, setName] = useState(purchase.name);
  const [price, setPrice] = useState(
    purchase.estimated_price?.toString() ?? "",
  );
  const [url, setUrl] = useState(purchase.url ?? "");
  const [category, setCategory] = useState(purchase.category ?? "");
  const [note, setNote] = useState(purchase.note);
  const [priority, setPriority] = useState(purchase.priority);
  const [certainty, setCertainty] = useState(purchase.certainty);
  const [status, setStatus] = useState(purchase.status);
  const save = async () => {
    if (!name.trim()) return;
    await update("purchases", purchase.id, {
      name: name.trim(),
      estimated_price: numberOrNull(price),
      url: url || null,
      category: category || null,
      note,
      priority,
      certainty,
      status,
    });
    onDone();
  };
  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="field">
        <span>Nom</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Prix (€)</span>
        <input
          type="number"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Lien</span>
        <input value={url} onChange={(event) => setUrl(event.target.value)} />
      </label>
      <label className="field">
        <span>Catégorie</span>
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Priorité</span>
          <AppSelect
            ariaLabel="Priorité de l’achat"
            value={priority}
            onChange={(value) =>
              setPriority(value as Purchase["priority"])
            }
            options={[
              { value: "urgent", label: "Urgent" },
              { value: "useful", label: "Utile" },
              { value: "not_urgent", label: "Pas urgent" },
            ]}
          />
        </label>
        <label className="field">
          <span>Certitude</span>
          <AppSelect
            ariaLabel="Certitude de l’achat"
            value={certainty}
            onChange={(value) =>
              setCertainty(value as Purchase["certainty"])
            }
            options={[
              { value: "sure", label: "Sûr" },
              { value: "thinking", label: "À réfléchir" },
              { value: "idea", label: "Idée" },
            ]}
          />
        </label>
      </div>
      <label className="field">
        <span>Statut</span>
        <AppSelect
          ariaLabel="Statut de l’achat"
          value={status}
          onChange={(value) =>
            setStatus(value as Purchase["status"])
          }
          options={[
            { value: "considering", label: "Envisagé" },
            { value: "planned", label: "Prévu" },
            { value: "bought", label: "Acheté" },
            { value: "abandoned", label: "Abandonné" },
          ]}
        />
      </label>
      <label className="field">
        <span>Note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button className="button primary">Enregistrer</button>
    </form>
  );
}
