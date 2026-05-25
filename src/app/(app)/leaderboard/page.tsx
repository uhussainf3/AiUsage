import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import styles from "./leaderboard.module.css";
import { fmtHours } from "@/lib/format";

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarClass(email?: string | null) {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session) return null;

  // Full leaderboard — all time
  const rows = await prisma.$queryRaw<
    { id: string; name: string | null; email: string | null; role: string; tier: string; totalHours: number; claimCount: number }[]
  >`
    SELECT u.id, u.name, u.email, u.role, u.tier,
           COALESCE(SUM(CASE WHEN c.status IN ('APPROVED','REDUCED') THEN c."hoursSaved" ELSE 0 END), 0) as "totalHours",
           COUNT(CASE WHEN c.status IN ('APPROVED','REDUCED') THEN 1 END) as "claimCount"
    FROM "User" u
    LEFT JOIN "Claim" c ON c."submitterId" = u.id
    WHERE u."isActive" = true
    GROUP BY u.id, u.name, u.email, u.role, u.tier
    ORDER BY "totalHours" DESC
  `;

  // Team totals
  const totalHours = rows.reduce((s, r) => s + Number(r.totalHours), 0);
  const totalClaims = rows.reduce((s, r) => s + Number(r.claimCount), 0);

  // Tool breakdown
  const allClaims = await prisma.claim.findMany({
    where: { status: { in: ["APPROVED", "REDUCED"] } },
    select: { toolsUsed: true, hoursSaved: true },
  });

  const toolTotals: Record<string, number> = {};
  for (const c of allClaims) {
    try {
      const tools: string[] = JSON.parse(c.toolsUsed);
      for (const t of tools) {
        toolTotals[t] = (toolTotals[t] ?? 0) + c.hoursSaved;
      }
    } catch { /* ignore */ }
  }

  const topTools = Object.entries(toolTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const maxHours = Math.max(...rows.map((r) => Number(r.totalHours)), 1);
  const myId = session.user.id;

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Leaderboard</h1>
          <p className="sub">All-time hours saved · <b>{rows.filter(r => Number(r.totalHours) > 0).length}</b> contributors</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Left: podium + table ── */}
        <div>
          {/* Podium */}
          {top3.length > 0 && (
            <div className={styles.podium}>
              {/* Silver (#2) */}
              {top3[1] && (
                <div className={`${styles.podCard} ${styles.silver}`}>
                  <div className={`${styles.podMedal}`} style={{ background: "var(--silver)" }}>2</div>
                  <div className={`avatar lg ${getAvatarClass(top3[1].email)}`} style={{ margin: "0 auto" }}>
                    {getInitials(top3[1].name)}
                  </div>
                  <div className={styles.podName}>{top3[1].name ?? top3[1].email?.split("@")[0]}</div>
                  <div className={styles.podRole}>{top3[1].role.replace(/_/g, " ")}</div>
                  <div className={styles.podStats}>
                    <div>
                      <div className={styles.podStatLabel}>Hours</div>
                      <div className={styles.podStatVal}>{fmtHours(Number(top3[1].totalHours))}</div>
                    </div>
                    <div>
                      <div className={styles.podStatLabel}>Claims</div>
                      <div className={styles.podStatVal}>{Number(top3[1].claimCount)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gold (#1) */}
              {top3[0] && (
                <div className={`${styles.podCard} ${styles.gold}`}>
                  <div className={styles.crown}>👑 Champion</div>
                  <div className={`${styles.podMedal}`} style={{ background: "var(--gold)" }}>1</div>
                  <div className={`avatar xl ${getAvatarClass(top3[0].email)}`}
                    style={{ margin: "0 auto", boxShadow: "0 0 0 4px var(--gold), 0 0 0 7px rgba(201,162,39,0.2)" }}>
                    {getInitials(top3[0].name)}
                  </div>
                  <div className={styles.podName}>{top3[0].name ?? top3[0].email?.split("@")[0]}</div>
                  <div className={styles.podRole}>{top3[0].role.replace(/_/g, " ")}</div>
                  <div className={styles.podStats}>
                    <div>
                      <div className={styles.podStatLabel}>Hours</div>
                      <div className={styles.podStatVal}>{fmtHours(Number(top3[0].totalHours))}</div>
                    </div>
                    <div>
                      <div className={styles.podStatLabel}>Claims</div>
                      <div className={styles.podStatVal}>{Number(top3[0].claimCount)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bronze (#3) */}
              {top3[2] && (
                <div className={`${styles.podCard} ${styles.bronze}`}>
                  <div className={`${styles.podMedal}`} style={{ background: "var(--bronze)" }}>3</div>
                  <div className={`avatar lg ${getAvatarClass(top3[2].email)}`} style={{ margin: "0 auto" }}>
                    {getInitials(top3[2].name)}
                  </div>
                  <div className={styles.podName}>{top3[2].name ?? top3[2].email?.split("@")[0]}</div>
                  <div className={styles.podRole}>{top3[2].role.replace(/_/g, " ")}</div>
                  <div className={styles.podStats}>
                    <div>
                      <div className={styles.podStatLabel}>Hours</div>
                      <div className={styles.podStatVal}>{fmtHours(Number(top3[2].totalHours))}</div>
                    </div>
                    <div>
                      <div className={styles.podStatLabel}>Claims</div>
                      <div className={styles.podStatVal}>{Number(top3[2].claimCount)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full rankings table */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                Full Rankings
                <span className="count">{rows.length}</span>
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member</th>
                  <th>Progress</th>
                  <th>Hours Saved</th>
                  <th>Claims</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const pct = (Number(row.totalHours) / maxHours) * 100;
                  const isMe = row.id === myId;
                  return (
                    <tr key={row.id} className={isMe ? "you" : ""}>
                      <td>
                        <span style={{
                          fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13,
                          color: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--muted)"
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
                            <div className="role">{row.role.replace(/_/g, " ")}</div>
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
                          <span className="saved">+{Number(row.totalHours).toFixed(1)}h</span>
                        </span>
                      </td>
                      <td className="mono muted">{Number(row.claimCount)}</td>
                      <td>
                        <span className="chip neutral" style={{ fontSize: 10.5 }}>
                          <span className="bullet" />{row.tier}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className={styles.sidebar}>
          {/* Team totals */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Team Totals</div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Total Hours Saved</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>{fmtHours(totalHours)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Estimated Value</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: "var(--green)", marginTop: 4 }}>${(totalHours * 45).toFixed(0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Approved Claims</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, marginTop: 4 }}>{totalClaims}</div>
              </div>
            </div>
          </div>

          {/* Tool share */}
          {topTools.length > 0 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Tool Breakdown</div>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {topTools.map(([tool, hours]) => {
                  const pct = (hours / (topTools[0]?.[1] || 1)) * 100;
                  const label = tool === "claude" ? "Claude Code" : tool === "play" ? "Playwright MCP" : tool === "netsuite" ? "NetSuite MCP" : tool;
                  return (
                    <div key={tool}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span className="tool-chip">
                          <span className={`sw ${tool}`} />{label}
                        </span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}>{fmtHours(hours)}</span>
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
              {(() => {
                const myIdx = rows.findIndex((r) => r.id === myId);
                const myRow = rows[myIdx];
                if (!myRow) return <p style={{ fontSize: 13, color: "var(--muted)" }}>Submit a claim to appear on the leaderboard!</p>;
                const nextRow = rows[myIdx - 1];
                const gap = nextRow ? Number(nextRow.totalHours) - Number(myRow.totalHours) : 0;
                return (
                  <>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--red)" }}>
                      #{myIdx + 1}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
                      {nextRow
                        ? <>Save <b>{gap.toFixed(1)}h</b> more to reach #{myIdx}</>
                        : "You're at the top! 🎉"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      {Number(myRow.totalHours).toFixed(1)}h saved · {Number(myRow.claimCount)} claims
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
