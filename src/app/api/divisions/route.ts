import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  headId: z.string().optional().nullable(),
});

// GET /api/divisions — list all divisions (any logged-in user)
export const GET = auth(async function GET(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const divisions = await prisma.division.findMany({
    include: {
      head: { select: { id: true, name: true, email: true } },
      projects: {
        select: {
          id: true,
          claims: {
            select: {
              status: true,
              hoursSaved: true,
              approvedHours: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(divisions);
});

// POST /api/divisions — create a division (ADMIN only)
export const POST = auth(async function POST(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Admins only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, slug, description, headId } = parsed.data;

  // Check uniqueness
  const existing = await prisma.division.findFirst({
    where: { OR: [{ name }, { slug }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: `A division with that name or slug already exists.` },
      { status: 409 }
    );
  }

  const division = await prisma.division.create({
    data: {
      name,
      slug,
      description: description ?? null,
      headId: headId ?? null,
    },
    include: {
      head: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(division, { status: 201 });
});
