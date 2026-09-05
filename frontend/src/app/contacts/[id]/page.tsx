"use client";

import Link from "next/link";
import { FormEvent, use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  changedFields,
  Contact,
  formatDate,
  fullName,
  Interaction,
  localDateTime,
  toIso,
} from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { Avatar, Badge, Empty, LoadState, Modal } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { InteractionForm } from "@/components/interaction-form";

export default function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, reload } = useResource(async (signal) => {
    const [contact, interactions] = await Promise.all([
      api<Contact>(`/contacts/${id}`, { signal }),
      api<Interaction[]>(`/contacts/${id}/interactions`, { signal }),
    ]);
    return { contact, interactions };
  }, id);
  const [editContact, setEditContact] = useState(false);
  const [interaction, setInteraction] = useState<Interaction | "new" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Interaction | "contact" | null>(
    null,
  );
  const [scheduling, setScheduling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [notice, setNotice] = useState("");

  function saved(message: string) {
    setEditContact(false);
    setInteraction(null);
    setScheduling(false);
    setDeleting(null);
    setBusy(false);
    setMutationError("");
    setNotice(message);
    reload();
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setMutationError("");
    try {
      await api(
        deleting === "contact"
          ? `/contacts/${id}`
          : `/interactions/${deleting.id}`,
        { method: "DELETE" },
      );
      if (deleting === "contact") router.push("/contacts");
      else saved("Interaction deleted. Contact activity is up to date.");
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Unable to delete.",
      );
      setBusy(false);
    }
  }
  async function schedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(
      new FormData(event.currentTarget).get("next_follow_up_at") || "",
    );
    setBusy(true);
    setMutationError("");
    try {
      const payload = changedFields(
        {
          next_follow_up_at: toIso(value, data?.contact.next_follow_up_at),
        },
        data?.contact,
      );
      if (!Object.keys(payload).length) {
        saved("Follow-up unchanged.");
        return;
      }
      await api(`/contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      saved(value ? "Follow-up scheduled." : "Follow-up cleared.");
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Unable to update follow-up.",
      );
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        <Link className="back-link" href="/contacts">
          &larr; Back to contacts
        </Link>
        <LoadState error={error} retry={reload} />
      </>
    );
  const { contact, interactions } = data;
  return (
    <>
      <Link className="back-link" href="/contacts">
        &larr; All contacts
      </Link>
      <div className="detail-heading">
        <div className="person">
          <Avatar contact={contact} large />
          <div>
            <h1>{fullName(contact)}</h1>
            <p className="muted">
              {[contact.job_title, contact.company]
                .filter(Boolean)
                .join(" at ") || "Personal connection"}
            </p>
            <Badge status={contact.status} />
          </div>
        </div>
        <button
          className="button secondary"
          onClick={() => setEditContact(true)}
        >
          Edit contact
        </button>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            &#215;
          </button>
        </div>
      )}
      <div className="detail-grid">
        <aside className="detail-sidebar">
          <section className="panel">
            <div className="panel-heading">
              <h2>Contact details</h2>
            </div>
            <dl className="contact-info">
              <div>
                <dt>Email</dt>
                <dd>
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  ) : (
                    <span className="muted">Not added</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  ) : (
                    <span className="muted">Not added</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Company</dt>
                <dd>
                  {contact.company || <span className="muted">Not added</span>}
                </dd>
              </div>
              <div>
                <dt>Last contacted</dt>
                <dd>
                  {contact.last_contacted_at ? (
                    formatDate(contact.last_contacted_at, true)
                  ) : (
                    <span className="muted">No contact recorded</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{formatDate(contact.created_at)}</dd>
              </div>
            </dl>
          </section>
          <section className="followup-card">
            <div className="flex items-center justify-between gap-3">
              <h2>Next follow-up</h2>
              <span aria-hidden="true">&#8599;</span>
            </div>
            <p className="scheduled-date">
              {contact.next_follow_up_at
                ? formatDate(contact.next_follow_up_at, true)
                : "Make time to reconnect."}
            </p>
            <p>
              {contact.status === "closed"
                ? "This contact is closed and will not appear in follow-up lists."
                : "A small reminder to keep the conversation going."}
            </p>
            <button
              className="button followup-button"
              onClick={() => {
                setMutationError("");
                setScheduling(true);
              }}
            >
              {contact.next_follow_up_at
                ? "Reschedule or clear"
                : "Schedule follow-up"}
            </button>
          </section>
          <button
            className="delete-contact"
            onClick={() => {
              setMutationError("");
              setDeleting("contact");
            }}
          >
            Delete contact
          </button>
        </aside>
        <div className="detail-content">
          <section className="panel notes-panel">
            <div className="panel-heading">
              <h2>Things to remember</h2>
              <button
                className="text-link"
                onClick={() => setEditContact(true)}
              >
                Edit notes
              </button>
            </div>
            <p className={`notes-text ${contact.notes ? "" : "muted"}`}>
              {contact.notes ||
                "A shared interest, a recent milestone, their usual coffee order. Keep the little things here."}
            </p>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Conversation history{" "}
                  <span className="count">{interactions.length}</span>
                </h2>
                <p className="muted">Every touchpoint, in one place</p>
              </div>
              <button
                className="button small"
                onClick={() => setInteraction("new")}
              >
                + Log interaction
              </button>
            </div>
            {interactions.length ? (
              <ol className="timeline">
                {interactions.map((item) => (
                  <li key={item.id}>
                    <span
                      className={`interaction-icon type-${item.type}`}
                      aria-hidden="true"
                    >
                      {item.type.slice(0, 1).toUpperCase()}
                    </span>
                    <article>
                      <div className="timeline-heading">
                        <h3 className="capitalize">{item.type}</h3>
                        <time dateTime={item.occurred_at}>
                          {formatDate(item.occurred_at, true)}
                        </time>
                      </div>
                      <p className="interaction-description">
                        {item.description}
                      </p>
                      <div className="timeline-actions">
                        <button
                          className="text-link"
                          onClick={() => setInteraction(item)}
                          aria-label={`Edit ${item.type} from ${formatDate(item.occurred_at, true)}`}
                        >
                          Edit
                        </button>
                        <button
                          className="text-link danger-text"
                          onClick={() => {
                            setMutationError("");
                            setDeleting(item);
                          }}
                          aria-label={`Delete ${item.type} from ${formatDate(item.occurred_at, true)}`}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="The conversation starts here">
                <p>
                  Log a call, an email, a meeting, or a note. Give your next
                  conversation a little context.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setInteraction("new")}
                >
                  Log first interaction
                </button>
              </Empty>
            )}
          </section>
        </div>
      </div>
      {editContact && (
        <ContactForm
          contact={contact}
          onClose={() => setEditContact(false)}
          onSaved={() => saved("Contact updated.")}
        />
      )}
      {interaction && (
        <InteractionForm
          contactId={contact.id}
          interaction={interaction === "new" ? undefined : interaction}
          onClose={() => setInteraction(null)}
          onSaved={() =>
            saved("Interaction saved. Contact activity is up to date.")
          }
        />
      )}
      {scheduling && (
        <Modal
          title="Plan your next conversation"
          onClose={() => setScheduling(false)}
          busy={busy}
        >
          <form onSubmit={schedule}>
            <label className="schedule-label">
              Next follow-up
              <input
                type="datetime-local"
                name="next_follow_up_at"
                defaultValue={localDateTime(contact.next_follow_up_at)}
                disabled={busy}
                autoFocus
              />
              <span className="field-hint">
                Your local time. Leave blank to remove the follow-up.
              </span>
            </label>
            {mutationError && (
              <p className="form-error" role="alert">
                {mutationError}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setScheduling(false)}
              >
                Cancel
              </button>
              <button className="button" disabled={busy}>
                {busy ? "Saving..." : "Save follow-up"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={
            deleting === "contact"
              ? "Delete this contact?"
              : "Delete this interaction?"
          }
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <p className="modal-description">
            {deleting === "contact"
              ? `${fullName(contact)} and their conversation history will be permanently deleted.`
              : "This interaction will be permanently removed. The contact's last-contacted time will be recalculated."}{" "}
            This cannot be undone.
          </p>
          {mutationError && (
            <p className="form-error" role="alert">
              {mutationError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
              disabled={busy}
              autoFocus
            >
              Keep {deleting === "contact" ? "contact" : "interaction"}
            </button>
            <button className="button danger" disabled={busy} onClick={remove}>
              {busy
                ? "Deleting..."
                : `Delete ${deleting === "contact" ? "contact" : "interaction"}`}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
