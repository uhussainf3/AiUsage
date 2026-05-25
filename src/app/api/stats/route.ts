import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = auth(async function GET(req) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalHours, totalClaims, activeUsers] = await Promise.all([
    prisma.claim.aggregate({
      where: { status: { in: ["APPROVED", "REDUCED"] } },
      _sum: { hoursSaved: true },
    }),
    prisma.claim.count({ where: { status: { in: ["APPROVED", "REDUCED"] } } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  return NextResponse.json({
    totalHours: totalHours._sum.hoursSaved ?? 0,
    totalClaims,
    activeUsers,
    totalValue: (totalHours._sum.hoursSaved ?? 0) * 45,
  });
});
