export const statuses = ["new", "contacted", "waiting", "closed"] as const;
export const interactionTypes = ["call", "email", "meeting", "note"] as const;
export type Status = (typeof statuses)[number];
export type Contact = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  notes: string | null;
  status: Status;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Interaction = {
  id: number;
  contact_id: number;
  type: (typeof interactionTypes)[number];
  description: string;
  occurred_at: string;
  created_at: string;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
export type Dashboard = {
  total_contacts: number;
  follow_ups_today: number;
  overdue_follow_ups: number;
  by_status: Record<Status, number>;
  recent_interactions: (Interaction & { contact_name: string })[];
  upcoming_follow_ups: Contact[];
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message ||
        `Request failed (${response.status}). Please try again.`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function fullName(contact: Pick<Contact, "first_name" | "last_name">) {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

export function formatDate(value: string | null, time = false) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(time ? ({ hour: "numeric", minute: "2-digit" } as const) : {}),
  }).format(new Date(value));
}

export function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toIso(value: string, original?: string | null) {
  // Native minute-only inputs cannot retain seconds or a DST fold's offset.
  if (original !== undefined && value === localDateTime(original))
    return original;
  return value ? new Date(value).toISOString() : null;
}

export function changedFields(
  values: Record<string, string | null>,
  initial?: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) =>
        !initial || (value ?? "") !== String(initial[key] ?? "").trim(),
    ),
  );
}
