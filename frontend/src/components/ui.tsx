"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Contact, formatDate, fullName, Status } from "@/lib/api";

export function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span aria-hidden="true" />
      {status}
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
      <h3>Could not load this view</h3>
      <p>{error}</p>
      <button className="button secondary" onClick={retry}>
        Try again
      </button>
    </div>
  ) : (
    <div className="state" role="status">
      <span className="loading-dot" />
      Loading your workspace...
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
          aria-label="Close dialog"
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
            <th scope="col">Contact</th>
            <th scope="col">Status</th>
            <th scope="col">Last contacted</th>
            <th scope="col">Next follow-up</th>
            <th scope="col">
              <span className="sr-only">Open</span>
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
                        .join(" at ") ||
                        contact.email ||
                        "No company added"}
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
                  <span className="muted">No activity yet</span>
                )}
              </td>
              <td className="date-cell">
                {contact.next_follow_up_at ? (
                  formatDate(contact.next_follow_up_at, true)
                ) : (
                  <span className="muted">Not scheduled</span>
                )}
              </td>
              <td>
                <Link
                  className="text-link"
                  href={`/contacts/${contact.id}`}
                  aria-label={`View ${fullName(contact)}`}
                >
                  View
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
          ? "0 contacts"
          : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total} contacts`}
      </span>
      <div className="flex items-center gap-3">
        <button
          className="button secondary small"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <span className="page-number">
          Page {page} of {pages}
        </span>
        <button
          className="button secondary small"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
