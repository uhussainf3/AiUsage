import { auth } from "@/lib/auth";
import { SubmitClaimClient } from "./SubmitClaimClient";
import { prisma } from "@/lib/prisma";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [peers, projects, settingsRaw] = await Promise.all([
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
    // Claim submission rule settings
    prisma.setting.findMany({
      where: { key: { in: ["require_corroborator", "require_jira_ticket", "require_project"] } },
    }),
  ]);

  const settings: Record<string, string> = {
    require_corroborator: "true",
    require_jira_ticket: "false",
    require_project: "false",
  };
  for (const s of settingsRaw) {
    settings[s.key] = s.value;
  }

  return (
    <SubmitClaimClient
      userId={session.user.id as string}
      peers={peers}
      projects={projects}
      settings={settings}
    />
  );
}
