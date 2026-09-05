"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="state" role="alert">
      <h1>Algo salió mal.</h1>
      <p className="muted">
        Intenta cargar esta página nuevamente. Tus contactos guardados no se han afectado.
      </p>
      <button className="button" onClick={reset}>
        Intentar de nuevo
      </button>
    </div>
  );
}
