"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Dashboard, formatDate, fullName, interactionTypeLabel, statuses } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { Avatar, Badge, Empty, LoadState } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";

export default function Overview() {
  const { data, error, reload } = useResource(
    (signal) => api<Dashboard>("/dashboard", { signal }),
    "dashboard",
  );
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Un poco de atención hace la diferencia</p>
          <h1>Tus personas, a la vista.</h1>
          <p className="muted">
            Retoma una conversación. Haz espacio para la próxima.
          </p>
        </div>
        <button className="button" onClick={() => setAdding(true)}>
          <span aria-hidden="true">+</span> Agregar contacto
        </button>
      </div>
      {!data ? (
        <LoadState error={error} retry={reload} />
      ) : (
        <>
          <div className="stats">
            <Link href="/contacts" className="stat">
              <span>Total de contactos</span>
              <strong>{data.total_contacts}</strong>
              <span className="stat-caption">Conexiones en tu círculo</span>
            </Link>
            <Link href="/follow-ups?bucket=today" className="stat stat-green">
              <span>Seguimientos de hoy</span>
              <strong>{data.follow_ups_today}</strong>
              <span className="stat-caption">Un buen día para contactar</span>
            </Link>
            <Link href="/follow-ups?bucket=overdue" className="stat">
              <span>Seguimientos vencidos</span>
              <strong
                className={data.overdue_follow_ups > 0 ? "attention" : ""}
              >
                {data.overdue_follow_ups}
              </strong>
              <span className="stat-caption">
                Conversaciones a las que volver
              </span>
            </Link>
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>En el horizonte</h2>
                  <p className="muted">Tus próximas conexiones programadas</p>
                </div>
                <Link className="text-link" href="/follow-ups?bucket=upcoming">
                  Ver todos
                </Link>
              </div>
              {data.upcoming_follow_ups.length ? (
                <div>
                  {data.upcoming_follow_ups.map((contact) => (
                    <Link
                      className="followup-row"
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                    >
                      <Avatar contact={contact} />
                      <div className="grow min-w-0">
                        <strong>{fullName(contact)}</strong>
                        <p className="muted truncate">
                          {contact.company || "Conexión personal"}
                        </p>
                      </div>
                      <span className="followup-date">
                        {formatDate(contact.next_follow_up_at, true)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty title="Un respiro">
                  <p>
                    No hay seguimientos próximos. Abre un contacto para programar tu
                    próxima conversación.
                  </p>
                  <Link className="text-link" href="/contacts">
                    Ver contactos
                  </Link>
                </Empty>
              )}
            </section>
            <section className="panel status-panel">
              <div className="panel-heading">
                <div>
                  <h2>Tu círculo</h2>
                  <p className="muted">En qué estado están tus conexiones</p>
                </div>
              </div>
              <div className="status-list">
                {statuses.map((status) => (
                  <Link
                    key={status}
                    href={`/contacts?status=${status}`}
                    className="status-row"
                  >
                    <div className="flex justify-between items-center">
                      <Badge status={status} />
                      <strong>{data.by_status[status]}</strong>
                    </div>
                    <div className="status-track">
                      <span
                        className={`status-fill fill-${status}`}
                        style={{
                          width: `${data.total_contacts ? (data.by_status[status] / data.total_contacts) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <section className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>Conversaciones recientes</h2>
                <p className="muted">
                  Los pequeños momentos que te mantienen conectado
                </p>
              </div>
            </div>
            {data.recent_interactions.length ? (
              <div className="recent-list">
                {data.recent_interactions.map((interaction) => (
                  <Link
                    key={interaction.id}
                    href={`/contacts/${interaction.contact_id}`}
                    className="recent-row"
                  >
                    <span
                      className={`interaction-icon type-${interaction.type}`}
                      aria-hidden="true"
                    >
                      {interaction.type.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="grow min-w-0">
                      <strong>{interaction.contact_name}</strong>
                      <p className="muted line-clamp-2">
                        {interaction.description}
                      </p>
                    </div>
                    <div className="recent-meta">
                      <span>{interactionTypeLabel(interaction.type)}</span>
                      <time dateTime={interaction.occurred_at}>
                        {formatDate(interaction.occurred_at, true)}
                      </time>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title="Cada conexión empieza en algún lado">
                <p>
                  Registra una llamada, email, reunión o nota en un contacto. Tu
                  actividad reciente aparecerá aquí.
                </p>
              </Empty>
            )}
          </section>
        </>
      )}
      {adding && (
        <ContactForm
          onClose={() => setAdding(false)}
          onSaved={(contact) => router.push(`/contacts/${contact.id}`)}
        />
      )}
    </>
  );
}
