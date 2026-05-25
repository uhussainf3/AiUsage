import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "./reports.module.css";
import Link from "next/link";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) return null;

  const isLead = ["QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"].includes(session.user.role);
  if (!isLead) redirect("/dashboard");

  // KPI aggregates
  const allApproved = await prisma.claim.findMany({
    where: { status: { in: ["APPROVED", "REDUCED"] } },
    select: { hoursSaved: true, approvedHours: true, toolsUsed: true, claimType: true, createdAt: true },
  });

  const totalHours = allApproved.reduce((s, c) => s + (c.approvedHours ?? c.hoursSaved), 0);
  const totalValue = totalHours * 45;
  const fteDays = totalHours / 8;

  const activeUsers = await prisma.user.count({ where: { isActive: true } });
  const totalClaims = await prisma.claim.count({ where: { status: { in: ["APPROVED", "REDUCED"] } } });

  // Weekly data (last 8 weeks)
  const weeks: { label: string; hours: number; claims: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const wClaims = allApproved.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= start && d < end;
    });
    weeks.push({
      label: `W${8 - i}`,
      hours: wClaims.reduce((s, c) => s + (c.approvedHours ?? c.hoursSaved), 0),
      claims: wClaims.length,
    });
  }

  // Tool breakdown
  const toolTotals: Record<string, number> = {};
  for (const c of allApproved) {
    try {
      const tools: string[] = JSON.parse(c.toolsUsed);
      for (const t of tools) toolTotals[t] = (toolTotals[t] ?? 0) + (c.approvedHours ?? c.hoursSaved);
    } catch { /* ignore */ }
  }

  // Claim type breakdown
  const typeTotals: Record<string, number> = {};
  for (const c of allApproved) {
    typeTotals[c.claimType] = (typeTotals[c.claimType] ?? 0) + (c.approvedHours ?? c.hoursSaved);
  }

  // Top contributors
  const topContribs = await prisma.$queryRaw<
    { name: string | null; email: string | null; totalHours: number; claimCount: number }[]
  >`
    SELECT u.name, u.email,
           SUM(CASE WHEN c.status IN ('APPROVED','REDUCED') THEN c."hoursSaved" ELSE 0 END) as "totalHours",
           COUNT(CASE WHEN c.status IN ('APPROVED','REDUCED') THEN 1 END) as "claimCount"
    FROM "User" u
    LEFT JOIN "Claim" c ON c."submitterId" = u.id
    WHERE u."isActive" = true
    GROUP BY u.id, u.name, u.email
    ORDER BY "totalHours" DESC
    LIMIT 10
  `;

  const maxWeekHours = Math.max(...weeks.map((w) => w.hours), 1);
  const toolEntries = Object.entries(toolTotals).sort(([, a], [, b]) => b - a);
  const typeEntries = Object.entries(typeTotals).sort(([, a], [, b]) => b - a);

  const typeLabel: Record<string, string> = {
    TEST_AUTOMATION: "Test Automation",
    BUG_DETECTION: "Bug Detection",
    REGRESSION: "Regression",
    CI_CD: "CI/CD",
    CODE_REVIEW: "Code Review",
    OTHER: "Other",
  };

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Executive Dashboard</h1>
          <p className="sub">AI productivity impact · All time</p>
        </div>
        <div className="head-actions">
          <button className="btn">📧 Email Report</button>
          <button className="btn primary">⬇ Export PDF</button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className={styles.kpiGrid}>
        <div className="stat-card dark">
          <div className="stat-label">Total Hours Saved</div>
          <div className="stat-value">{totalHours.toFixed(0)}h</div>
          <div className="stat-sub">All approved claims</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Dollar Value</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>${totalValue.toFixed(0)}</div>
          <div className="stat-sub">At $45/hr estimate</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FTE Days Freed</div>
          <div className="stat-value">{fteDays.toFixed(1)}</div>
          <div className="stat-sub">8h per FTE day</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value">{activeUsers}</div>
          <div className="stat-sub">Team members</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Claims Approved</div>
          <div className="stat-value">{totalClaims}</div>
          <div className="stat-sub">All time</div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* ── Weekly trend chart (pure CSS bars) ── */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div className="card-head">
            <div className="card-title">Weekly Trend — Hours Saved</div>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <div className={styles.barChart}>
              {weeks.map((w) => (
                <div key={w.label} className={styles.barCol}>
                  <div className={styles.barLabel} style={{ fontSize: 11, color: "var(--muted)" }}>
                    {w.hours > 0 ? `${w.hours.toFixed(0)}h` : ""}
                  </div>
                  <div className={styles.barOuter}>
                    <div
                      className={styles.barInner}
                      style={{ height: `${(w.hours / maxWeekHours) * 100}%` }}
                    />
                  </div>
                  <div className={styles.barTick}>{w.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tool breakdown */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Tool Adoption</div>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {toolEntries.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No data yet.</p>
            ) : toolEntries.map(([tool, hours]) => {
              const pct = (hours / (toolEntries[0]?.[1] || 1)) * 100;
              const label = tool === "claude" ? "Claude Code" : tool === "play" ? "Playwright MCP" : tool === "netsuite" ? "NetSuite MCP" : tool;
              return (
                <div key={tool}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="tool-chip"><span className={`sw ${tool}`} />{label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}>{hours.toFixed(0)}h</span>
                  </div>
                  <div style={{ background: "var(--surface)", borderRadius: 4, height: 8 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--red)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim type breakdown */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">By Claim Type</div>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {typeEntries.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No data yet.</p>
            ) : typeEntries.map(([type, hours]) => {
              const pct = (hours / (typeEntries[0]?.[1] || 1)) * 100;
              return (
                <div key={type}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{typeLabel[type] ?? type}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600 }}>{hours.toFixed(0)}h</span>
                  </div>
                  <div style={{ background: "var(--surface)", borderRadius: 4, height: 8 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top contributors table */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div className="card-head">
            <div className="card-title">Top Contributors</div>
            <Link href="/leaderboard" className="btn sm ghost">Full leaderboard →</Link>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Hours Saved</th>
                <th>Claims</th>
                <th>Est. Value</th>
              </tr>
            </thead>
            <tbody>
              {topContribs.map((u, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--muted)" }}>#{i + 1}</td>
                  <td>
                    <div className="cell-user">
                      <div className="avatar sm">{(u.name ?? u.email ?? "?")[0].toUpperCase()}</div>
                      <div>
                        <div className="nm">{u.name ?? u.email?.split("@")[0]}</div>
                        <div className="role">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="hours-cell saved">+{Number(u.totalHours).toFixed(1)}h</span></td>
                  <td className="mono muted">{Number(u.claimCount)}</td>
                  <td style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "var(--green)" }}>
                    ${(Number(u.totalHours) * 45).toFixed(0)}
                  </td>
                </tr>
              ))}
              {topContribs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                    No approved claims yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled report strip */}
      <div style={{
        marginTop: 24, background: "var(--ink)", borderRadius: 8,
        padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between"
      } as React.CSSProperties}>
        <div>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>📊 Scheduled CEO Report</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>
            Auto-sends every Monday 8:00 AM · PDF + summary email
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
            Configure
          </button>
          <button className="btn primary">Send Now</button>
        </div>
      </div>
    </div>
  );
}
