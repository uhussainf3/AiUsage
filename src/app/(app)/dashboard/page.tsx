import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtHours } from "@/lib/format";
import Link from "next/link";
import styles from "./dashboard.module.css";
import { ClaimsTable } from "./ClaimsTable";
import type { ClaimRow, ProjectOption } from "./ClaimsTable";
import { CorroborationQueue } from "./CorroborationQueue";
import type { CorroborationClaim } from "./CorroborationQueue";

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarClass(email?: string | null) {
  if (!email) return "";
  const n = email.charCodeAt(0) % 9;
  return n > 0 ? `a-${n + 1}` : "";
}


export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id as string;

  const [rawClaims, rawProjects, rawCorroborations] = await Promise.all([
    prisma.claim.findMany({
      where: { submitterId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { project: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, name: true, jiraProjectKey: true },
      orderBy: { name: "asc" },
    }),
    prisma.claim.findMany({
      where: { corroboratorId: userId, status: "PENDING" },
      include: {
        submitter: { select: { name: true, email: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const projects: ProjectOption[] = rawProjects;

  // Serialize for client component (Date → ISO string)
  const claims: ClaimRow[] = rawClaims.map((c) => ({
    id: c.id,
    jiraTicketId: c.jiraTicketId,
    jiraTicketUrl: c.jiraTicketUrl,
    estimatedWithout: c.estimatedWithout,
    estimatedWith: c.estimatedWith,
    hoursSaved: c.hoursSaved,
    approvedHours: c.approvedHours,
    toolsUsed: c.toolsUsed,
    claimType: c.claimType,
    description: c.description,
    status: c.status,
    rejectReason: c.rejectReason,
    approverNote: c.approverNote,
    createdAt: c.createdAt.toISOString(),
    submitterId: c.submitterId,
    projectId: c.projectId,
    projectName: c.project?.name ?? null,
  }));

  const myCorroborations: CorroborationClaim[] = rawCorroborations.map((c) => ({
    id: c.id,
    jiraTicketId: c.jiraTicketId,
    jiraSummary: c.jiraSummary,
    hoursSaved: c.hoursSaved,
    description: c.description,
    submitter: { name: c.submitter.name, email: c.submitter.email },
    project: c.project ? { name: c.project.name } : null,
    createdAt: c.createdAt.toISOString(),
  }));

  // Aggregate stats
  const approved = claims.filter((c) => c.status === "APPROVED" || c.status === "REDUCED");
  const totalHoursSaved = approved.reduce((s, c) => s + (c.approvedHours ?? c.hoursSaved), 0);
  const approvedCount = approved.length;

  // Leaderboard rank
  const allUsers = await prisma.claim.groupBy({
    by: ["submitterId"],
    where: { status: { in: ["APPROVED", "REDUCED"] } },
    _sum: { hoursSaved: true },
    orderBy: { _sum: { hoursSaved: "desc" } },
  });
  const rank = allUsers.findIndex((u) => u.submitterId === userId) + 1;

  // Top 5 leaderboard
  const leaderboard = await prisma.$queryRaw<
    { submitterId: string; name: string | null; email: string | null; totalHours: number }[]
  >`
    SELECT c."submitterId", u.name, u.email,
           SUM(c."hoursSaved") as "totalHours"
    FROM "Claim" c
    JOIN "User" u ON u.id = c."submitterId"
    WHERE c.status IN ('APPROVED', 'REDUCED')
    GROUP BY c."submitterId", u.name, u.email
    ORDER BY "totalHours" DESC
    LIMIT 5
  `;

  // Team total this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekClaims = await prisma.claim.aggregate({
    where: { status: { in: ["APPROVED", "REDUCED"] }, createdAt: { gte: weekAgo } },
    _sum: { hoursSaved: true },
  });

  const badges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    take: 4,
  });

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="page">
      {/* ── Page header ── */}
      <div className="page-head">
        <div>
          <h1>Welcome back, {firstName} 👋</h1>
          <p className="sub">
            You&apos;re ranked <b>#{rank > 0 ? rank : "—"}</b> on the leaderboard this month.
            Keep shipping!
          </p>
        </div>
        <div className="head-actions">
          <Link href="/submit" className="btn primary">
            + Submit Claim
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statGrid}>
        <div className="stat-card">
          <div className="stat-label">Hours Saved</div>
          <div className="stat-value">{totalHoursSaved.toFixed(1)}h</div>
          <div className="stat-sub">All-time approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Claims Approved</div>
          <div className="stat-value">{approvedCount}</div>
          <div className="stat-sub">
            {claims.length} total submitted
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Leaderboard Rank</div>
          <div className="stat-value">#{rank > 0 ? rank : "—"}</div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Trust Tier</div>
          <div className="stat-value" style={{ fontSize: 20, paddingTop: 4 }}>
            {session.user.tier === "PRO" ? "⭐ Pro" : session.user.tier === "TRUSTED" ? "✅ Trusted" : "🌱 New"}
          </div>
          <div className="stat-sub">{session.user.tier} member</div>
        </div>
      </div>

      {/* ── Corroboration queue ── */}
      <CorroborationQueue claims={myCorroborations} />

      {/* ── Main content ── */}
      <div className={styles.mainGrid}>
        {/* Left: claims table */}
        <div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                My Claims
                <span className="count">{claims.length}</span>
              </div>
              <Link href="/submit" className="btn sm primary">+ New</Link>
            </div>

            <ClaimsTable initialClaims={claims} currentUserId={userId} projects={projects} />
          </div>
        </div>

        {/* Right sidebar */}
        <div className={styles.sidebar}>
          {/* Leaderboard snapshot */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">🏆 Leaderboard</div>
              <Link href="/leaderboard" className="btn sm ghost">View all</Link>
            </div>
            <div style={{ padding: "8px 0" }}>
              {leaderboard.map((u, i) => (
                <div key={u.submitterId} className={styles.lbRow} style={u.submitterId === userId ? { background: "var(--red-tint)" } : {}}>
                  <span className={styles.lbRank} style={{
                    color: i === 0 ? "var(--gold)" : i === 1 ? "var(--silver)" : i === 2 ? "var(--bronze)" : "var(--muted)"
                  }}>
                    #{i + 1}
                  </span>
                  <div className={`avatar sm ${getAvatarClass(u.email)}`}>
                    {getInitials(u.name)}
                  </div>
                  <span className={styles.lbName}>
                    {u.name ?? u.email?.split("@")[0]}
                    {u.submitterId === userId && <span style={{ color: "var(--red)", fontSize: 10, marginLeft: 4 }}>you</span>}
                  </span>
                  <span className={styles.lbHours}>{fmtHours(Number(u.totalHours))}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="empty-state" style={{ padding: "24px" }}>
                  <p>No approved claims yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Team this week */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Team Impact This Week</div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", gap: 20 }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>
                  {fmtHours(weekClaims._sum.hoursSaved ?? 0)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>saved this week</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700, color: "var(--green)" }}>
                  ${((weekClaims._sum.hoursSaved ?? 0) * 45).toFixed(0)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>est. value</div>
              </div>
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Badges</div>
                <Link href="/profile/me" className="btn sm ghost">All</Link>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {badges.map((ub) => (
                  <div key={ub.id} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 6, padding: "12px 8px", background: "var(--surface)",
                    borderRadius: 8, border: "1px solid var(--border)", textAlign: "center",
                  }}>
                    <span style={{ fontSize: 24 }}>{ub.badge.icon}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>{ub.badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
