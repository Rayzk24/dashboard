import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal-panel" aria-modal="true" aria-label={title} role="dialog" onMouseDown={(event) => event.stopPropagation()}><header className="modal-header"><h2>{title}</h2><button ref={closeButton} className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></header>{children}</section></div>;
}
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty-state">{children}</div>;
export const Status = ({ children }: { children: ReactNode }) => { const value = String(children).toLowerCase(); const tone = value.includes('partiel') ? 'amber' : value.includes('non payé') ? 'brick' : value.includes('payé') ? 'green' : ''; return <span className={`status-pill ${tone}`}>{children}</span>; };
