import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = auth(async function POST(
  req,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = req.auth;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isLead = ["QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"].includes(
    session.user.role ?? ""
  );
  if (!isLead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, approvedHours, rejectReason } = await req.json();

  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  let updateData: Record<string, unknown> = { approverId: session.user.id };

  if (action === "approve") {
    updateData = { ...updateData, status: "APPROVED", approvedHours: claim.hoursSaved };
  } else if (action === "reduce") {
    updateData = { ...updateData, status: "REDUCED", approvedHours: Number(approvedHours) };
  } else if (action === "reject") {
    updateData = { ...updateData, status: "REJECTED", rejectReason };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.claim.update({ where: { id }, data: updateData });

  if (action === "approve" || action === "reduce") {
    await prisma.user.update({
      where: { id: claim.submitterId },
      data: { approvalCount: { increment: 1 } },
    });

    const submitter = await prisma.user.findUnique({ where: { id: claim.submitterId } });
    if (submitter) {
      let newTier = submitter.tier;
      if (submitter.approvalCount + 1 >= 25) newTier = "PRO";
      else if (submitter.approvalCount + 1 >= 5) newTier = "TRUSTED";
      if (newTier !== submitter.tier) {
        await prisma.user.update({ where: { id: claim.submitterId }, data: { tier: newTier } });
      }
    }
  }

  return NextResponse.json(updated);
});
