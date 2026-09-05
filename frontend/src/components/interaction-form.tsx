"use client";

import { FormEvent, useState } from "react";
import {
  api,
  changedFields,
  Interaction,
  interactionTypes,
  interactionTypeLabel,
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
      setError("Agrega una descripción, no solo espacios.");
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
        error instanceof Error ? error.message : "No se pudo guardar la interacción.",
      );
      setBusy(false);
    }
  }
  return (
    <Modal
      title={interaction ? "Editar interacción" : "Registrar una conversación"}
      onClose={onClose}
      busy={busy}
    >
      <p className="modal-description">
        Captura lo que importó, mientras aún está fresco.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="form-grid">
<label>
            Tipo de interacción
            <select
              name="type"
              defaultValue={interaction?.type || "call"}
              autoFocus
            >
              {interactionTypes.map((type) => (
                <option key={type} value={type}>
                  {interactionTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cuándo <span className="muted">(requerido)</span>
            <input
              name="occurred_at"
              type="datetime-local"
              required
              defaultValue={localDateTime(
                interaction?.occurred_at || new Date().toISOString(),
              )}
            />
            <span className="field-hint">Tu hora local</span>
          </label>
          <label className="full-width">
            Descripción <span className="muted">(requerida)</span>
            <textarea
              name="description"
              rows={5}
              required
              defaultValue={interaction?.description || ""}
              placeholder="¿De qué hablaron? ¿Qué sigue?"
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
            Cancelar
          </button>
          <button className="button" disabled={busy}>
            {busy
              ? "Guardando..."
              : interaction
              ? "Guardar cambios"
              : "Registrar interacción"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
