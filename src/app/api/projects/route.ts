import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  jiraProjectKey: z.string().regex(/^[A-Z][A-Z0-9]+$/).optional().or(z.literal("")),
  description: z.string().optional(),
  pmId: z.string(),
  divisionId: z.string().optional(),
});

// GET /api/projects — list all active projects with PM info and stats
export const GET = auth(async function GET(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  const projects = await prisma.project.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: {
      pm: { select: { id: true, name: true, email: true } },
      _count: { select: { claims: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(projects);
});

// POST /api/projects — create a project (ADMIN or PROJECT_MANAGER only)
export const POST = auth(async function POST(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPrivileged = ["ADMIN", "PROJECT_MANAGER"].includes(session.user.role ?? "");
  if (!isPrivileged) {
    return NextResponse.json({ error: "Forbidden — only Project Managers and Admins can create projects" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Check unique Jira key if provided
  if (data.jiraProjectKey) {
    const existing = await prisma.project.findUnique({ where: { jiraProjectKey: data.jiraProjectKey } });
    if (existing) {
      return NextResponse.json({ error: `Jira project key "${data.jiraProjectKey}" is already in use.` }, { status: 409 });
    }
  }

  const project = await prisma.project.create({
    data: {
      name: data.name,
      jiraProjectKey: data.jiraProjectKey || null,
      description: data.description,
      pmId: data.pmId,
      divisionId: data.divisionId || null,
    },
    include: {
      pm: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
});
