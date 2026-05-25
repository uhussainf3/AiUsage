import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id as string;
  const userRole = session.user.role ?? "QA_MEMBER";

  // All users to populate PM selector (admins/PMs creating projects)
  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  // Projects with aggregated stats
  const projects = await prisma.project.findMany({
    where: { isActive: true },
    include: {
      pm: { select: { id: true, name: true, email: true } },
      claims: {
        select: {
          id: true,
          status: true,
          hoursSaved: true,
          approvedHours: true,
          submitterId: true,
          createdAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Compute per-project stats
  const projectStats = projects.map((p) => {
    const approved = p.claims.filter(
      (c) => c.status === "APPROVED" || c.status === "REDUCED"
    );
    const pending = p.claims.filter((c) => c.status === "PENDING");
    const totalHours = approved.reduce(
      (s, c) => s + (c.approvedHours ?? c.hoursSaved),
      0
    );
    const uniqueMembers = new Set(p.claims.map((c) => c.submitterId)).size;

    // Last activity
    const dates = p.claims.map((c) => new Date(c.createdAt).getTime());
    const lastActivity = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    return {
      id: p.id,
      name: p.name,
      jiraProjectKey: p.jiraProjectKey,
      description: p.description,
      isActive: p.isActive,
      pm: p.pm,
      totalClaims: p.claims.length,
      approvedClaims: approved.length,
      pendingClaims: pending.length,
      totalHours: Math.round(totalHours * 10) / 10,
      dollarValue: Math.round(totalHours * 45),
      uniqueMembers,
      lastActivity: lastActivity?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    };
  });

  // Sort: most hours saved first
  projectStats.sort((a, b) => b.totalHours - a.totalHours);

  // Global summary
  const totalProjectHours = projectStats.reduce((s, p) => s + p.totalHours, 0);
  const totalProjectClaims = projectStats.reduce((s, p) => s + p.approvedClaims, 0);

  const canManage = ["ADMIN", "PROJECT_MANAGER"].includes(userRole);

  return (
    <ProjectsClient
      projects={projectStats}
      allUsers={allUsers}
      currentUserId={userId}
      currentUserRole={userRole}
      canManage={canManage}
      globalStats={{
        totalProjects: projects.length,
        totalHours: Math.round(totalProjectHours * 10) / 10,
        totalClaims: totalProjectClaims,
        dollarValue: Math.round(totalProjectHours * 45),
      }}
    />
  );
}
