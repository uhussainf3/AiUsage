"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className={styles.root}>
      {/* ── Left pane ── */}
      <div className={styles.left}>
        <div className={styles.redStrip} />

        <div className={styles.inner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span>AImpact</span>
            <span className={styles.tag}>BETA</span>
          </div>

          <div className={styles.headline}>
            <h1>Track your AI wins.</h1>
            <p>
              Log productivity gains from Claude Code, Playwright MCP, and
              NetSuite MCP — verified, ranked, and celebrated.
            </p>
          </div>

          <button
            className={styles.googleBtn}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {loading ? "Signing in…" : "Sign in with Google"}
          </button>

          <p className={styles.note}>
            Restricted to <strong>@folio3.com</strong> accounts only.
            <br />
            Contact your admin if you don&apos;t have access.
          </p>
        </div>
      </div>

      {/* ── Right pane ── */}
      <div className={styles.right}>
        <div className={styles.rightInner}>
          <div className={styles.heroStat}>
            <span className={styles.heroNum}>3,184h</span>
            <span className={styles.heroLabel}>saved by the team this quarter</span>
          </div>

          <div className={styles.miniBoard}>
            <div className={styles.miniBoardTitle}>🏆 This week&apos;s leaders</div>
            {[
              { name: "Sara Ahmed", hours: "42h", rank: 1 },
              { name: "Usman Raza", hours: "38h", rank: 2 },
              { name: "Fatima K.", hours: "31h", rank: 3 },
            ].map((u) => (
              <div key={u.rank} className={styles.miniRow}>
                <span className={styles.miniRank}>#{u.rank}</span>
                <div className={`avatar a-${u.rank}`} style={{ width: 28, height: 28, fontSize: 11 }}>
                  {u.name[0]}
                </div>
                <span className={styles.miniName}>{u.name}</span>
                <span className={styles.miniHours}>{u.hours}</span>
              </div>
            ))}
          </div>

          <div className={styles.pillGrid}>
            {["Claude Code", "Playwright MCP", "NetSuite MCP", "3-layer verify", "Leaderboard", "CEO Reports"].map((t) => (
              <span key={t} className={styles.pill}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
