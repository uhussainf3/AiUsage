import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  jiraProjectKey: z.string().regex(/^[A-Z][A-Z0-9]+$/).optional().nullable(),
  description: z.string().optional().nullable(),
  pmId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/projects/[id] — update project (ADMIN or that project's PM)
export const PATCH = auth(async function PATCH(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isPM = session.user.id === project.pmId;
  if (!isAdmin && !isPM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: parsed.data,
    include: { pm: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
});
