import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const isLead = ["QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"].includes(
    session.user.role ?? ""
  );
  if (!isLead) redirect("/dashboard");

  // Fetch last 90 days of approved/reduced claims (covers all period filters)
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const rawClaims = await prisma.claim.findMany({
    where: {
      status: { in: ["APPROVED", "REDUCED"] },
      createdAt: { gte: since90 },
    },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize claims (Date → ISO string)
  const claims = rawClaims.map((c) => ({
    id: c.id,
    jiraTicketId: c.jiraTicketId,
    jiraTicketUrl: c.jiraTicketUrl,
    claimType: c.claimType,
    toolsUsed: c.toolsUsed,
    hoursSaved: c.hoursSaved,
    approvedHours: c.approvedHours,
    estimatedWithout: c.estimatedWithout,
    estimatedWith: c.estimatedWith,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    submitterId: c.submitter.id,
    submitterName: c.submitter.name,
    submitterEmail: c.submitter.email,
    projectId: c.project?.id ?? null,
    projectName: c.project?.name ?? null,
  }));

  // --- Per-user summary (last 90 days) ---
  type UserSummary = {
    userId: string;
    name: string | null;
    email: string | null;
    totalHours: number;
    claimCount: number;
  };
  const userMap = new Map<string, UserSummary>();
  for (const c of claims) {
    const eff = c.approvedHours ?? c.hoursSaved;
    if (!userMap.has(c.submitterId)) {
      userMap.set(c.submitterId, {
        userId: c.submitterId,
        name: c.submitterName,
        email: c.submitterEmail,
        totalHours: 0,
        claimCount: 0,
      });
    }
    const entry = userMap.get(c.submitterId)!;
    entry.totalHours += eff;
    entry.claimCount += 1;
  }
  const userSummaries: UserSummary[] = Array.from(userMap.values()).sort(
    (a, b) => b.totalHours - a.totalHours
  );

  // --- Per-project summary ---
  type ProjectSummary = {
    projectId: string;
    projectName: string;
    totalHours: number;
    claimCount: number;
  };
  const projectMap = new Map<string, ProjectSummary>();
  for (const c of claims) {
    if (!c.projectId || !c.projectName) continue;
    const eff = c.approvedHours ?? c.hoursSaved;
    if (!projectMap.has(c.projectId)) {
      projectMap.set(c.projectId, {
        projectId: c.projectId,
        projectName: c.projectName,
        totalHours: 0,
        claimCount: 0,
      });
    }
    const entry = projectMap.get(c.projectId)!;
    entry.totalHours += eff;
    entry.claimCount += 1;
  }
  const projectSummaries: ProjectSummary[] = Array.from(
    projectMap.values()
  ).sort((a, b) => b.totalHours - a.totalHours);

  // --- Per-claimType summary ---
  type TypeSummary = {
    claimType: string;
    totalHours: number;
    claimCount: number;
  };
  const typeMap = new Map<string, TypeSummary>();
  for (const c of claims) {
    const eff = c.approvedHours ?? c.hoursSaved;
    if (!typeMap.has(c.claimType)) {
      typeMap.set(c.claimType, {
        claimType: c.claimType,
        totalHours: 0,
        claimCount: 0,
      });
    }
    const entry = typeMap.get(c.claimType)!;
    entry.totalHours += eff;
    entry.claimCount += 1;
  }
  const typeSummaries: TypeSummary[] = Array.from(typeMap.values()).sort(
    (a, b) => b.totalHours - a.totalHours
  );

  // --- Weekly buckets (last 12 weeks) ---
  type WeekBucket = {
    label: string;
    weekStart: string; // ISO
    hours: number;
    claimCount: number;
  };
  const weekBuckets: WeekBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const wClaims = claims.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= weekStart && d < weekEnd;
    });

    const mo = weekStart.getMonth() + 1;
    const dy = weekStart.getDate();
    weekBuckets.push({
      label: `${mo}/${dy}`,
      weekStart: weekStart.toISOString(),
      hours: wClaims.reduce((s, c) => s + (c.approvedHours ?? c.hoursSaved), 0),
      claimCount: wClaims.length,
    });
  }

  return (
    <ReportsClient
      claims={claims}
      userSummaries={userSummaries}
      projectSummaries={projectSummaries}
      typeSummaries={typeSummaries}
      weekBuckets={weekBuckets}
    />
  );
}
