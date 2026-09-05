"use client";

import { FormEvent, useState } from "react";
import {
  api,
  changedFields,
  Contact,
  localDateTime,
  statuses,
  toIso,
} from "@/lib/api";
import { Modal } from "./ui";

export function ContactForm({
  contact,
  onClose,
  onSaved,
}: {
  contact?: Contact;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) || "").trim();
    if (!text("first_name")) {
      setError("Enter a first name, not just spaces.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = changedFields(
        {
          first_name: text("first_name"),
          last_name: text("last_name"),
          email: text("email") || null,
          phone: text("phone") || null,
          company: text("company") || null,
          job_title: text("job_title") || null,
          notes: text("notes") || null,
          status: text("status"),
          next_follow_up_at: toIso(
            text("next_follow_up_at"),
            contact?.next_follow_up_at,
          ),
        },
        contact,
      );
      if (contact && !Object.keys(payload).length) {
        onSaved(contact);
        return;
      }
      const saved = await api<Contact>(
        contact ? `/contacts/${contact.id}` : "/contacts",
        {
          method: contact ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      onSaved(saved);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save contact.",
      );
      setBusy(false);
    }
  }
  return (
    <Modal
      title={contact ? "Edit contact" : "A new connection"}
      onClose={onClose}
      busy={busy}
    >
      <p className="modal-description">
        {contact
          ? "Keep their details up to date."
          : "Start with a name. Add the details as you get to know them."}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="form-grid">
          <label>
            First name <span className="muted">(required)</span>
            <input
              name="first_name"
              defaultValue={contact?.first_name}
              required
              autoFocus
              autoComplete="given-name"
            />
          </label>
          <label>
            Last name
            <input
              name="last_name"
              defaultValue={contact?.last_name}
              autoComplete="family-name"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue={contact?.email || ""}
              autoComplete="email"
            />
          </label>
          <label>
            Phone
            <input
              name="phone"
              type="tel"
              defaultValue={contact?.phone || ""}
              autoComplete="tel"
            />
          </label>
          <label>
            Company
            <input
              name="company"
              defaultValue={contact?.company || ""}
              autoComplete="organization"
            />
          </label>
          <label>
            Job title
            <input
              name="job_title"
              defaultValue={contact?.job_title || ""}
              autoComplete="organization-title"
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={contact?.status || "new"}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Next follow-up
            <input
              name="next_follow_up_at"
              type="datetime-local"
              defaultValue={localDateTime(contact?.next_follow_up_at || null)}
            />
            <span className="field-hint">
              Your local time. Leave blank to clear.
            </span>
          </label>
          <label className="full-width">
            Notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={contact?.notes || ""}
              placeholder="Shared interests, useful context, things to remember..."
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button" disabled={busy}>
            {busy ? "Saving..." : contact ? "Save changes" : "Create contact"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
