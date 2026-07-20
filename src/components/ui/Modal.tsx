import { Inbox, X } from "lucide-react";
import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

export function Modal({
  title,
  children,
  onClose,
  initialFocusRef,
}: ModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (initialFocusRef?.current ?? closeButton.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [initialFocusRef]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={() => onCloseRef.current()}
    >
      <section
        className="modal-panel"
        aria-modal="true"
        aria-label={title}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="modal-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2>{title}</h2>
          <button
            ref={closeButton}
            className="icon-button"
            onClick={() => onCloseRef.current()}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="empty-state">
    <span className="empty-icon">
      <Inbox size={19} />
    </span>
    <span>{children}</span>
  </div>
);

export const Status = ({ children }: { children: ReactNode }) => {
  const value = String(children).toLowerCase();
  const tone = value.includes("partiel")
    ? "amber"
    : value.includes("non payé")
      ? "brick"
      : value.includes("payé")
        ? "green"
        : "";
  return <span className={`status-pill ${tone}`}>{children}</span>;
};
