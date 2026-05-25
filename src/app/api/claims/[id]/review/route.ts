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
  const { action, approvedHours, rejectReason, approverNote } = await req.json();

  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  let updateData: Record<string, unknown> = { approverId: session.user.id };

  if (action === "approve") {
    updateData = { ...updateData, status: "APPROVED", approvedHours: claim.hoursSaved, approverNote: approverNote ?? null };
  } else if (action === "reduce") {
    updateData = { ...updateData, status: "REDUCED", approvedHours: Number(approvedHours), approverNote: approverNote ?? null };
  } else if (action === "reject") {
    updateData = { ...updateData, status: "REJECTED", rejectReason };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.claim.update({ where: { id }, data: updateData });

  const ticketRef = claim.jiraTicketId ? ` (${claim.jiraTicketId})` : "";

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

        // Notify tier upgrade
        await prisma.notification.create({
          data: {
            userId: claim.submitterId,
            type: "TIER_UPGRADE",
            title: "Trust Tier Upgraded! 🎉",
            message: `You've been upgraded to ${newTier} tier. Keep up the great work!`,
            link: "/dashboard",
          },
        });
      }
    }

    const hours = action === "reduce" ? Number(approvedHours) : claim.hoursSaved;
    await prisma.notification.create({
      data: {
        userId: claim.submitterId,
        type: "CLAIM_APPROVED",
        title: action === "approve" ? "Claim Approved ✅" : "Claim Approved (Reduced) ✅",
        message: `Your claim${ticketRef} was ${action === "approve" ? "approved" : "approved with reduced hours ("}${action === "reduce" ? `${hours}h)` : ""} — ${hours}h recorded.`,
        link: "/dashboard",
      },
    });
  } else if (action === "reject") {
    await prisma.notification.create({
      data: {
        userId: claim.submitterId,
        type: "CLAIM_REJECTED",
        title: "Claim Rejected ❌",
        message: `Your claim${ticketRef} was rejected${rejectReason ? `: "${rejectReason}"` : ". Please review and resubmit."}`,
        link: "/dashboard",
      },
    });
  }

  return NextResponse.json(updated);
});
