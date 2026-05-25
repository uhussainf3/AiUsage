import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const EditSchema = z.object({
  jiraTicketUrl: z.string().optional(),
  jiraTicketId: z.string().optional(),
  estimatedWithout: z.number().min(0.5),
  estimatedWith: z.number().min(0),
  hoursSaved: z.number().min(0),
  toolsUsed: z.array(z.string()).min(1),
  claimType: z.enum(["TEST_AUTOMATION", "BUG_DETECTION", "REGRESSION", "CI_CD", "CODE_REVIEW", "OTHER"]),
  description: z.string().min(10),
  corroboratorId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

// PUT /api/claims/[id] — edit a PENDING claim
export const PUT = auth(async function PUT(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  // Only the submitter can edit their own claim
  if (claim.submitterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Can only edit PENDING claims
  if (claim.status !== "PENDING") {
    return NextResponse.json(
      { error: `Cannot edit a claim with status: ${claim.status}. Only PENDING claims can be edited.` },
      { status: 400 }
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = EditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const updated = await prisma.claim.update({
    where: { id },
    data: {
      jiraTicketUrl: data.jiraTicketUrl ?? claim.jiraTicketUrl,
      jiraTicketId: data.jiraTicketId ?? claim.jiraTicketId,
      estimatedWithout: data.estimatedWithout,
      estimatedWith: data.estimatedWith,
      hoursSaved: data.hoursSaved,
      toolsUsed: JSON.stringify(data.toolsUsed),
      claimType: data.claimType,
      description: data.description,
      corroboratorId: data.corroboratorId ?? null,
      projectId: data.projectId !== undefined ? data.projectId : claim.projectId,
    },
  });

  return NextResponse.json(updated);
});

// DELETE /api/claims/[id] — delete a PENDING claim
export const DELETE = auth(async function DELETE(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  if (claim.submitterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (claim.status !== "PENDING") {
    return NextResponse.json(
      { error: `Cannot delete a claim with status: ${claim.status}. Only PENDING claims can be deleted.` },
      { status: 400 }
    );
  }

  await prisma.claim.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
