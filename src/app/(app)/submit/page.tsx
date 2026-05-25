import { auth } from "@/lib/auth";
import { SubmitClaimClient } from "./SubmitClaimClient";
import { prisma } from "@/lib/prisma";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [peers, projects] = await Promise.all([
    // Potential corroborators
    prisma.user.findMany({
      where: { isActive: true, id: { not: session.user.id } },
      select: { id: true, name: true, email: true, role: true, tier: true, approvalCount: true },
      orderBy: { approvalCount: "desc" },
    }),
    // Active projects for project picker
    prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, name: true, jiraProjectKey: true, pm: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return <SubmitClaimClient userId={session.user.id as string} peers={peers} projects={projects} />;
}
