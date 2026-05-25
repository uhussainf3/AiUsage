"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./projects.module.css";

interface PM {
  id: string;
  name: string | null;
  email: string | null;
}

interface ProjectStat {
  id: string;
  name: string;
  jiraProjectKey: string | null;
  description: string | null;
  isActive: boolean;
  pm: PM;
  totalClaims: number;
  approvedClaims: number;
  pendingClaims: number;
  totalHours: number;
  dollarValue: number;
  uniqueMembers: number;
  lastActivity: string | null;
  createdAt: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface GlobalStats {
  totalProjects: number;
  totalHours: number;
  totalClaims: number;
  dollarValue: number;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarClass(email?: string | null) {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}

function timeAgo(isoStr: string | null) {
  if (!isoStr) return "No activity";
  const diff = Date.now() - new Date(isoStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function adoptionColor(rate: number) {
  if (rate >= 0.7) return "var(--green)";
  if (rate >= 0.4) return "var(--amber)";
  return "var(--rose)";
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "28px 32px",
  width: "100%",
  maxWidth: 480,
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

export function ProjectsClient({
  projects,
  allUsers,
  currentUserId,
  currentUserRole,
  canManage,
  globalStats,
}: {
  projects: ProjectStat[];
  allUsers: UserOption[];
  currentUserId: string;
  currentUserRole: string;
  canManage: boolean;
  globalStats: GlobalStats;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Create project modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPmId, setNewPmId] = useState(currentUserId);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Sort/filter
  const [sortBy, setSortBy] = useState<"hours" | "claims" | "name" | "activity">("hours");
  const [filterPm, setFilterPm] = useState("");

  const sorted = [...projects]
    .filter((p) => !filterPm || p.pm.id === filterPm)
    .sort((a, b) => {
      if (sortBy === "hours") return b.totalHours - a.totalHours;
      if (sortBy === "claims") return b.approvedClaims - a.approvedClaims;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "activity") {
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bTime - aTime;
      }
      return 0;
    });

  async function handleCreate() {
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          jiraProjectKey: newKey.toUpperCase() || undefined,
          description: newDesc || undefined,
          pmId: newPmId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setCreateError(d.error ?? "Failed to create project.");
      } else {
        setShowCreate(false);
        setNewName("");
        setNewKey("");
        setNewDesc("");
        startTransition(() => router.refresh());
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  // Unique PMs for filter
  const pmOptions = Array.from(
    new Map(projects.map((p) => [p.pm.id, p.pm])).values()
  );

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="sub">
            Track AI adoption across all active projects.
            Each card shows how well a team is integrating AI into their workflow.
          </p>
        </div>
        <div className="head-actions">
          {canManage && (
            <button className="btn primary" onClick={() => setShowCreate(true)}>
              + New Project
            </button>
          )}
        </div>
      </div>

      {/* ── Global stat bar ── */}
      <div className={styles.globalBar}>
        <div className={styles.globalStat}>
          <span className={styles.globalVal}>{globalStats.totalProjects}</span>
          <span className={styles.globalLabel}>Active Projects</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.globalStat}>
          <span className={styles.globalVal}>{globalStats.totalHours.toFixed(0)}h</span>
          <span className={styles.globalLabel}>Total Hours Saved</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.globalStat}>
          <span className={styles.globalVal}>${globalStats.dollarValue.toLocaleString()}</span>
          <span className={styles.globalLabel}>Estimated Value</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.globalStat}>
          <span className={styles.globalVal}>{globalStats.totalClaims}</span>
          <span className={styles.globalLabel}>Approved Claims</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.toolbar}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Sort by</span>
          {(["hours", "claims", "name", "activity"] as const).map((s) => (
            <button
              key={s}
              className={`btn sm ${sortBy === s ? "primary" : "ghost"}`}
              onClick={() => setSortBy(s)}
            >
              {s === "hours" ? "Hours Saved" : s === "claims" ? "Claims" : s === "name" ? "Name" : "Last Activity"}
            </button>
          ))}
        </div>
        {pmOptions.length > 1 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>PM</span>
            <select
              className="select"
              style={{ fontSize: 13, padding: "4px 10px", height: 32 }}
              value={filterPm}
              onChange={(e) => setFilterPm(e.target.value)}
            >
              <option value="">All PMs</option>
              {pmOptions.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name ?? pm.email?.split("@")[0]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Project grid ── */}
      {sorted.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div style={{ fontSize: 40 }}>📁</div>
          <p>No projects yet.</p>
          {canManage && (
            <button
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => setShowCreate(true)}
            >
              Create First Project
            </button>
          )}
          {!canManage && (
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
              Ask your Project Manager or Admin to create projects.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {sorted.map((p, i) => {
            const adoptionRate =
              p.totalClaims > 0 ? p.approvedClaims / p.totalClaims : 0;
            const barColor = adoptionColor(adoptionRate);
            const isMyProject = p.pm.id === currentUserId;

            return (
              <div
                key={p.id}
                className={`card ${styles.projectCard} ${isMyProject ? styles.myProject : ""}`}
              >
                {/* Rank badge */}
                <div className={styles.rankBadge} style={{
                  color: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--muted)",
                }}>
                  #{i + 1}
                </div>

                {/* Header */}
                <div className={styles.cardHead}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.projectName}>
                      {p.name}
                      {isMyProject && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "var(--red)",
                          background: "var(--red-soft)", padding: "1px 6px",
                          borderRadius: 4, marginLeft: 8,
                        }}>
                          YOUR PROJECT
                        </span>
                      )}
                    </div>
                    {p.jiraProjectKey && (
                      <div className={styles.jiraKey}>{p.jiraProjectKey}</div>
                    )}
                    {p.description && (
                      <div className={styles.desc}>{p.description}</div>
                    )}
                  </div>
                </div>

                {/* PM row */}
                <div className={styles.pmRow}>
                  <div className={`avatar sm ${getAvatarClass(p.pm.email)}`}>
                    {getInitials(p.pm.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                      {p.pm.name ?? p.pm.email?.split("@")[0]}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Project Manager</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                    <div>{timeAgo(p.lastActivity)}</div>
                    <div style={{ marginTop: 1 }}>last activity</div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <div className={styles.statNum} style={{ color: "var(--green)" }}>
                      {p.totalHours.toFixed(1)}h
                    </div>
                    <div className={styles.statLbl}>Hours Saved</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNum} style={{ color: "var(--green)" }}>
                      ${p.dollarValue.toLocaleString()}
                    </div>
                    <div className={styles.statLbl}>$ Value</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNum}>{p.approvedClaims}</div>
                    <div className={styles.statLbl}>Approved</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNum}>{p.uniqueMembers}</div>
                    <div className={styles.statLbl}>Contributors</div>
                  </div>
                </div>

                {/* Adoption bar */}
                <div className={styles.adoptionSection}>
                  <div className={styles.adoptionLabel}>
                    <span>Adoption Rate</span>
                    <span style={{ color: barColor, fontWeight: 700 }}>
                      {p.totalClaims > 0
                        ? `${Math.round(adoptionRate * 100)}%`
                        : "No claims yet"}
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${Math.round(adoptionRate * 100)}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  <div className={styles.adoptionMeta}>
                    <span>{p.approvedClaims} approved</span>
                    {p.pendingClaims > 0 && (
                      <span style={{ color: "var(--amber)" }}>
                        · {p.pendingClaims} pending
                      </span>
                    )}
                    <span style={{ marginLeft: "auto" }}>{p.totalClaims} total</span>
                  </div>
                </div>

                {/* Enforcement indicator */}
                <div className={styles.enforcementRow}>
                  {p.totalHours >= 20 ? (
                    <span className="chip approved" style={{ fontSize: 11 }}>
                      <span className="bullet" />
                      Strong AI Adoption
                    </span>
                  ) : p.totalHours >= 5 ? (
                    <span className="chip corroborated" style={{ fontSize: 11 }}>
                      <span className="bullet" />
                      Growing Adoption
                    </span>
                  ) : p.totalClaims > 0 ? (
                    <span className="chip pending" style={{ fontSize: 11 }}>
                      <span className="bullet" />
                      Early Stage
                    </span>
                  ) : (
                    <span className="chip neutral" style={{ fontSize: 11 }}>
                      <span className="bullet" />
                      Not Started
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create project modal ── */}
      {showCreate && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Project</h2>
              <button
                onClick={() => setShowCreate(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>Project Name *</label>
              <input
                className="input"
                placeholder="e.g. QA Automation Suite"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Jira Project Key
                <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6, fontSize: 12 }}>
                  (optional — enables auto-link)
                </span>
              </label>
              <input
                className="input mono"
                placeholder="e.g. QA or PROJ"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                maxLength={12}
              />
              <span className="help">
                Claims whose Jira ticket starts with this key will be auto-linked to this project.
              </span>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Description
                <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6, fontSize: 12 }}>(optional)</span>
              </label>
              <textarea
                className="textarea"
                placeholder="Short description of the project's goals…"
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6 }}>Project Manager *</label>
              <select
                className="select"
                value={newPmId}
                onChange={(e) => setNewPmId(e.target.value)}
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email?.split("@")[0]} — {u.role.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {createError && (
              <div style={{
                color: "var(--rose)", fontSize: 13, padding: "10px 14px",
                background: "var(--rose-soft)", borderRadius: 6, marginBottom: 16,
              }}>
                {createError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleCreate}
                disabled={creating || newName.trim().length < 2 || !newPmId}
              >
                {creating ? "Creating…" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
