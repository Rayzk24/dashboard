import { Inbox, X } from "lucide-react";
import { createPortal } from "react-dom";
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

let openModals = 0;
let previousBodyOverflow = '';
let previousRootOverflow = '';

export function Modal({
  title,
  children,
  onClose,
  initialFocusRef,
}: ModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (openModals++ === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousRootOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.setAttribute('data-modal-open', '');
    }
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (initialFocusRef?.current ?? closeButton.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panelRef.current || event.defaultPrevented) return;
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== 'Tab' || document.querySelector('.app-select-menu')) return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (--openModals === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousRootOverflow;
        document.documentElement.removeAttribute('data-modal-open');
      }
      if (opener?.isConnected) opener.focus();
    };
  }, [initialFocusRef]);

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}
    >
      <section
        ref={panelRef}
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
    </div>,
    document.body,
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
