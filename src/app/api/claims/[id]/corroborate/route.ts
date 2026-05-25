import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  action: z.enum(["confirm", "decline"]),
  note: z.string().optional(),
});

export const POST = auth(async function POST(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (session.user.id !== claim.corroboratorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, note } = parsed.data;

  let updated;
  if (action === "confirm") {
    updated = await prisma.claim.update({
      where: { id },
      data: {
        status: "CORROBORATED",
        corroboratorNote: note ?? null,
      },
    });
  } else {
    // decline — remove corroborator, keep status PENDING
    updated = await prisma.claim.update({
      where: { id },
      data: {
        corroboratorId: null,
        corroboratorNote: null,
      },
    });
  }

  return NextResponse.json(updated);
});
