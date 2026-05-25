import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ClaimSchema = z.object({
  jiraTicketUrl: z.string().optional().default(""),
  jiraTicketId: z.string().optional().default(""),
  jiraProjectKey: z.string().optional(),
  jiraSummary: z.string().optional(),
  jiraHoursLogged: z.number().min(0).optional().default(0),
  jiraAssignee: z.string().optional(),
  jiraSprint: z.string().optional(),
  estimatedWithout: z.number().min(0.5),
  estimatedWith: z.number().min(0),
  hoursSaved: z.number().min(0),
  toolsUsed: z.array(z.string()).min(1),
  claimType: z.enum(["TEST_AUTOMATION", "BUG_DETECTION", "REGRESSION", "CI_CD", "CODE_REVIEW", "OTHER"]),
  description: z.string().min(10),
  corroboratorId: z.string().optional(),
  projectId: z.string().optional().nullable(),
});

export const GET = auth(async function GET(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claims = await prisma.claim.findMany({
    where: { submitterId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      submitter: { select: { name: true, email: true } },
      corroborator: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(claims);
});

export const POST = auth(async function POST(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
      .join(" | ");
    return NextResponse.json(
      { error: `Validation failed — ${fieldErrors || "check all fields"}`, details: flat },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Weekly claim cap check (max 10 per week)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekCount = await prisma.claim.count({
    where: { submitterId: session.user.id, createdAt: { gte: weekAgo } },
  });
  if (weekCount >= 10) {
    return NextResponse.json({ error: "Weekly claim limit reached (10 per week)" }, { status: 429 });
  }

  // Auto-resolve projectId from jiraProjectKey if not explicitly set
  let resolvedProjectId = data.projectId ?? null;
  if (!resolvedProjectId && data.jiraProjectKey) {
    const autoProject = await prisma.project.findUnique({
      where: { jiraProjectKey: data.jiraProjectKey },
    });
    if (autoProject) resolvedProjectId = autoProject.id;
  }

  const claim = await prisma.claim.create({
    data: {
      jiraTicketUrl: data.jiraTicketUrl ?? "",
      jiraTicketId: data.jiraTicketId ?? "",
      jiraProjectKey: data.jiraProjectKey,
      jiraSummary: data.jiraSummary,
      jiraHoursLogged: data.jiraHoursLogged,
      jiraAssignee: data.jiraAssignee,
      jiraSprint: data.jiraSprint,
      estimatedWithout: data.estimatedWithout,
      estimatedWith: data.estimatedWith,
      hoursSaved: data.hoursSaved,
      toolsUsed: JSON.stringify(data.toolsUsed),
      claimType: data.claimType,
      description: data.description,
      submitterId: session.user.id,
      corroboratorId: data.corroboratorId,
      projectId: resolvedProjectId,
      status: "PENDING",
    },
  });

  return NextResponse.json(claim, { status: 201 });
});
