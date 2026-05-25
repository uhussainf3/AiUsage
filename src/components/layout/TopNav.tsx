"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";

interface TopNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    tier: string;
  };
}

const NAV_TABS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Submit Claim", href: "/submit" },
  { label: "Projects", href: "/projects" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Verify", href: "/verification" },
  { label: "Reports", href: "/reports" },
];

const ADMIN_TABS = [
  { label: "Settings", href: "/settings" },
];

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarClass(email?: string | null) {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user.role === "ADMIN";
  const isLead = ["QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"].includes(user.role);

  const tabs = [
    ...NAV_TABS.filter((t) => {
      if (t.href === "/verification") return isLead;
      if (t.href === "/reports") return isLead;
      return true;
    }),
    ...(isAdmin ? ADMIN_TABS : []),
  ];

  return (
    <>
      <div className="brandbar" />
      <nav className="topnav">
        <Link href="/dashboard" className="logo">
          <div className="logo-mark">⚡</div>
          AImpact
          <span className="tag">BETA</span>
        </Link>

        <div className="nav-tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`nav-tab${pathname.startsWith(tab.href) ? " active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          {/* Tier badge */}
          <span className="chip neutral" style={{ fontSize: 11 }}>
            <span className="bullet" />
            {user.tier}
          </span>

          {/* Notification bell */}
          <NotificationBell />

          {/* Avatar + dropdown */}
          <div style={{ position: "relative" }}>
            <div
              className={`avatar ${getAvatarClass(user.email)}`}
              onClick={() => setMenuOpen((o) => !o)}
              title={user.name ?? user.email ?? ""}
            >
              {getInitials(user.name)}
            </div>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  boxShadow: "var(--shadow-lift)",
                  minWidth: 200,
                  zIndex: 200,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{user.email}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    {user.role.replace(/_/g, " ")} · {user.tier}
                  </div>
                </div>
                <Link
                  href="/profile/me"
                  style={{ display: "block", padding: "10px 16px", fontSize: 13, color: "var(--ink)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  My Profile
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 13,
                    color: "var(--rose)",
                    background: "none",
                    border: "none",
                    borderTop: "1px solid var(--border)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
