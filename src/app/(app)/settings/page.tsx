import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const CLAIM_SETTING_KEYS = ["require_corroborator", "require_jira_ticket", "require_project"];

  const [users, settingsRaw] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, tier: true, isActive: true, approvalCount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.setting.findMany({ where: { key: { in: CLAIM_SETTING_KEYS } } }),
  ]);

  // Build a map with defaults for any missing keys
  const settingsMap: Record<string, string> = {
    require_corroborator: "true",
    require_jira_ticket: "false",
    require_project: "false",
  };
  for (const s of settingsRaw) {
    settingsMap[s.key] = s.value;
  }

  const claimSettings = {
    require_corroborator: settingsMap.require_corroborator,
    require_jira_ticket: settingsMap.require_jira_ticket,
    require_project: settingsMap.require_project,
  };

  return <SettingsClient users={users} claimSettings={claimSettings} />;
}
