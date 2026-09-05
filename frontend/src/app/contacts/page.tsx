"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Contact, Page, statuses, statusLabel } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { ContactForm } from "@/components/contact-form";
import { ContactTable, Empty, LoadState, Pagination } from "@/components/ui";

function Contacts() {
  const params = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(params.get("search") || "");
  const [query, setQuery] = useState(search);
  const [status, setStatus] = useState(params.get("status") || "");
  const [sort, setSort] = useState("updated_at");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const key = new URLSearchParams({
    page: String(page),
    page_size: "20",
    search: query,
    status,
    sort,
  }).toString();
  const { data, error, reload } = useResource(
    (signal) => api<Page<Contact>>(`/contacts?${key}`, { signal }),
    key,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Personas que vale la pena tener cerca</p>
          <h1>Tus contactos</h1>
          <p className="muted">
            Un rostro conocido, una presentación fresca. Mantenlos a todos en mente.
          </p>
        </div>
        <button className="button" onClick={() => setAdding(true)}>
          <span aria-hidden="true">+</span> Agregar contacto
        </button>
      </div>
      <section className="panel">
        <div className="filters">
          <label className="search-field">
            <span className="sr-only">Buscar contactos</span>
            <svg
              aria-hidden="true"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contactos..."
            />
          </label>
          <label className="filter-label">
            Estado
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            Ordenar por
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="updated_at">Actualizados recientemente</option>
              <option value="name">Nombre</option>
              <option value="next_follow_up_at">Próximo seguimiento</option>
            </select>
          </label>
        </div>
        {!data ? (
          <LoadState error={error} retry={reload} />
        ) : (
          <>
            {data.items.length ? (
              <ContactTable contacts={data.items} />
            ) : (
              <Empty
                title={
                  query || status
                    ? "No hay contactos que coincidan"
                    : "Haz tu primera conexión"
                }
              >
                <p>
                  {query || status
                    ? "Intenta con otro nombre o elige un estado diferente."
                    : "Agrega a alguien con quien quieras mantenerte en contacto. Puedes completar los detalles después."}
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (query || status) {
                      setSearch("");
                      setStatus("");
                      setPage(1);
                    } else setAdding(true);
                  }}
                >
                  {query || status ? "Limpiar filtros" : "Agregar contacto"}
                </button>
              </Empty>
            )}
            <Pagination
              page={page}
              total={data.total}
              pageSize={data.page_size}
              onChange={setPage}
            />
          </>
        )}
      </section>
      {adding && (
        <ContactForm
          onClose={() => setAdding(false)}
          onSaved={(contact) => router.push(`/contacts/${contact.id}`)}
        />
      )}
    </>
  );
}

export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="state" role="status">
          Cargando contactos...
        </div>
      }
    >
      <Contacts />
    </Suspense>
  );
}
