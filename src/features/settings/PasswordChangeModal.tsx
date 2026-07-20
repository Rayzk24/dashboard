import { Eye, EyeOff, KeyRound } from "lucide-react";
import {
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { Modal } from "../../components/ui/Modal";
import {
  changeCurrentUserPassword,
  emptyPasswordChangeInput,
  PasswordChangeError,
  type PasswordAuthClient,
  validatePasswordChange,
} from "../../lib/passwordChange";
import { supabase } from "../../lib/supabase";

type PasswordFieldProps = {
  label: string;
  value: string;
  autoComplete: "current-password" | "new-password";
  visible: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
};

function PasswordField({
  label,
  value,
  autoComplete,
  visible,
  disabled,
  onChange,
  onToggle,
  inputRef,
}: PasswordFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="password-field-control">
        <input
          ref={inputRef}
          type={visible ? "text" : "password"}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="password-visibility"
          disabled={disabled}
          onClick={onToggle}
          aria-label={visible ? `Masquer ${label.toLowerCase()}` : `Afficher ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}

export function PasswordChangeModal({
  onClose,
  onSuccess,
  userId,
  dataCounts,
  refreshData,
  authClient = supabase.auth,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  dataCounts: { clients: number; habits: number; sessions: number };
  refreshData: () => Promise<void>;
  authClient?: PasswordAuthClient;
}) {
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState({ current: false, next: false, confirmation: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clear = () => {
    const empty = emptyPasswordChangeInput();
    setCurrentPassword(empty.currentPassword);
    setNewPassword(empty.newPassword);
    setConfirmation(empty.confirmation);
    setVisible({ current: false, next: false, confirmation: false });
    setError(null);
  };

  const close = () => {
    if (submitting) return;
    clear();
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const input = { currentPassword, newPassword, confirmation };
    const validationError = validatePasswordChange(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    const dataSnapshot = {
      userId,
      ...dataCounts,
    };

    try {
      const result = await changeCurrentUserPassword(authClient, input);
      if (result.userId !== dataSnapshot.userId)
        throw new PasswordChangeError(
          "La session active ne correspond plus au compte initial.",
        );
      await refreshData();
      clear();
      onSuccess();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof PasswordChangeError
          ? reason.message
          : "Impossible de modifier le mot de passe pour le moment. Réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Modifier le mot de passe"
      onClose={close}
      initialFocusRef={currentPasswordRef}
    >
      <form className="password-change-form" onSubmit={(event) => void submit(event)} noValidate>
        <div className="password-form-intro">
          <span className="settings-group-icon blue">
            <KeyRound size={18} />
          </span>
          <p>
            Confirme ton mot de passe actuel, puis choisis-en un nouveau d’au
            moins 8 caractères.
          </p>
        </div>
        <PasswordField
          label="Mot de passe actuel"
          value={currentPassword}
          autoComplete="current-password"
          visible={visible.current}
          disabled={submitting}
          onChange={setCurrentPassword}
          onToggle={() => setVisible((value) => ({ ...value, current: !value.current }))}
          inputRef={currentPasswordRef}
        />
        <PasswordField
          label="Nouveau mot de passe"
          value={newPassword}
          autoComplete="new-password"
          visible={visible.next}
          disabled={submitting}
          onChange={setNewPassword}
          onToggle={() => setVisible((value) => ({ ...value, next: !value.next }))}
        />
        <PasswordField
          label="Confirmer le nouveau mot de passe"
          value={confirmation}
          autoComplete="new-password"
          visible={visible.confirmation}
          disabled={submitting}
          onChange={setConfirmation}
          onToggle={() =>
            setVisible((value) => ({
              ...value,
              confirmation: !value.confirmation,
            }))
          }
        />
        {error && (
          <p className="form-message error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row password-actions">
          <button type="button" className="button subtle" disabled={submitting} onClick={close}>
            Annuler
          </button>
          <button type="submit" className="button primary" disabled={submitting}>
            <KeyRound size={16} />
            {submitting ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
