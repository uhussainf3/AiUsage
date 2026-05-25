import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EfficiencyClient } from "./EfficiencyClient";

const CLAIM_TYPE_LABELS: Record<string, string> = {
  TEST_AUTOMATION: "Test Automation",
  BUG_DETECTION: "Bug Detection",
  REGRESSION: "Regression Testing",
  CI_CD: "CI/CD Pipeline",
  CODE_REVIEW: "Code Review",
  OTHER: "Other",
};

export default async function EfficiencyPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const isLead = ["QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"].includes(
    session.user.role ?? ""
  );
  if (!isLead) redirect("/dashboard");

  // Fetch all approved/reduced claims with full data
  const claims = await prisma.claim.findMany({
    where: { status: { in: ["APPROVED", "REDUCED"] } },
    select: {
      claimType: true,
      estimatedWithout: true,
      estimatedWith: true,
      hoursSaved: true,
      approvedHours: true,
      toolsUsed: true,
      projectId: true,
      project: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (claims.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Efficiency Report</h1>
            <p className="sub">No approved claims yet — data will appear once claims are approved.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Overall efficiency ──────────────────────────────────────────────────
  const totalWithout = claims.reduce((s, c) => s + c.estimatedWithout, 0);
  const totalWith = claims.reduce((s, c) => s + c.estimatedWith, 0);
  const totalSaved = claims.reduce((s, c) => s + (c.approvedHours ?? c.hoursSaved), 0);
  const overallEfficiency = totalWithout > 0
    ? ((totalWithout - totalWith) / totalWithout) * 100
    : 0;
  // Average multiplier: how many times faster per claim
  const multipliers = claims
    .filter((c) => c.estimatedWith > 0)
    .map((c) => c.estimatedWithout / c.estimatedWith);
  const avgMultiplier = multipliers.length > 0
    ? multipliers.reduce((s, m) => s + m, 0) / multipliers.length
    : 1;

  // ── By claim type ───────────────────────────────────────────────────────
  const byTypeMap: Record<string, { without: number; with: number; count: number; saved: number }> = {};
  for (const c of claims) {
    if (!byTypeMap[c.claimType]) byTypeMap[c.claimType] = { without: 0, with: 0, count: 0, saved: 0 };
    byTypeMap[c.claimType].without += c.estimatedWithout;
    byTypeMap[c.claimType].with += c.estimatedWith;
    byTypeMap[c.claimType].count += 1;
    byTypeMap[c.claimType].saved += c.approvedHours ?? c.hoursSaved;
  }
  const byType = Object.entries(byTypeMap)
    .map(([type, d]) => ({
      type,
      label: CLAIM_TYPE_LABELS[type] ?? type,
      efficiency: d.without > 0 ? ((d.without - d.with) / d.without) * 100 : 0,
      avgWithout: d.without / d.count,
      avgWith: d.with / d.count,
      totalSaved: d.saved,
      count: d.count,
    }))
    .sort((a, b) => b.efficiency - a.efficiency);

  // ── By project (top 6) ──────────────────────────────────────────────────
  const byProjectMap: Record<string, { name: string; without: number; with: number; count: number; saved: number }> = {};
  for (const c of claims) {
    if (!c.projectId || !c.project) continue;
    if (!byProjectMap[c.projectId])
      byProjectMap[c.projectId] = { name: c.project.name, without: 0, with: 0, count: 0, saved: 0 };
    byProjectMap[c.projectId].without += c.estimatedWithout;
    byProjectMap[c.projectId].with += c.estimatedWith;
    byProjectMap[c.projectId].count += 1;
    byProjectMap[c.projectId].saved += c.approvedHours ?? c.hoursSaved;
  }
  const byProject = Object.values(byProjectMap)
    .map((d) => ({
      name: d.name,
      efficiency: d.without > 0 ? ((d.without - d.with) / d.without) * 100 : 0,
      totalSaved: d.saved,
      count: d.count,
      avgWithout: d.without / d.count,
      avgWith: d.with / d.count,
    }))
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 6);

  // ── By AI tool ──────────────────────────────────────────────────────────
  const byToolMap: Record<string, { without: number; with: number; count: number }> = {};
  for (const c of claims) {
    let tools: string[] = [];
    try { tools = JSON.parse(c.toolsUsed); } catch { tools = []; }
    for (const tool of tools) {
      if (!byToolMap[tool]) byToolMap[tool] = { without: 0, with: 0, count: 0 };
      // Split proportionally across tools used in that claim
      byToolMap[tool].without += c.estimatedWithout / tools.length;
      byToolMap[tool].with += c.estimatedWith / tools.length;
      byToolMap[tool].count += 1;
    }
  }
  const byTool = Object.entries(byToolMap)
    .map(([tool, d]) => ({
      tool,
      efficiency: d.without > 0 ? ((d.without - d.with) / d.without) * 100 : 0,
      count: d.count,
      totalWithout: d.without,
      totalWith: d.with,
    }))
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 8);

  // ── Monthly trend (last 6 months) ───────────────────────────────────────
  const now = new Date();
  const months: { label: string; efficiency: number; count: number; saved: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthClaims = claims.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= start && d <= end;
    });
    const mWithout = monthClaims.reduce((s, c) => s + c.estimatedWithout, 0);
    const mWith = monthClaims.reduce((s, c) => s + c.estimatedWith, 0);
    const mSaved = monthClaims.reduce((s, c) => s + (c.approvedHours ?? c.hoursSaved), 0);
    months.push({
      label: start.toLocaleString("default", { month: "short", year: "2-digit" }),
      efficiency: mWithout > 0 ? ((mWithout - mWith) / mWithout) * 100 : 0,
      count: monthClaims.length,
      saved: Math.round(mSaved * 10) / 10,
    });
  }

  return (
    <EfficiencyClient
      overallEfficiency={Math.round(overallEfficiency * 10) / 10}
      avgMultiplier={Math.round(avgMultiplier * 10) / 10}
      totalWithout={Math.round(totalWithout * 10) / 10}
      totalWith={Math.round(totalWith * 10) / 10}
      totalSaved={Math.round(totalSaved * 10) / 10}
      totalClaims={claims.length}
      byType={byType}
      byProject={byProject}
      byTool={byTool}
      monthlyTrend={months}
    />
  );
}
