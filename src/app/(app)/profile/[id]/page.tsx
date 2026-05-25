import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "./profile.module.css";
import Link from "next/link";
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

function statusChip(status: string) {
  const map: Record<string, string> = {
    APPROVED: "approved", PENDING: "pending", CORROBORATED: "corroborated",
    REDUCED: "reduced", REJECTED: "rejected",
  };
  return map[status] ?? "neutral";
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const targetId = id === "me" ? session.user.id : id;

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    include: {
      badges: { include: { badge: true } },
    },
  });

  if (!user) notFound();

  const claims = await prisma.claim.findMany({
    where: { submitterId: targetId },
    orderBy: { createdAt: "desc" },
  });

  const approved = claims.filter((c) => c.status === "APPROVED" || c.status === "REDUCED");
  const totalHoursSaved = approved.reduce((s, c) => s + (c.approvedHours ?? c.hoursSaved), 0);
  const approvalRate = claims.length > 0 ? Math.round((approved.length / claims.length) * 100) : 0;

  // Rank
  const allRankings = await prisma.$queryRaw<{ submitterId: string }[]>`
    SELECT "submitterId" FROM "Claim"
    WHERE status IN ('APPROVED','REDUCED')
    GROUP BY "submitterId"
    ORDER BY SUM("hoursSaved") DESC
  `;
  const rank = allRankings.findIndex((r) => r.submitterId === targetId) + 1;

  // Tool totals
  const toolTotals: Record<string, number> = {};
  for (const c of approved) {
    try {
      const tools: string[] = JSON.parse(c.toolsUsed);
      for (const t of tools) toolTotals[t] = (toolTotals[t] ?? 0) + (c.approvedHours ?? c.hoursSaved);
    } catch { /* ignore */ }
  }
  const topTool = Object.entries(toolTotals).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";
  const toolLabel = (t: string) => t === "claude" ? "Claude Code" : t === "play" ? "Playwright MCP" : t === "netsuite" ? "NetSuite MCP" : t;

  return (
    <div className="page">
      {/* ── Cover card ── */}
      <div className={styles.coverCard}>
        <div className={styles.coverGradient} />
        <div className={styles.coverContent}>
          <div className={`avatar xl ${getAvatarClass(user.email)}`}
            style={{ borderWidth: 3, boxShadow: "0 0 0 4px rgba(255,255,255,0.2)" }}>
            {getInitials(user.name)}
          </div>
          <div>
            <h1 className={styles.coverName}>{user.name ?? user.email?.split("@")[0]}</h1>
            <p className={styles.coverRole}>{user.role.replace(/_/g, " ")} · {user.email}</p>
          </div>
          <div className={styles.coverBadge}>
            {user.tier === "PRO" ? "⭐ Pro" : user.tier === "TRUSTED" ? "✅ Trusted" : "🌱 New"}
          </div>
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className={styles.statStrip}>
        {[
          { label: "Hours Saved", value: `${totalHoursSaved.toFixed(1)}h` },
          { label: "Claims", value: `${claims.length}` },
          { label: "Approval Rate", value: `${approvalRate}%` },
          { label: "Rank", value: rank > 0 ? `#${rank}` : "—" },
          { label: "Top Tool", value: topTool !== "—" ? toolLabel(topTool) : "—" },
        ].map((s) => (
          <div key={s.label} className={styles.statBox}>
            <div className={styles.statBoxVal}>{s.value}</div>
            <div className={styles.statBoxLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>
        {/* ── Left: claims history ── */}
        <div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Claim History <span className="count">{claims.length}</span></div>
            </div>
            {claims.length === 0 ? (
              <div className="empty-state">
                <p>No claims submitted yet.</p>
                {targetId === session.user.id && (
                  <Link href="/submit" className="btn primary" style={{ marginTop: 12, display: "inline-flex" }}>
                    Submit First Claim
                  </Link>
                )}
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Description</th>
                    <th>Hours Saved</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => {
                    const cls = statusChip(c.status);
                    return (
                      <tr key={c.id}>
                        <td>
                          <a href={c.jiraTicketUrl} target="_blank" rel="noopener noreferrer" className="ticket">
                            {c.jiraTicketId}
                          </a>
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <p style={{ fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.description}
                          </p>
                        </td>
                        <td>
                          <span className="hours-cell">
                            <span className="saved">+{(c.approvedHours ?? c.hoursSaved).toFixed(1)}h</span>
                          </span>
                        </td>
                        <td>
                          <span className={`chip ${cls}`}>
                            <span className="bullet" />
                            {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="muted nowrap">
                          {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Right: badges + tool breakdown ── */}
        <div className={styles.sidebar}>
          {/* Badges */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Badges <span className="count">{user.badges.length}</span></div>
            </div>
            <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {user.badges.map((ub) => (
                <div key={ub.id} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 6, padding: "12px 8px", background: "var(--surface)",
                  borderRadius: 8, border: "1px solid var(--border)", textAlign: "center",
                }}>
                  <span style={{ fontSize: 28 }}>{ub.badge.icon}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{ub.badge.name}</span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{ub.badge.description}</span>
                </div>
              ))}
              {user.badges.length === 0 && (
                <div style={{ gridColumn: "span 2", textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
                  No badges yet.
                </div>
              )}
            </div>
          </div>

          {/* Tool breakdown */}
          {Object.keys(toolTotals).length > 0 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Tool Breakdown</div>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(toolTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tool, hours]) => {
                    const maxH = Math.max(...Object.values(toolTotals));
                    const pct = (hours / maxH) * 100;
                    return (
                      <div key={tool}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span className="tool-chip"><span className={`sw ${tool}`} />{toolLabel(tool)}</span>
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
        </div>
      </div>
    </div>
  );
}
