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
          <p className="eyebrow">A reason to reconnect</p>
          <h1>Follow through.</h1>
          <p className="muted">
            Turn good intentions into your next conversation.
          </p>
        </div>
        <Link href="/contacts" className="button secondary">
          Browse contacts
        </Link>
      </div>
      <section className="panel">
        <div className="tabs" aria-label="Follow-up period">
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
          Grouped by UTC day. Times are shown in your local timezone. Closed
          contacts are excluded.
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
                    ? "All caught up"
                    : bucket === "today"
                      ? "Nothing scheduled for today"
                      : "Your calendar is open"
                }
              >
                <p>Open a contact to schedule or update a follow-up.</p>
                <Link href="/contacts" className="text-link">
                  Find someone to connect with
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
          Loading follow-ups...
        </div>
      }
    >
      <FollowUps />
    </Suspense>
  );
}
