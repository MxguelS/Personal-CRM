"use client";

import { FormEvent, useState } from "react";
import {
  api,
  changedFields,
  Interaction,
  interactionTypes,
  localDateTime,
  toIso,
} from "@/lib/api";
import { Modal } from "./ui";

export function InteractionForm({
  contactId,
  interaction,
  onClose,
  onSaved,
}: {
  contactId: number;
  interaction?: Interaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") || "").trim();
    if (!description) {
      setError("Add a description, not just spaces.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = changedFields(
        {
          type: String(data.get("type")),
          description,
          occurred_at: toIso(
            String(data.get("occurred_at")),
            interaction?.occurred_at,
          ),
        },
        interaction,
      );
      if (!Object.keys(payload).length) {
        onSaved();
        return;
      }
      await api(
        interaction
          ? `/interactions/${interaction.id}`
          : `/contacts/${contactId}/interactions`,
        {
          method: interaction ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save interaction.",
      );
      setBusy(false);
    }
  }
  return (
    <Modal
      title={interaction ? "Edit interaction" : "Log a conversation"}
      onClose={onClose}
      busy={busy}
    >
      <p className="modal-description">
        Capture what mattered, while it is still fresh.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="form-grid">
          <label>
            Interaction type
            <select
              name="type"
              defaultValue={interaction?.type || "call"}
              autoFocus
            >
              {interactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type[0].toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            When <span className="muted">(required)</span>
            <input
              name="occurred_at"
              type="datetime-local"
              required
              defaultValue={localDateTime(
                interaction?.occurred_at || new Date().toISOString(),
              )}
            />
            <span className="field-hint">Your local time</span>
          </label>
          <label className="full-width">
            Description <span className="muted">(required)</span>
            <textarea
              name="description"
              rows={5}
              required
              defaultValue={interaction?.description || ""}
              placeholder="What did you talk about? What comes next?"
            />
          </label>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button" disabled={busy}>
            {busy
              ? "Saving..."
              : interaction
                ? "Save changes"
                : "Log interaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
