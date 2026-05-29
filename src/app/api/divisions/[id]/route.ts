import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  headId: z.string().optional().nullable(),
});

// PATCH /api/divisions/[id] — update division (ADMIN only)
export const PATCH = auth(async function PATCH(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Admins only" }, { status: 403 });
  }

  const { id } = await params;
  const division = await prisma.division.findUnique({ where: { id } });
  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.division.update({
    where: { id },
    data: parsed.data,
    include: {
      head: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
});
