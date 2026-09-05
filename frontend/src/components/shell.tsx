"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "Inicio", icon: "overview" },
  { href: "/contacts", label: "Contactos", icon: "people" },
  { href: "/follow-ups", label: "Seguimientos", icon: "calendar" },
];

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "overview" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      ) : name === "people" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 11h18m-13 5h3" />
        </>
      )}
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            k
          </span>
          <span>
            Kinfolk<span className="brand-caption">Tu CRM personal</span>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={link.icon} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <span className="note-rule" />
          <p>
            Las buenas relaciones
            <br />
            crecen con atención.
          </p>
          <span className="muted">Un pequeño espacio para mantener el contacto.</span>
        </div>
        <div className="workspace">
          <span className="workspace-dot" />
          Espacio de trabajo personal
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Mantén la conexión.</span>
          <div className="topbar-actions">
            <ThemeToggle />
            <span className="topbar-label">Espacio de trabajo personal</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer>Hecho para conexiones significativas.</footer>
      </div>
    </div>
  );
}
