"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="3.25" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.35 4.35l1.4 1.4M14.25 14.25l1.4 1.4M15.65 4.35l-1.4 1.4M5.75 14.25l-1.4 1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M15.8 12.6A6.4 6.4 0 0 1 7.4 4.2a6.5 6.5 0 1 0 8.4 8.4Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="3.5" width="14" height="10" rx="1.5" />
      <path d="M7 16.5h6M10 13.5v3" />
    </svg>
  );
}

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("kinfolk-theme");
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function selectTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem("kinfolk-theme", nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Tema de color">
      {themes.map((item) => (
        <button
          key={item.value}
          type="button"
          className={theme === item.value ? "selected" : ""}
          aria-label={`Tema ${item.label.toLowerCase()}`}
          aria-pressed={theme === item.value}
          title={item.label}
          onClick={() => selectTheme(item.value)}
        >
          <span aria-hidden="true" className={`theme-icon theme-${item.value}`}>
            <ThemeIcon theme={item.value} />
          </span>
          <span className="theme-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
