"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, Contact, Page } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { ContactTable, Empty, LoadState, Pagination } from "@/components/ui";

const buckets = ["today", "overdue", "upcoming"] as const;
function FollowUps() {
  const params = useSearchParams();
  const initial = params.get("bucket");
  const [bucket, setBucket] = useState(
    initial && buckets.includes(initial as (typeof buckets)[number])
      ? initial
      : "today",
  );
  const [page, setPage] = useState(1);
  const key = `bucket=${bucket}&page=${page}&page_size=20`;
  const { data, error, reload } = useResource(
    (signal) => api<Page<Contact>>(`/follow-ups?${key}`, { signal }),
    key,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Una razón para reconectar</p>
          <h1>Da el siguiente paso.</h1>
          <p className="muted">
            Convierte las buenas intenciones en tu próxima conversación.
          </p>
        </div>
        <Link href="/contacts" className="button secondary">
          Ver contactos
        </Link>
      </div>
      <section className="panel">
        <div className="tabs" aria-label="Período de seguimiento">
          {buckets.map((value) => (
            <button
              key={value}
              className={`tab ${bucket === value ? "selected" : ""}`}
              aria-pressed={bucket === value}
              onClick={() => {
                setBucket(value);
                setPage(1);
              }}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <p className="bucket-note">
          Agrupados por día UTC. Las horas se muestran en tu zona horaria local. Los
          contactos cerrados se excluyen.
        </p>
        {!data ? (
          <LoadState error={error} retry={reload} />
        ) : (
          <>
            {data.items.length ? (
              <ContactTable contacts={data.items} />
            ) : (
              <Empty
                title={
                  bucket === "overdue"
                    ? "Todo al día"
                    : bucket === "today"
                    ? "Nada programado para hoy"
                    : "Tu calendario está libre"
                }
              >
                <p>Abre un contacto para programar o actualizar un seguimiento.</p>
                <Link href="/contacts" className="text-link">
                  Encuentra a alguien con quien conectar
                </Link>
              </Empty>
            )}
            <Pagination
              page={page}
              pageSize={data.page_size}
              total={data.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}

export default function FollowUpsPage() {
  return (
    <Suspense
      fallback={
        <div className="state" role="status">
          Cargando seguimientos...
        </div>
      }
    >
      <FollowUps />
    </Suspense>
  );
}
