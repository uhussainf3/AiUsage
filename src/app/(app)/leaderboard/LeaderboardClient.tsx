"use client";

import { useState, useMemo } from "react";
import styles from "./leaderboard.module.css";
import { fmtHours } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  department: string | null; // functional team — takes precedence over role for display
  tier: string;
  totalHours: number;
  claimCount: number;
  divisionHours: Record<string, number>;
  divisionClaims: Record<string, number>;
}

interface DivisionOption {
  id: string;
  name: string;
}

interface DivisionTotal {
  id: string;
  name: string;
  hours: number;
  claimCount: number;
}

interface Props {
  rows: UserRow[];
  divisions: DivisionOption[];
  divisionTotals: DivisionTotal[];
  toolTotals: Record<string, number>;
  toolByDivision: Record<string, Record<string, number>>;
  currentUserId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  QA_MEMBER: "QA Member",
  QA_LEAD: "QA Lead",
  DEV_LEAD: "Dev Lead",
  PROJECT_MANAGER: "Project Manager",
  DIVISION_HEAD: "Division Head",
  ADMIN: "Admin",
};

// System roles that are management/oversight — excluded from the default leaderboard view
// (only applies to users who have NOT set a department)
const MANAGEMENT_ROLES = new Set(["ADMIN", "DIVISION_HEAD"]);

// Canonical display order for role-based filter fallback
const ROLE_ORDER = ["QA_MEMBER", "QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "DIVISION_HEAD", "ADMIN"];

// Returns the label shown in the table "Team" column for a user
function userTeamLabel(r: UserRow): string {
  return r.department ?? r.role.replace(/_/g, " ");
}

// Returns the filter key used to group this user
// If a department is set, use it. Otherwise fall back to system role.
function userFilterKey(r: UserRow): string {
  return r.department ?? r.role;
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

function toolLabel(t: string) {
  return t === "claude" ? "Claude Code" : t === "play" ? "Playwright MCP" : t === "netsuite" ? "NetSuite MCP" : t;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeaderboardClient({
  rows,
  divisions,
  divisionTotals,
  toolTotals,
  toolByDivision,
  currentUserId,
}: Props) {
  const [divisionFilter, setDivisionFilter] = useState("");
  // "contributors" = default (excludes Admin/Division Head)
  // "all"          = everyone
  // any role key   = that specific role only
  const [roleFilter, setRoleFilter] = useState("contributors");

  // Distinct filter groups that exist in the data
  // A "group" is: the user's department (if set), or their system role (if no department)
  const availableGroups = useMemo(() => {
    // Collect unique filter keys, preserving order: departments first (alphabetical), then roles
    const departments = new Set<string>();
    const roles = new Set<string>();
    for (const r of rows) {
      if (r.department) departments.add(r.department);
      else roles.add(r.role);
    }
    const deptList = [...departments].sort();
    const roleList = ROLE_ORDER.filter((r) => roles.has(r));
    return { departments: deptList, roles: roleList };
  }, [rows]);

  // Rows sorted and filtered for the selected division + group
  const displayRows = useMemo(() => {
    let result: UserRow[];
    if (roleFilter === "all") {
      result = [...rows];
    } else if (roleFilter === "contributors") {
      // Show everyone who has a department set, PLUS roles that are not management-only
      result = rows.filter(
        (r) => r.department !== null || !MANAGEMENT_ROLES.has(r.role)
      );
    } else {
      // Filter by exact group key (department or role)
      result = rows.filter((r) => userFilterKey(r) === roleFilter);
    }

    if (divisionFilter) {
      result = result
        .filter((r) => (r.divisionHours[divisionFilter] ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.divisionHours[divisionFilter] ?? 0) -
            (a.divisionHours[divisionFilter] ?? 0)
        );
    }
    // when no divisionFilter, rows are already sorted by totalHours from server
    return result;
  }, [rows, divisionFilter, roleFilter]);

  // Helper: hours/claims to show for a row in the current view
  function displayHours(r: UserRow) {
    return divisionFilter ? (r.divisionHours[divisionFilter] ?? 0) : r.totalHours;
  }
  function displayClaims(r: UserRow) {
    return divisionFilter ? (r.divisionClaims[divisionFilter] ?? 0) : r.claimCount;
  }

  // Aggregate stats for the current view
  const displayTotalHours = useMemo(
    () => displayRows.reduce((s, r) => s + displayHours(r), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayRows, divisionFilter]
  );
  const displayTotalClaims = useMemo(
    () => displayRows.reduce((s, r) => s + displayClaims(r), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayRows, divisionFilter]
  );

  // Tool breakdown for current view
  const activeTools = useMemo(() => {
    const source = divisionFilter ? (toolByDivision[divisionFilter] ?? {}) : toolTotals;
    return Object.entries(source).sort(([, a], [, b]) => b - a).slice(0, 4);
  }, [divisionFilter, toolByDivision, toolTotals]);

  const top3 = displayRows.slice(0, 3);
  const maxHours = Math.max(...displayRows.map((r) => displayHours(r)), 1);

  const selectedDivisionName = divisionFilter
    ? (divisions.find((d) => d.id === divisionFilter)?.name ?? "Division")
    : null;

  // My position in the current view
  const myIdx = displayRows.findIndex((r) => r.id === currentUserId);
  const myRow = displayRows[myIdx];

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-head" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Leaderboard</h1>
          <p className="sub">
            {selectedDivisionName && <><b>{selectedDivisionName}</b> · </>}
            {roleFilter === "contributors" && <>All contributors · </>}
            {roleFilter === "all" && <>Everyone · </>}
            {roleFilter !== "contributors" && roleFilter !== "all" && (
              <><b>{ROLE_LABELS[roleFilter] ?? roleFilter}</b> · </>
            )}
            <b>{displayRows.filter((r) => displayHours(r) > 0).length}</b> members
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Group filter dropdown */}
          <select
            className="select"
            style={{ fontSize: 13, padding: "6px 12px", height: 36 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="contributors">All Contributors</option>

            {/* Departments (set by admin per user) */}
            {availableGroups.departments.length > 0 && (
              <>
                <option disabled>── By Department ──</option>
                {availableGroups.departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </>
            )}

            {/* System roles for users without a department set */}
            {availableGroups.roles.filter((r) => !MANAGEMENT_ROLES.has(r)).length > 0 && (
              <>
                <option disabled>── By System Role ──</option>
                {availableGroups.roles
                  .filter((r) => !MANAGEMENT_ROLES.has(r))
                  .map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] ?? r.replace(/_/g, " ")}
                    </option>
                  ))}
              </>
            )}

            {/* Management roles — separated */}
            {availableGroups.roles.some((r) => MANAGEMENT_ROLES.has(r)) && (
              <>
                <option disabled>── Management ──</option>
                {availableGroups.roles
                  .filter((r) => MANAGEMENT_ROLES.has(r))
                  .map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] ?? r.replace(/_/g, " ")}
                    </option>
                  ))}
              </>
            )}

            <option disabled>──────────────</option>
            <option value="all">Everyone (incl. management)</option>
          </select>

          {/* Division filter tabs */}
          {divisions.length > 0 && (
            <div className="seg" style={{ flexWrap: "wrap" }}>
              <button
                className={divisionFilter === "" ? "on" : ""}
                onClick={() => setDivisionFilter("")}
              >
                🌐 All
              </button>
              {divisions.map((d) => {
                const divTotal = divisionTotals.find((dt) => dt.id === d.id);
                return (
                  <button
                    key={d.id}
                    className={divisionFilter === d.id ? "on" : ""}
                    onClick={() => setDivisionFilter(d.id)}
                    title={divTotal ? `${fmtHours(divTotal.hours)} · ${divTotal.claimCount} claims` : d.name}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Left: podium + table ── */}
        <div>
          {/* Podium */}
          {top3.length > 0 && displayRows.some(r => displayHours(r) > 0) && (
            <div className={styles.podium}>
              {/* Silver (#2) */}
              {top3[1] && displayHours(top3[1]) > 0 && (
                <div className={`${styles.podCard} ${styles.silver}`}>
                  <div className={styles.podMedal} style={{ background: "var(--silver)" }}>2</div>
                  <div className={`avatar lg ${getAvatarClass(top3[1].email)}`} style={{ margin: "0 auto" }}>
                    {getInitials(top3[1].name)}
                  </div>
                  <div className={styles.podName}>{top3[1].name ?? top3[1].email?.split("@")[0]}</div>
                  <div className={styles.podRole}>{userTeamLabel(top3[1])}</div>
                  <div className={styles.podStats}>
                    <div>
                      <div className={styles.podStatLabel}>Hours</div>
                      <div className={styles.podStatVal}>{fmtHours(displayHours(top3[1]))}</div>
                    </div>
                    <div>
                      <div className={styles.podStatLabel}>Claims</div>
                      <div className={styles.podStatVal}>{displayClaims(top3[1])}</div>
                    </div>
                  </div>
                  {divisionFilter && top3[1].totalHours > displayHours(top3[1]) && (
                    <div className={styles.podOverall}>
                      {fmtHours(top3[1].totalHours)} overall
                    </div>
                  )}
                </div>
              )}

              {/* Gold (#1) */}
              {top3[0] && displayHours(top3[0]) > 0 && (
                <div className={`${styles.podCard} ${styles.gold}`}>
                  <div className={styles.crown}>👑 {selectedDivisionName ? `${selectedDivisionName} Champion` : "Champion"}</div>
                  <div className={styles.podMedal} style={{ background: "var(--gold)" }}>1</div>
                  <div
                    className={`avatar xl ${getAvatarClass(top3[0].email)}`}
                    style={{ margin: "0 auto", boxShadow: "0 0 0 4px var(--gold), 0 0 0 7px rgba(201,162,39,0.2)" }}
                  >
                    {getInitials(top3[0].name)}
                  </div>
                  <div className={styles.podName}>{top3[0].name ?? top3[0].email?.split("@")[0]}</div>
                  <div className={styles.podRole}>{userTeamLabel(top3[0])}</div>
                  <div className={styles.podStats}>
                    <div>
                      <div className={styles.podStatLabel}>Hours</div>
                      <div className={styles.podStatVal}>{fmtHours(displayHours(top3[0]))}</div>
                    </div>
                    <div>
                      <div className={styles.podStatLabel}>Claims</div>
                      <div className={styles.podStatVal}>{displayClaims(top3[0])}</div>
                    </div>
                  </div>
                  {divisionFilter && top3[0].totalHours > displayHours(top3[0]) && (
                    <div className={styles.podOverall}>
                      {fmtHours(top3[0].totalHours)} overall
                    </div>
                  )}
                </div>
              )}

              {/* Bronze (#3) */}
              {top3[2] && displayHours(top3[2]) > 0 && (
                <div className={`${styles.podCard} ${styles.bronze}`}>
                  <div className={styles.podMedal} style={{ background: "var(--bronze)" }}>3</div>
                  <div className={`avatar lg ${getAvatarClass(top3[2].email)}`} style={{ margin: "0 auto" }}>
                    {getInitials(top3[2].name)}
                  </div>
                  <div className={styles.podName}>{top3[2].name ?? top3[2].email?.split("@")[0]}</div>
                  <div className={styles.podRole}>{userTeamLabel(top3[2])}</div>
                  <div className={styles.podStats}>
                    <div>
                      <div className={styles.podStatLabel}>Hours</div>
                      <div className={styles.podStatVal}>{fmtHours(displayHours(top3[2]))}</div>
                    </div>
                    <div>
                      <div className={styles.podStatLabel}>Claims</div>
                      <div className={styles.podStatVal}>{displayClaims(top3[2])}</div>
                    </div>
                  </div>
                  {divisionFilter && top3[2].totalHours > displayHours(top3[2]) && (
                    <div className={styles.podOverall}>
                      {fmtHours(top3[2].totalHours)} overall
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full rankings table */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                {(() => {
                  const rolePart =
                    roleFilter === "contributors" || roleFilter === "all"
                      ? null
                      : (ROLE_LABELS[roleFilter] ?? roleFilter.replace(/_/g, " "));
                  const parts = [selectedDivisionName, rolePart].filter(Boolean);
                  return parts.length > 0 ? `${parts.join(" · ")} Rankings` : "Full Rankings";
                })()}
                <span className="count">{displayRows.length}</span>
              </div>
              {divisionFilter && (
                <span className="card-sub">
                  Hours shown are for this division only
                </span>
              )}
            </div>

            {displayRows.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div style={{ fontSize: 36 }}>🏆</div>
                <p style={{ marginTop: 12 }}>No claims yet in this division.</p>
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  Submit claims linked to projects in this division to appear here.
                </p>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Progress</th>
                    <th>Hours Saved</th>
                    <th>Claims</th>
                    <th>Tier</th>
                    {divisionFilter && <th>Overall</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => {
                    const hrs = displayHours(row);
                    const pct = (hrs / maxHours) * 100;
                    const isMe = row.id === currentUserId;
                    return (
                      <tr key={row.id} className={isMe ? "you" : ""}>
                        <td>
                          <span style={{
                            fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13,
                            color: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--muted)",
                          }}>
                            #{i + 1}
                          </span>
                        </td>
                        <td>
                          <div className="cell-user">
                            <div className={`avatar sm ${getAvatarClass(row.email)}`}>
                              {getInitials(row.name)}
                            </div>
                            <div>
                              <div className="nm">
                                {row.name ?? row.email?.split("@")[0]}
                                {isMe && <span style={{ color: "var(--red)", fontSize: 10, marginLeft: 6 }}>you</span>}
                              </div>
                              <div className="role">{userTeamLabel(row)}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ minWidth: 120 }}>
                          <div style={{ background: "var(--surface)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--red)",
                              borderRadius: 4,
                            }} />
                          </div>
                        </td>
                        <td>
                          <span className="hours-cell">
                            <span className="saved">+{hrs.toFixed(1)}h</span>
                          </span>
                        </td>
                        <td className="mono muted">{displayClaims(row)}</td>
                        <td>
                          <span className="chip neutral" style={{ fontSize: 10.5 }}>
                            <span className="bullet" />{row.tier}
                          </span>
                        </td>
                        {/* Overall hours column — only shown when a division is active */}
                        {divisionFilter && (
                          <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>
                            {row.totalHours.toFixed(1)}h
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className={styles.sidebar}>
          {/* Team totals */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                {selectedDivisionName ? `${selectedDivisionName}` : "Team"} Totals
              </div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Hours Saved</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                  {fmtHours(displayTotalHours)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Estimated Value</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: "var(--green)", marginTop: 4 }}>
                  ${Math.round(displayTotalHours * 45).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Approved Claims</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {displayTotalClaims}
                </div>
              </div>
            </div>
          </div>

          {/* Division standings */}
          {divisionTotals.some((d) => d.hours > 0) && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Division Standings</div>
              </div>
              <div style={{ padding: "12px 0" }}>
                {divisionTotals.map((d, i) => {
                  const pct = divisionTotals[0].hours > 0
                    ? (d.hours / divisionTotals[0].hours) * 100
                    : 0;
                  const isSelected = d.id === divisionFilter;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDivisionFilter(d.id === divisionFilter ? "" : d.id)}
                      className={styles.divStandingRow}
                      style={{
                        background: isSelected ? "var(--red-tint)" : "transparent",
                        borderLeft: isSelected ? "3px solid var(--red)" : "3px solid transparent",
                      }}
                    >
                      <div className={styles.divStandingRank} style={{
                        color: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--muted)",
                      }}>
                        #{i + 1}
                      </div>
                      <div className={styles.divStandingInfo}>
                        <div className={styles.divStandingName} style={{ color: isSelected ? "var(--red)" : "var(--ink)" }}>
                          {d.name}
                        </div>
                        <div className={styles.divStandingBar}>
                          <div
                            className={styles.divStandingFill}
                            style={{
                              width: `${pct}%`,
                              background: isSelected ? "var(--red)" : "var(--blue)",
                            }}
                          />
                        </div>
                      </div>
                      <div className={styles.divStandingHours}>
                        {d.hours > 0 ? fmtHours(d.hours) : "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tool breakdown */}
          {activeTools.length > 0 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Tool Breakdown</div>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {activeTools.map(([tool, hours]) => {
                  const pct = (hours / (activeTools[0]?.[1] || 1)) * 100;
                  return (
                    <div key={tool}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span className="tool-chip">
                          <span className={`sw ${tool}`} />{toolLabel(tool)}
                        </span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}>
                          {fmtHours(hours)}
                        </span>
                      </div>
                      <div style={{ background: "var(--surface)", borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--red)", borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Where you stand */}
          <div className="card" style={{ background: "var(--red-tint)", border: "1px solid var(--red-soft)" }}>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red-700)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Where You Stand
              </div>
              {!myRow || displayHours(myRow) === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  {divisionFilter
                    ? "You have no approved claims in this division yet."
                    : "Submit a claim to appear on the leaderboard!"}
                </p>
              ) : (
                <>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--red)" }}>
                    #{myIdx + 1}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
                    {myIdx > 0
                      ? <>Save <b>{(displayHours(displayRows[myIdx - 1]) - displayHours(myRow)).toFixed(1)}h</b> more to reach #{myIdx}</>
                      : "You're at the top! 🎉"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    {displayHours(myRow).toFixed(1)}h saved · {displayClaims(myRow)} claims
                    {divisionFilter && myRow.totalHours !== displayHours(myRow) && (
                      <> · <span style={{ color: "var(--muted-2)" }}>{myRow.totalHours.toFixed(1)}h overall</span></>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
