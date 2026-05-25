"use client";

import { useState } from "react";
import styles from "./settings.module.css";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  tier: string;
  isActive: boolean;
  approvalCount: number;
}

const ROLES = ["QA_MEMBER", "QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"];
const TIERS = ["NEW", "TRUSTED", "PRO"];

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function SettingsClient({ users }: { users: User[] }) {
  const [activeSection, setActiveSection] = useState("users");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateUser(userId: string, updates: Partial<User>) {
    setSavingId(userId);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSavingId(null);
  }

  const nav = [
    { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
    { id: "thresholds", label: "Approval Thresholds", icon: "⚙️" },
    { id: "tiers", label: "Trust Tiers", icon: "🎖️" },
    { id: "reports", label: "Reports", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "integrations", label: "Integrations", icon: "🔗" },
  ];

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Admin Settings</h1>
          <p className="sub">Configure AImpact — leaderboard, approvals, tiers, reports</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar nav ── */}
        <div className={styles.settingsNav}>
          {nav.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Content panels ── */}
        <div>
          {activeSection === "users" && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Users <span className="count">{users.length}</span></div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Tier</th>
                    <th>Approvals</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="cell-user">
                          <div className="avatar sm">{getInitials(u.name)}</div>
                          <div>
                            <div className="nm">{u.name ?? u.email?.split("@")[0]}</div>
                            <div className="role">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="select"
                          style={{ width: "auto", padding: "5px 8px", fontSize: 12.5 }}
                          defaultValue={u.role}
                          onChange={(e) => updateUser(u.id, { role: e.target.value })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="select"
                          style={{ width: "auto", padding: "5px 8px", fontSize: 12.5 }}
                          defaultValue={u.tier}
                          onChange={(e) => updateUser(u.id, { tier: e.target.value })}
                        >
                          {TIERS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="mono">{u.approvalCount}</td>
                      <td>
                        <span className={`chip ${u.isActive ? "approved" : "rejected"}`}>
                          <span className="bullet" />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        {savingId === u.id ? (
                          <span className="muted" style={{ fontSize: 12 }}>Saving…</span>
                        ) : (
                          <button
                            className="btn sm danger"
                            onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "thresholds" && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Approval Thresholds</div>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                {[
                  { label: "Auto-approve below (hours)", help: "Claims under this limit with Jira match are auto-approved for Trusted+ members", defaultVal: 4 },
                  { label: "Escalate above (hours)", help: "Claims above this are always reviewed by a Lead", defaultVal: 16 },
                  { label: "Weekly claim cap per member", help: "Maximum claims one member can submit per week", defaultVal: 10 },
                  { label: "Jira match minimum (%)", help: "Minimum Jira match % required for auto-approval", defaultVal: 80 },
                ].map((item) => (
                  <div key={item.label} className="field">
                    <label>{item.label}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input
                        className="input mono"
                        type="number"
                        defaultValue={item.defaultVal}
                        style={{ width: 100 }}
                      />
                      <button className="btn sm primary">Save</button>
                    </div>
                    <span className="help">{item.help}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "tiers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { tier: "NEW", icon: "🌱", color: "var(--muted)", desc: "Just joined. All claims require full 3-layer verification.", autoApprove: false },
                { tier: "TRUSTED", icon: "✅", color: "var(--blue)", desc: "5–24 approved claims. Claims under 4h with Jira match auto-approved.", autoApprove: true },
                { tier: "PRO", icon: "⭐", color: "var(--gold)", desc: "25+ approved claims. Reduced verification friction. Peer-only for small claims.", autoApprove: true },
              ].map((t) => (
                <div key={t.tier} className="card">
                  <div className="card-head">
                    <div className="card-title">
                      {t.icon} {t.tier}
                      <span className={`chip ${t.autoApprove ? "approved" : "neutral"}`} style={{ fontSize: 10.5 }}>
                        <span className="bullet" />
                        {t.autoApprove ? "Auto-approve eligible" : "Full verification"}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 16 }}>{t.desc}</p>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div className="field" style={{ flex: 1 }}>
                        <label>Min approvals to reach tier</label>
                        <input className="input mono" type="number"
                          defaultValue={t.tier === "NEW" ? 0 : t.tier === "TRUSTED" ? 5 : 25}
                          style={{ width: 100 }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "leaderboard" && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Leaderboard Settings</div>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label>Default Period</label>
                  <div className="seg" style={{ width: "fit-content" }}>
                    {["Weekly", "Monthly", "All-time"].map((p) => (
                      <button key={p} className={p === "Monthly" ? "on" : ""}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Enabled Views</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["Weekly", "Monthly", "All-time", "By Sprint"].map((v) => (
                      <label key={v} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <div className={`toggle ${v !== "By Sprint" ? "on" : ""}`} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "reports" && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Report Settings</div>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="field">
                  <label>Hourly Rate (for $ calculations)</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--muted)" }}>$</span>
                    <input className="input mono" type="number" defaultValue={45} style={{ width: 100 }} />
                    <span className="muted" style={{ fontSize: 13 }}>/hour</span>
                    <button className="btn sm primary">Save</button>
                  </div>
                </div>
                <div className="field">
                  <label>Scheduled CEO Report</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Weekly PDF (every Monday 8 AM)", on: true },
                      { label: "Monthly summary email", on: true },
                      { label: "Sprint report on sprint close", on: false },
                    ].map((item) => (
                      <label key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <div className={`toggle ${item.on ? "on" : ""}`} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "integrations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { name: "Jira Cloud", icon: "🟦", connected: false, desc: "Auto-fetch ticket details and validate hours" },
                { name: "Google OAuth", icon: "🔴", connected: true, desc: "@folio3.com SSO — already configured" },
                { name: "Email (SMTP)", icon: "📧", connected: false, desc: "Send scheduled CEO reports and notifications" },
              ].map((item) => (
                <div key={item.name} className="card">
                  <div className="card-head">
                    <div className="card-title">
                      {item.icon} {item.name}
                      <span className={`chip ${item.connected ? "approved" : "neutral"}`} style={{ fontSize: 10.5 }}>
                        <span className="bullet" />
                        {item.connected ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <button className={`btn sm ${item.connected ? "ghost" : "primary"}`}>
                      {item.connected ? "Manage" : "Connect"}
                    </button>
                  </div>
                  <div style={{ padding: "12px 20px", fontSize: 13, color: "var(--muted)" }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
