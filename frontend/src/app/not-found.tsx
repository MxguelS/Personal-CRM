import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state">
      <h1>This page is not here.</h1>
      <p className="muted">Find your way back to the people in your circle.</p>
      <Link className="button" href="/contacts">
        Go to contacts
      </Link>
    </div>
  );
}
