"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Contact, formatDate, fullName, Status, statusLabel } from "@/lib/api";

export function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

export function Avatar({
  contact,
  large = false,
}: {
  contact: Contact;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar ${large ? "avatar-large" : ""}`}
      aria-hidden="true"
    >
      {contact.first_name[0]}
      {contact.last_name?.[0]}
    </span>
  );
}

export function LoadState({
  error,
  retry,
}: {
  error?: string;
  retry: () => void;
}) {
  return error ? (
    <div className="state error" role="alert">
      <h3>No se pudo cargar esta vista</h3>
      <p>{error}</p>
      <button className="button secondary" onClick={retry}>
        Intentar de nuevo
      </button>
    </div>
  ) : (
    <div className="state" role="status">
      <span className="loading-dot" />
      Cargando tu espacio de trabajo...
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="state">
      <span className="empty-symbol" aria-hidden="true">
        +
      </span>
      <h3>{title}</h3>
      <div className="muted">{children}</div>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar diálogo"
        >
          &#215;
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function ContactTable({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Contacto</th>
            <th scope="col">Estado</th>
            <th scope="col">Último contacto</th>
            <th scope="col">Próximo seguimiento</th>
            <th scope="col">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td>
                <Link className="person" href={`/contacts/${contact.id}`}>
                  <Avatar contact={contact} />
                  <span>
                    <strong>{fullName(contact)}</strong>
                    <span className="muted person-meta">
                      {[contact.job_title, contact.company]
                        .filter(Boolean)
                        .join(" en ") ||
                        contact.email ||
                        "Sin empresa agregada"}
                    </span>
                  </span>
                </Link>
              </td>
              <td>
                <Badge status={contact.status} />
              </td>
              <td className="date-cell">
                {contact.last_contacted_at ? (
                  formatDate(contact.last_contacted_at)
                ) : (
                  <span className="muted">Sin actividad aún</span>
                )}
              </td>
              <td className="date-cell">
                {contact.next_follow_up_at ? (
                  formatDate(contact.next_follow_up_at, true)
                ) : (
                  <span className="muted">No programado</span>
                )}
              </td>
              <td>
                <Link
                  className="text-link"
                  href={`/contacts/${contact.id}`}
                  aria-label={`Ver ${fullName(contact)}`}
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span className="muted">
        {total === 0
          ? "0 contactos"
          : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} de ${total} contactos`}
      </span>
      <div className="flex items-center gap-3">
        <button
          className="button secondary small"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </button>
        <span className="page-number">
          Página {page} de {pages}
        </span>
        <button
          className="button secondary small"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
