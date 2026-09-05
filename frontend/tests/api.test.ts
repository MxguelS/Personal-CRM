import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  api,
  changedFields,
  fullName,
  localDateTime,
  toIso,
} from "../src/lib/api.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("API uses relative proxy, JSON headers, and no-store", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/contacts");
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.equal(
      new Headers(init?.headers).get("Content-Type"),
      "application/json",
    );
    assert.deepEqual(JSON.parse(String(init?.body)), { first_name: "Ada" });
    return Response.json({ id: 1 });
  };
  assert.deepEqual(
    await api("/contacts", {
      method: "POST",
      body: JSON.stringify({ first_name: "Ada" }),
    }),
    { id: 1 },
  );
});

test("DELETE 204 does not attempt JSON parsing", async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await api("/contacts/1", { method: "DELETE" }), undefined);
});

test("structured errors preserve the backend message", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { error: { code: "not_found", message: "Contact not found" } },
      { status: 404 },
    );
  await assert.rejects(api("/contacts/1"), /Contact not found/);
});

test("non-JSON proxy failures produce an actionable error", async () => {
  globalThis.fetch = async () => new Response("Bad gateway", { status: 502 });
  await assert.rejects(api("/contacts"), /La solicitud falló \(502\).*Intenta de nuevo/);
});

test("empty follow-ups clear to null and local dates round-trip to aware timestamps", () => {
  assert.equal(toIso(""), null);
  assert.equal(localDateTime(null), "");
  const instant = "2026-07-15T14:30:00.000Z";
  assert.equal(toIso(localDateTime(instant)), instant);
  assert.equal(fullName({ first_name: "Ada", last_name: "" }), "Ada");
});

test("contact PATCH omits untouched fields so newer unrelated values survive", () => {
  const initial = {
    first_name: "Ada",
    company: "Old company",
    notes: "Old note",
    email: null,
  };
  const payload = changedFields({ ...initial, notes: "Updated note" }, initial);
  assert.deepEqual(payload, { notes: "Updated note" });
  assert.deepEqual(
    { ...initial, company: "New company", ...payload },
    {
      ...initial,
      company: "New company",
      notes: "Updated note",
    },
  );
  assert.deepEqual(changedFields({ notes: null, first_name: "Ada" }, initial), {
    notes: null,
  });
  assert.deepEqual(
    changedFields(
      { email: null, notes: "Old note" },
      { email: "", notes: " Old note " },
    ),
    {},
  );
});

test("creation retains all fields, while unchanged edits have an empty payload", () => {
  const values = { first_name: "Ada", last_name: "", email: null };
  assert.deepEqual(changedFields(values), values);
  assert.deepEqual(changedFields(values, values), {});
});

test("description-only interaction edits preserve timestamp seconds and precision", () => {
  const initial = {
    type: "call",
    description: "Old description",
    occurred_at: "2026-07-15T14:30:42.123456Z",
  };
  const occurred_at = toIso(
    localDateTime(initial.occurred_at),
    initial.occurred_at,
  );
  assert.equal(occurred_at, initial.occurred_at);
  assert.deepEqual(
    changedFields(
      { ...initial, description: "New description", occurred_at },
      initial,
    ),
    { description: "New description" },
  );
});

test("unchanged local input preserves the second occurrence of an ambiguous DST time", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const original = "2026-11-01T01:30:45.123-05:00";
    const local = localDateTime(original);
    assert.equal(local, "2026-11-01T01:30");
    assert.equal(toIso(local, original), original);
    assert.deepEqual(
      changedFields(
        { next_follow_up_at: toIso(local, original) },
        { next_follow_up_at: original },
      ),
      {},
    );
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test("follow-ups preserve untouched timestamps but allow explicit changes and clearing", () => {
  const original = "2026-07-15T14:30:42.123Z";
  assert.deepEqual(
    changedFields(
      { next_follow_up_at: toIso(localDateTime(original), original) },
      { next_follow_up_at: original },
    ),
    {},
  );
  assert.deepEqual(
    changedFields(
      { next_follow_up_at: toIso("", original) },
      { next_follow_up_at: original },
    ),
    { next_follow_up_at: null },
  );
  const changed = "2026-07-16T16:45";
  assert.equal(toIso(changed, original), new Date(changed).toISOString());
  assert.equal(toIso(changed, null), new Date(changed).toISOString());
  assert.equal(toIso("", null), null);
});
