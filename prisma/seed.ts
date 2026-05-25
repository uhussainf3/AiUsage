import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding badges…");

  const badges = [
    { slug: "first-claim", name: "First Win", description: "Submitted your first AI claim", icon: "🎯", color: "#C0392B", threshold: 0 },
    { slug: "speed-demon", name: "Speed Demon", description: "Saved 10+ hours in a single claim", icon: "⚡", color: "#D97706", threshold: 10 },
    { slug: "century", name: "Century", description: "100 hours saved total", icon: "💯", color: "#16A34A", threshold: 100 },
    { slug: "consistent", name: "Consistent", description: "5 consecutive weeks with approved claims", icon: "🔥", color: "#C0392B", threshold: 0 },
    { slug: "claude-champion", name: "Claude Champion", description: "20+ Claude Code claims approved", icon: "🤖", color: "#D97757", threshold: 0 },
    { slug: "playwright-pro", name: "Playwright Pro", description: "10+ Playwright MCP claims approved", icon: "🎭", color: "#2EAD33", threshold: 0 },
    { slug: "pioneer", name: "Pioneer", description: "First team member to reach Pro tier", icon: "🚀", color: "#7C3AED", threshold: 0 },
    { slug: "team-player", name: "Team Player", description: "Corroborated 10+ peer claims", icon: "🤝", color: "#2563EB", threshold: 0 },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: badge,
      create: badge,
    });
  }

  console.log(`✓ ${badges.length} badges seeded`);

  // Seed default settings
  const settings = [
    { key: "hourly_rate", value: "45" },
    { key: "auto_approve_threshold_hours", value: "4" },
    { key: "escalate_threshold_hours", value: "16" },
    { key: "weekly_claim_cap", value: "10" },
    { key: "jira_match_minimum_pct", value: "80" },
    { key: "leaderboard_default_period", value: "MONTHLY" },
    { key: "report_schedule_weekly", value: "true" },
    { key: "report_schedule_monthly", value: "true" },
    // Claim submission configurability
    { key: "require_corroborator", value: "true" },
    { key: "require_jira_ticket", value: "false" },
    { key: "require_project", value: "false" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log(`✓ ${settings.length} settings seeded`);
  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
