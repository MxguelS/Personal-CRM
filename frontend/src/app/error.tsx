"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="state" role="alert">
      <h1>Something went wrong.</h1>
      <p className="muted">
        Try loading this page again. Your saved contacts are not affected.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
