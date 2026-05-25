"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

interface ClaimSettings {
  require_corroborator: string;
  require_jira_ticket: string;
  require_project: string;
}

const ROLES = ["QA_MEMBER", "QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"];
const TIERS = ["NEW", "TRUSTED", "PRO"];

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function Toggle({ on, onClick, saving }: { on: boolean; onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      title={saving ? "Saving…" : on ? "Enabled — click to disable" : "Disabled — click to enable"}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: saving ? "not-allowed" : "pointer",
        background: on ? "var(--green)" : "var(--border)",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
        opacity: saving ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export function SettingsClient({
  users: initialUsers,
  claimSettings,
}: {
  users: User[];
  claimSettings: ClaimSettings;
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("users");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Add-user modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("QA_MEMBER");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Claim submission rules
  const [requireCorroborator, setRequireCorroborator] = useState(
    claimSettings.require_corroborator === "true"
  );
  const [requireJiraTicket, setRequireJiraTicket] = useState(
    claimSettings.require_jira_ticket === "true"
  );
  const [requireProject, setRequireProject] = useState(
    claimSettings.require_project === "true"
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function updateUser(userId: string, updates: Partial<User>) {
    setSavingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated: User = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      }
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Remove this user? They have no claims so this is safe.")) return;
    setSavingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error ?? "Could not delete user.");
      }
    } finally {
      setSavingId(null);
    }
  }

  function openAddModal() {
    setAddEmail("");
    setAddName("");
    setAddRole("QA_MEMBER");
    setAddError(null);
    setAddOpen(true);
    setTimeout(() => emailRef.current?.focus(), 50);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim(), name: addName.trim() || undefined, role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add user.");
        return;
      }
      setUsers((prev) => [...prev, data as User]);
      setAddOpen(false);
      router.refresh();
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleToggle(key: string, newValue: boolean) {
    setSavingKey(key);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue ? "true" : "false" }),
      });
      if (key === "require_corroborator") setRequireCorroborator(newValue);
      if (key === "require_jira_ticket") setRequireJiraTicket(newValue);
      if (key === "require_project") setRequireProject(newValue);
    } catch {
      // ignore; UI stays optimistic
    } finally {
      setSavingKey(null);
    }
  }

  const nav = [
    { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
    { id: "thresholds", label: "Approval Thresholds", icon: "⚙️" },
    { id: "tiers", label: "Trust Tiers", icon: "🎖️" },
    { id: "claims", label: "Claim Submission", icon: "📋" },
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
            <>
              {/* Add User Modal */}
              {addOpen && (
                <div
                  style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 500,
                  }}
                  onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}
                >
                  <div style={{
                    background: "var(--surface)", borderRadius: 12,
                    boxShadow: "var(--shadow-lift)", width: 440, padding: 28,
                  }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Add User</h2>
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
                      The user will appear in the system immediately. When they sign in via Google
                      with this email, their assigned role will be preserved automatically.
                    </p>

                    <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="field">
                        <label>Email <span style={{ color: "var(--red)" }}>*</span></label>
                        <input
                          ref={emailRef}
                          className="input"
                          type="email"
                          placeholder="user@folio3.com"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          required
                        />
                        <span className="help">Must be a @folio3.com address</span>
                      </div>

                      <div className="field">
                        <label>Full Name <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                        <input
                          className="input"
                          type="text"
                          placeholder="e.g. Ahmed Khan"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                        />
                        <span className="help">Will be updated from Google profile on first login</span>
                      </div>

                      <div className="field">
                        <label>Role <span style={{ color: "var(--red)" }}>*</span></label>
                        <select
                          className="select"
                          value={addRole}
                          onChange={(e) => setAddRole(e.target.value)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>

                      {addError && (
                        <div style={{
                          background: "#fff5f5", border: "1px solid var(--red)",
                          borderRadius: 8, padding: "10px 14px",
                          fontSize: 13, color: "var(--red)",
                        }}>
                          {addError}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setAddOpen(false)}
                          disabled={addSaving}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn primary" disabled={addSaving}>
                          {addSaving ? "Adding…" : "Add User"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-head">
                  <div className="card-title">Users <span className="count">{users.length}</span></div>
                  <button className="btn sm primary" onClick={openAddModal}>+ Add User</button>
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
                            <div className={`avatar sm ${u.isActive ? "" : "a-muted"}`}
                              style={!u.isActive ? { opacity: 0.45 } : {}}>
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <div className="nm" style={!u.isActive ? { color: "var(--muted)" } : {}}>
                                {u.name ?? u.email?.split("@")[0]}
                                {!u.isActive && (
                                  <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>
                                    (inactive)
                                  </span>
                                )}
                              </div>
                              <div className="role">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            className="select"
                            style={{ width: "auto", padding: "5px 8px", fontSize: 12.5 }}
                            value={u.role}
                            onChange={(e) => updateUser(u.id, { role: e.target.value })}
                            disabled={savingId === u.id}
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
                            value={u.tier}
                            onChange={(e) => updateUser(u.id, { tier: e.target.value })}
                            disabled={savingId === u.id}
                          >
                            {TIERS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td className="mono">{u.approvalCount}</td>
                        <td>
                          <span className={`chip ${u.isActive ? "approved" : "neutral"}`}>
                            <span className="bullet" />
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          {savingId === u.id ? (
                            <span className="muted" style={{ fontSize: 12 }}>Saving…</span>
                          ) : (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className={`btn sm ${u.isActive ? "ghost" : "primary"}`}
                                onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                              {u.approvalCount === 0 && (
                                <button
                                  className="btn sm danger"
                                  title="Remove user (only available if they have no claims)"
                                  onClick={() => deleteUser(u.id)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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

          {activeSection === "claims" && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Claim Submission Rules</div>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                {[
                  {
                    key: "require_corroborator",
                    label: "Require Peer Corroborator",
                    help: "Claims must be confirmed by a peer witness before review",
                    value: requireCorroborator,
                  },
                  {
                    key: "require_jira_ticket",
                    label: "Require Jira Ticket",
                    help: "A Jira ticket URL must be provided with every claim",
                    value: requireJiraTicket,
                  },
                  {
                    key: "require_project",
                    label: "Require Project",
                    help: "Claims must be assigned to a project",
                    value: requireProject,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 20,
                      padding: "16px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{item.help}</div>
                      {savingKey === item.key && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                          Saving…
                        </div>
                      )}
                    </div>
                    <Toggle
                      on={item.value}
                      onClick={() => handleToggle(item.key, !item.value)}
                      saving={savingKey === item.key}
                    />
                  </div>
                ))}
              </div>
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
