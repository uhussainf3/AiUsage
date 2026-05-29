import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DivisionsClient } from "./DivisionsClient";

export default async function DivisionsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userRole = session.user.role ?? "QA_MEMBER";

  // All divisions with head info and projects/claims
  const divisions = await prisma.division.findMany({
    include: {
      head: { select: { id: true, name: true, email: true } },
      projects: {
        select: {
          id: true,
          claims: {
            where: { status: { in: ["APPROVED", "REDUCED"] } },
            select: {
              id: true,
              hoursSaved: true,
              approvedHours: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Compute stats per division
  const divisionStats = divisions.map((d) => {
    const projectCount = d.projects.length;
    const allApprovedClaims = d.projects.flatMap((p) => p.claims);
    const approvedClaimCount = allApprovedClaims.length;
    const totalHoursSaved = allApprovedClaims.reduce(
      (sum, c) => sum + (c.approvedHours ?? c.hoursSaved),
      0
    );

    return {
      id: d.id,
      name: d.name,
      slug: d.slug,
      description: d.description,
      head: d.head,
      projectCount,
      approvedClaimCount,
      totalHoursSaved: Math.round(totalHoursSaved * 10) / 10,
      createdAt: d.createdAt.toISOString(),
    };
  });

  // Users eligible to be division heads (DIVISION_HEAD or ADMIN)
  const headCandidates = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["DIVISION_HEAD", "ADMIN"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <DivisionsClient
      divisions={divisionStats}
      headCandidates={headCandidates}
      currentUserRole={userRole}
    />
  );
}
