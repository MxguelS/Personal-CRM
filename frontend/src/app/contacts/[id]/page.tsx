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
  interactionTypeLabel,
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
      else saved("Interacción eliminada. La actividad del contacto está actualizada.");
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "No se pudo eliminar.",
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
        saved("Seguimiento sin cambios.");
        return;
      }
      await api(`/contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      saved(value ? "Seguimiento programado." : "Seguimiento eliminado.");
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "No se pudo actualizar el seguimiento.",
      );
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        <Link className="back-link" href="/contacts">
          &larr; Volver a contactos
        </Link>
        <LoadState error={error} retry={reload} />
      </>
    );
  const { contact, interactions } = data;
  return (
    <>
      <Link className="back-link" href="/contacts">
        &larr; Todos los contactos
      </Link>
      <div className="detail-heading">
        <div className="person">
          <Avatar contact={contact} large />
          <div>
            <h1>{fullName(contact)}</h1>
            <p className="muted">
              {[contact.job_title, contact.company]
                .filter(Boolean)
                .join(" en ") || "Conexión personal"}
            </p>
            <Badge status={contact.status} />
          </div>
        </div>
        <button
          className="button secondary"
          onClick={() => setEditContact(true)}
        >
          Editar contacto
        </button>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            className="icon-button"
            aria-label="Descartar notificación"
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
              <h2>Detalles del contacto</h2>
            </div>
            <dl className="contact-info">
              <div>
                <dt>Email</dt>
                <dd>
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  ) : (
                    <span className="muted">No agregado</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  ) : (
                    <span className="muted">No agregado</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Empresa</dt>
                <dd>
                  {contact.company || <span className="muted">No agregado</span>}
                </dd>
              </div>
              <div>
                <dt>Último contacto</dt>
                <dd>
                  {contact.last_contacted_at ? (
                    formatDate(contact.last_contacted_at, true)
                  ) : (
                    <span className="muted">Sin contacto registrado</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Agregado</dt>
                <dd>{formatDate(contact.created_at)}</dd>
              </div>
            </dl>
          </section>
          <section className="followup-card">
            <div className="flex items-center justify-between gap-3">
              <h2>Próximo seguimiento</h2>
              <span aria-hidden="true">&#8599;</span>
            </div>
            <p className="scheduled-date">
              {contact.next_follow_up_at
                ? formatDate(contact.next_follow_up_at, true)
                : "Haz tiempo para reconectar."}
            </p>
            <p>
              {contact.status === "closed"
                ? "Este contacto está cerrado y no aparecerá en las listas de seguimiento."
                : "Un pequeño recordatorio para mantener la conversación en marcha."}
            </p>
            <button
              className="button followup-button"
              onClick={() => {
                setMutationError("");
                setScheduling(true);
              }}
            >
              {contact.next_follow_up_at
                ? "Reprogramar o eliminar"
                : "Programar seguimiento"}
            </button>
          </section>
          <button
            className="delete-contact"
            onClick={() => {
              setMutationError("");
              setDeleting("contact");
            }}
          >
            Eliminar contacto
          </button>
        </aside>
        <div className="detail-content">
          <section className="panel notes-panel">
            <div className="panel-heading">
              <h2>Cosas para recordar</h2>
              <button
                className="text-link"
                onClick={() => setEditContact(true)}
              >
                Editar notas
              </button>
            </div>
            <p className={`notes-text ${contact.notes ? "" : "muted"}`}>
              {contact.notes ||
                "Un interés compartido, un hito reciente, su pedido de café habitual. Guarda los pequeños detalles aquí."}
            </p>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Historial de conversaciones{" "}
                  <span className="count">{interactions.length}</span>
                </h2>
                <p className="muted">Cada punto de contacto, en un solo lugar</p>
              </div>
              <button
                className="button small"
                onClick={() => setInteraction("new")}
              >
                + Registrar interacción
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
                        <h3>{interactionTypeLabel(item.type)}</h3>
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
                          aria-label={`Editar ${interactionTypeLabel(item.type).toLowerCase()} del ${formatDate(item.occurred_at, true)}`}
                        >
                          Editar
                        </button>
                        <button
                          className="text-link danger-text"
                          onClick={() => {
                            setMutationError("");
                            setDeleting(item);
                          }}
                          aria-label={`Eliminar ${interactionTypeLabel(item.type).toLowerCase()} del ${formatDate(item.occurred_at, true)}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="La conversación empieza aquí">
                <p>
                  Registra una llamada, un email, una reunión o una nota. Dale a tu próxima
                  conversación un poco de contexto.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setInteraction("new")}
                >
                  Registrar primera interacción
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
          onSaved={() => saved("Contacto actualizado.")}
        />
      )}
      {interaction && (
        <InteractionForm
          contactId={contact.id}
          interaction={interaction === "new" ? undefined : interaction}
          onClose={() => setInteraction(null)}
          onSaved={() =>
            saved("Interacción guardada. La actividad del contacto está actualizada.")
          }
        />
      )}
      {scheduling && (
        <Modal
          title="Planifica tu próxima conversación"
          onClose={() => setScheduling(false)}
          busy={busy}
        >
          <form onSubmit={schedule}>
            <label className="schedule-label">
              Próximo seguimiento
              <input
                type="datetime-local"
                name="next_follow_up_at"
                defaultValue={localDateTime(contact.next_follow_up_at)}
                disabled={busy}
                autoFocus
              />
              <span className="field-hint">
                Tu hora local. Deja en blanco para quitar el seguimiento.
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
                Cancelar
              </button>
              <button className="button" disabled={busy}>
                {busy ? "Guardando..." : "Guardar seguimiento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={
            deleting === "contact"
              ? "¿Eliminar este contacto?"
              : "¿Eliminar esta interacción?"
          }
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <p className="modal-description">
            {deleting === "contact"
              ? `${fullName(contact)} y su historial de conversaciones se eliminarán permanentemente.`
              : "Esta interacción se eliminará permanentemente. El último contacto del contacto se recalculará."}{" "}
            Esta acción no se puede deshacer.
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
              Conservar {deleting === "contact" ? "contacto" : "interacción"}
            </button>
            <button className="button danger" disabled={busy} onClick={remove}>
              {busy
                ? "Eliminando..."
                : `Eliminar ${deleting === "contact" ? "contacto" : "interacción"}`}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
