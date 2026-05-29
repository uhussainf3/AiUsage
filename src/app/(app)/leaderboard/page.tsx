import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaderboardClient } from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // All active users
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, department: true, tier: true },
    orderBy: { name: "asc" },
  });

  // All approved/reduced claims with project → division info
  const claims = await prisma.claim.findMany({
    where: { status: { in: ["APPROVED", "REDUCED"] } },
    select: {
      submitterId: true,
      hoursSaved: true,
      approvedHours: true,
      toolsUsed: true,
      project: {
        select: { divisionId: true },
      },
    },
  });

  // All divisions
  const rawDivisions = await prisma.division.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const divisions = rawDivisions.map((d) => ({ id: d.id, name: d.name }));

  // Build per-user stats (overall + per-division)
  interface UserRow {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    department: string | null;
    tier: string;
    totalHours: number;
    claimCount: number;
    divisionHours: Record<string, number>;
    divisionClaims: Record<string, number>;
  }

  const userMap = new Map<string, UserRow>();
  for (const u of users) {
    userMap.set(u.id, {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      tier: u.tier,
      totalHours: 0,
      claimCount: 0,
      divisionHours: {},
      divisionClaims: {},
    });
  }

  // Tool totals — overall and per division
  const toolTotals: Record<string, number> = {};
  const toolByDivision: Record<string, Record<string, number>> = {};

  for (const c of claims) {
    const eff = c.approvedHours ?? c.hoursSaved;
    const divId = c.project?.divisionId ?? null;

    const row = userMap.get(c.submitterId);
    if (row) {
      row.totalHours += eff;
      row.claimCount += 1;
      if (divId) {
        row.divisionHours[divId] = (row.divisionHours[divId] ?? 0) + eff;
        row.divisionClaims[divId] = (row.divisionClaims[divId] ?? 0) + 1;
      }
    }

    // Tool breakdown
    try {
      const tools: string[] = JSON.parse(c.toolsUsed);
      for (const t of tools) {
        toolTotals[t] = (toolTotals[t] ?? 0) + eff;
        if (divId) {
          if (!toolByDivision[divId]) toolByDivision[divId] = {};
          toolByDivision[divId][t] = (toolByDivision[divId][t] ?? 0) + eff;
        }
      }
    } catch { /* ignore */ }
  }

  const rows = Array.from(userMap.values()).sort(
    (a, b) => b.totalHours - a.totalHours
  );

  // Per-division aggregate totals (for standings card)
  const divisionTotals = divisions
    .map((d) => {
      let hours = 0;
      let claimCount = 0;
      for (const row of rows) {
        hours += row.divisionHours[d.id] ?? 0;
        claimCount += row.divisionClaims[d.id] ?? 0;
      }
      return { id: d.id, name: d.name, hours, claimCount };
    })
    .sort((a, b) => b.hours - a.hours);

  return (
    <LeaderboardClient
      rows={rows}
      divisions={divisions}
      divisionTotals={divisionTotals}
      toolTotals={toolTotals}
      toolByDivision={toolByDivision}
      currentUserId={session.user.id}
    />
  );
}
