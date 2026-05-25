import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z
    .string()
    .email("Must be a valid email")
    .refine((e) => e.endsWith("@folio3.com"), {
      message: "Only @folio3.com email addresses are allowed",
    }),
  name: z.string().min(1).optional(),
  role: z
    .enum(["QA_MEMBER", "QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"])
    .default("QA_MEMBER"),
});

// POST /api/users — admin pre-creates a user by email
export const POST = auth(async function POST(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admins only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { email, name, role } = parsed.data;

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: `A user with ${email} already exists in the system.` },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: { email, name: name ?? null, role },
    select: { id: true, name: true, email: true, role: true, tier: true, isActive: true, approvalCount: true },
  });

  return NextResponse.json(user, { status: 201 });
});
