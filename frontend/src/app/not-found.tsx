import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state">
      <h1>Esta página no existe.</h1>
      <p className="muted">Vuelve a la lista de personas en tu círculo.</p>
      <Link className="button" href="/contacts">
        Ir a contactos
      </Link>
    </div>
  );
}
