"use client";

import { useState, useMemo } from "react";
import styles from "./reports.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimRecord {
  id: string;
  jiraTicketId: string | null;
  jiraTicketUrl: string | null;
  claimType: string;
  toolsUsed: string;
  hoursSaved: number;
  approvedHours: number | null;
  estimatedWithout: number;
  estimatedWith: number;
  status: string;
  createdAt: string; // ISO string
  submitterId: string;
  submitterName: string | null;
  submitterEmail: string | null;
  projectId: string | null;
  projectName: string | null;
}

export interface UserSummary {
  userId: string;
  name: string | null;
  email: string | null;
  totalHours: number;
  claimCount: number;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  totalHours: number;
  claimCount: number;
}

export interface TypeSummary {
  claimType: string;
  totalHours: number;
  claimCount: number;
}

export interface WeekBucket {
  label: string;
  weekStart: string; // ISO
  hours: number;
  claimCount: number;
}

interface Props {
  claims: ClaimRecord[];
  userSummaries: UserSummary[];
  projectSummaries: ProjectSummary[];
  typeSummaries: TypeSummary[];
  weekBuckets: WeekBucket[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "all";

function periodMs(p: Period): number {
  if (p === "7d") return 7 * 24 * 60 * 60 * 1000;
  if (p === "30d") return 30 * 24 * 60 * 60 * 1000;
  if (p === "90d") return 90 * 24 * 60 * 60 * 1000;
  return Infinity;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarClass(email?: string | null): string {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}

function fmtHours(n: number): string {
  const v = parseFloat(n.toFixed(1));
  return `${v}h`;
}

function fmtDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  TEST_AUTOMATION: "Test Automation",
  BUG_DETECTION: "Bug Detection",
  REGRESSION: "Regression Testing",
  CI_CD: "CI/CD Pipeline",
  CODE_REVIEW: "Code Review",
  OTHER: "Other",
};

const HOURLY_RATE = 45;

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsClient({
  claims,
  userSummaries,
  projectSummaries,
  typeSummaries,
  weekBuckets,
}: Props) {
  const [period, setPeriod] = useState<Period>("30d");

  const cutoff = useMemo(() => {
    const ms = periodMs(period);
    if (ms === Infinity) return new Date(0);
    return new Date(Date.now() - ms);
  }, [period]);

  // Filter all data to the selected period
  const filteredClaims = useMemo(
    () => claims.filter((c) => new Date(c.createdAt) >= cutoff),
    [claims, cutoff]
  );

  // Recompute summaries from filtered claims
  const filteredUserMap = useMemo(() => {
    const map = new Map<string, UserSummary>();
    for (const c of filteredClaims) {
      const eff = c.approvedHours ?? c.hoursSaved;
      if (!map.has(c.submitterId)) {
        map.set(c.submitterId, {
          userId: c.submitterId,
          name: c.submitterName,
          email: c.submitterEmail,
          totalHours: 0,
          claimCount: 0,
        });
      }
      const entry = map.get(c.submitterId)!;
      entry.totalHours += eff;
      entry.claimCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredClaims]);

  const filteredProjectMap = useMemo(() => {
    const map = new Map<string, ProjectSummary>();
    for (const c of filteredClaims) {
      if (!c.projectId || !c.projectName) continue;
      const eff = c.approvedHours ?? c.hoursSaved;
      if (!map.has(c.projectId)) {
        map.set(c.projectId, {
          projectId: c.projectId,
          projectName: c.projectName,
          totalHours: 0,
          claimCount: 0,
        });
      }
      const entry = map.get(c.projectId)!;
      entry.totalHours += eff;
      entry.claimCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredClaims]);

  const filteredTypeMap = useMemo(() => {
    const map = new Map<string, TypeSummary>();
    for (const c of filteredClaims) {
      const eff = c.approvedHours ?? c.hoursSaved;
      if (!map.has(c.claimType)) {
        map.set(c.claimType, {
          claimType: c.claimType,
          totalHours: 0,
          claimCount: 0,
        });
      }
      const entry = map.get(c.claimType)!;
      entry.totalHours += eff;
      entry.claimCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredClaims]);

  // Weekly trend — last 8 buckets that fall within the period
  const filteredWeeks = useMemo(() => {
    const relevant = weekBuckets.filter(
      (w) => new Date(w.weekStart) >= cutoff || period === "all"
    );
    return relevant.slice(-8);
  }, [weekBuckets, cutoff, period]);

  // Summary stats
  const totalHours = useMemo(
    () =>
      filteredClaims.reduce(
        (s, c) => s + (c.approvedHours ?? c.hoursSaved),
        0
      ),
    [filteredClaims]
  );
  const totalClaims = filteredClaims.length;
  const uniqueContributors = filteredUserMap.length;
  const estDollarValue = totalHours * HOURLY_RATE;

  const maxWeekHours = Math.max(...filteredWeeks.map((w) => w.hours), 1);
  const maxTypeHours = filteredTypeMap[0]?.totalHours || 1;

  const recentApprovals = filteredClaims.slice(0, 10);

  return (
    <div className="page wide">
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="sub">
            AI productivity impact · management view
          </p>
        </div>
        <div className="head-actions">
          {/* Period filter */}
          <div className="seg">
            {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
              <button
                key={p}
                className={period === p ? "on" : ""}
                onClick={() => setPeriod(p)}
              >
                {p === "7d"
                  ? "7 days"
                  : p === "30d"
                  ? "30 days"
                  : p === "90d"
                  ? "90 days"
                  : "All time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className={styles.statGrid}>
        <div className="stat-card">
          <div className="stat-label">Hours Saved</div>
          <div className="stat-value">{fmtHours(totalHours)}</div>
          <div className="stat-sub">Approved this period</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Claims Approved</div>
          <div className="stat-value">{totalClaims}</div>
          <div className="stat-sub">In selected period</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unique Contributors</div>
          <div className="stat-value">{uniqueContributors}</div>
          <div className="stat-sub">Members with approvals</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Est. Dollar Value</div>
          <div
            className="stat-value"
            style={{ color: "var(--green)", fontSize: 22 }}
          >
            {fmtDollars(estDollarValue)}
          </div>
          <div className="stat-sub">At ${HOURLY_RATE}/hr estimate</div>
        </div>
      </div>

      {/* ── Section 1: Weekly Trend ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div className="card-title">Weekly Trend — Hours Saved</div>
          <span className="card-sub">Last 8 weeks in period</span>
        </div>
        <div style={{ padding: "24px 24px 16px" }}>
          {filteredWeeks.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px" }}>
              <p>No approved claims in this period.</p>
            </div>
          ) : (
            <div className={styles.barChart}>
              {filteredWeeks.map((w) => (
                <div key={w.weekStart} className={styles.barCol}>
                  <div className={styles.barLabel}>
                    {w.hours > 0 ? fmtHours(w.hours) : ""}
                  </div>
                  <div className={styles.barOuter}>
                    <div
                      className={styles.barInner}
                      style={{
                        height: `${(w.hours / maxWeekHours) * 100}%`,
                      }}
                      title={`${w.claimCount} claim${w.claimCount !== 1 ? "s" : ""}`}
                    />
                  </div>
                  <div className={styles.barTick}>{w.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column grid: contributors + projects ── */}
      <div className={styles.twoCol} style={{ marginBottom: 20 }}>
        {/* ── Section 2: Top Contributors ── */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              Top Contributors
              <span className="count">{filteredUserMap.length}</span>
            </div>
          </div>
          {filteredUserMap.length === 0 ? (
            <div className="empty-state">
              <p>No approved claims in this period.</p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Member</th>
                  <th>Claims</th>
                  <th>Hours</th>
                  <th>Est. Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredUserMap.slice(0, 10).map((u, i) => (
                  <tr key={u.userId}>
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontWeight: 700,
                          fontSize: 13,
                          color:
                            i === 0
                              ? "var(--gold)"
                              : i === 1
                              ? "var(--silver)"
                              : i === 2
                              ? "var(--bronze)"
                              : "var(--muted)",
                        }}
                      >
                        #{i + 1}
                      </span>
                    </td>
                    <td>
                      <div className="cell-user">
                        <div
                          className={`avatar sm ${getAvatarClass(u.email)}`}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="nm">
                            {u.name ?? u.email?.split("@")[0] ?? "Unknown"}
                          </div>
                          <div className="role">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono muted">{u.claimCount}</td>
                    <td>
                      <span className="hours-cell">
                        <span className="saved">
                          +{u.totalHours.toFixed(1)}h
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 600,
                        color: "var(--green)",
                      }}
                    >
                      {fmtDollars(u.totalHours * HOURLY_RATE)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Section 3: By Project ── */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              By Project
              <span className="count">{filteredProjectMap.length}</span>
            </div>
          </div>
          {filteredProjectMap.length === 0 ? (
            <div className="empty-state">
              <p>No project-linked claims in this period.</p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Claims</th>
                  <th>Hours Saved</th>
                  <th>Est. Value</th>
                  <th>Avg / Claim</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjectMap.map((p) => (
                  <tr key={p.projectId}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{p.projectName}</span>
                    </td>
                    <td className="mono muted">{p.claimCount}</td>
                    <td>
                      <span className="hours-cell">
                        <span className="saved">
                          +{p.totalHours.toFixed(1)}h
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 600,
                        color: "var(--green)",
                        fontSize: 12,
                      }}
                    >
                      {fmtDollars(p.totalHours * HOURLY_RATE)}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {(p.totalHours / p.claimCount).toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Section 4: By Claim Type ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div className="card-title">By Claim Type</div>
        </div>
        {filteredTypeMap.length === 0 ? (
          <div className="empty-state">
            <p>No approved claims in this period.</p>
          </div>
        ) : (
          <div className={styles.typeSection}>
            {/* Horizontal bar chart */}
            <div className={styles.typeChart}>
              {filteredTypeMap.map((t) => {
                const pct = (t.totalHours / maxTypeHours) * 100;
                return (
                  <div key={t.claimType} className={styles.typeRow}>
                    <div className={styles.typeLabel}>
                      {CLAIM_TYPE_LABELS[t.claimType] ?? t.claimType}
                    </div>
                    <div className={styles.typeBarWrap}>
                      <div
                        className={styles.typeBar}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className={styles.typeHours}>
                      {fmtHours(t.totalHours)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table */}
            <table className="tbl" style={{ borderTop: "1px solid var(--border)" }}>
              <thead>
                <tr>
                  <th>Claim Type</th>
                  <th>Claims</th>
                  <th>Hours Saved</th>
                  <th>Est. Value</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypeMap.map((t) => {
                  const share =
                    totalHours > 0 ? (t.totalHours / totalHours) * 100 : 0;
                  return (
                    <tr key={t.claimType}>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {CLAIM_TYPE_LABELS[t.claimType] ?? t.claimType}
                        </span>
                      </td>
                      <td className="mono muted">{t.claimCount}</td>
                      <td>
                        <span className="hours-cell">
                          <span className="saved">
                            +{t.totalHours.toFixed(1)}h
                          </span>
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--mono)",
                          fontWeight: 600,
                          color: "var(--green)",
                          fontSize: 12,
                        }}
                      >
                        {fmtDollars(t.totalHours * HOURLY_RATE)}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              background: "var(--surface)",
                              borderRadius: 4,
                              height: 6,
                              minWidth: 60,
                            }}
                          >
                            <div
                              style={{
                                width: `${share}%`,
                                height: "100%",
                                background: "var(--blue)",
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: 11,
                              color: "var(--muted)",
                              minWidth: 32,
                            }}
                          >
                            {share.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 5: Recent Approvals ── */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            Recent Approvals
            <span className="count">{recentApprovals.length}</span>
          </div>
        </div>
        {recentApprovals.length === 0 ? (
          <div className="empty-state">
            <p>No approved claims in this period.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Submitter</th>
                <th>Ticket</th>
                <th>Project</th>
                <th>Type</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {recentApprovals.map((c) => (
                <tr key={c.id}>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(c.createdAt)}
                  </td>
                  <td>
                    <div className="cell-user">
                      <div
                        className={`avatar sm ${getAvatarClass(
                          c.submitterEmail
                        )}`}
                      >
                        {getInitials(c.submitterName)}
                      </div>
                      <span className="nm">
                        {c.submitterName ??
                          c.submitterEmail?.split("@")[0] ??
                          "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td>
                    {c.jiraTicketId ? (
                      c.jiraTicketUrl ? (
                        <a
                          href={c.jiraTicketUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ticket"
                        >
                          {c.jiraTicketId}
                        </a>
                      ) : (
                        <span className="ticket">{c.jiraTicketId}</span>
                      )
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        —
                      </span>
                    )}
                  </td>
                  <td
                    style={{ fontSize: 13, color: "var(--ink-2)" }}
                  >
                    {c.projectName ?? (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="chip neutral" style={{ fontSize: 10.5 }}>
                      <span className="bullet" />
                      {CLAIM_TYPE_LABELS[c.claimType] ?? c.claimType}
                    </span>
                  </td>
                  <td>
                    <span className="hours-cell">
                      <span className="saved">
                        +{(c.approvedHours ?? c.hoursSaved).toFixed(1)}h
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
