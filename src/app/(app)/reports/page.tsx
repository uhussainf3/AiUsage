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

  // Fetch ALL approved/reduced claims (no date limit — client filters)
  const rawClaims = await prisma.claim.findMany({
    where: {
      status: { in: ["APPROVED", "REDUCED"] },
    },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
      project: {
        select: {
          id: true,
          name: true,
          division: { select: { id: true, name: true } },
        },
      },
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
    divisionId: c.project?.division?.id ?? null,
    divisionName: c.project?.division?.name ?? null,
  }));

  // Fetch all divisions for the filter dropdown
  const rawDivisions = await prisma.division.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const divisions = rawDivisions.map((d) => ({ id: d.id, name: d.name }));

  return (
    <ReportsClient
      claims={claims}
      divisions={divisions}
    />
  );
}
