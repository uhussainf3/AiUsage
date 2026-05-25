import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  role: z
    .enum(["QA_MEMBER", "QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"])
    .optional(),
  tier: z.enum(["NEW", "TRUSTED", "PRO"]).optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/users/[id] — update role, tier, or active status (admin only)
export const PATCH = auth(async function PATCH(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admins only" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Prevent admin from deactivating themselves
  if (id === session.user.id && (body as Record<string, unknown>).isActive === false) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, tier: true, isActive: true, approvalCount: true },
  });

  return NextResponse.json(updated);
});

// DELETE /api/users/[id] — permanently remove a pre-added user who has never submitted a claim
export const DELETE = auth(async function DELETE(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admins only" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  // Only allow deleting users who have never submitted a claim (safe)
  const claimCount = await prisma.claim.count({ where: { submitterId: id } });
  if (claimCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a user with existing claims. Deactivate them instead." },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
