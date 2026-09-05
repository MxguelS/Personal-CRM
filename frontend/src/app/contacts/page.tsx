"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Contact, Page, statuses } from "@/lib/api";
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
          <p className="eyebrow">People worth keeping close</p>
          <h1>Your contacts</h1>
          <p className="muted">
            A familiar face, a fresh introduction. Keep them all in mind.
          </p>
        </div>
        <button className="button" onClick={() => setAdding(true)}>
          <span aria-hidden="true">+</span> Add contact
        </button>
      </div>
      <section className="panel">
        <div className="filters">
          <label className="search-field">
            <span className="sr-only">Search contacts</span>
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
              placeholder="Search your contacts..."
            />
          </label>
          <label className="filter-label">
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            Sort by
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="updated_at">Recently updated</option>
              <option value="name">Name</option>
              <option value="next_follow_up_at">Next follow-up</option>
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
                    ? "No contacts match"
                    : "Make your first connection"
                }
              >
                <p>
                  {query || status
                    ? "Try another name or choose a different status."
                    : "Add someone you want to stay in touch with. You can fill in the details later."}
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
                  {query || status ? "Clear filters" : "Add contact"}
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
          Loading contacts...
        </div>
      }
    >
      <Contacts />
    </Suspense>
  );
}
