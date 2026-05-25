import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VerificationClient } from "./VerificationClient";

export default async function VerificationPage() {
  const session = await auth();
  if (!session) return null;

  const isLead = ["QA_LEAD", "DEV_LEAD", "PROJECT_MANAGER", "ADMIN"].includes(session.user.role);
  if (!isLead) redirect("/dashboard");

  // Claims pending approval (corroborated or pending)
  const claims = await prisma.claim.findMany({
    where: {
      status: { in: ["PENDING", "CORROBORATED"] },
    },
    include: {
      submitter: { select: { id: true, name: true, email: true, role: true, tier: true, approvalCount: true } },
      corroborator: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { name: true } },
    },
    orderBy: [
      { status: "asc" },   // CORROBORATED first
      { createdAt: "asc" },
    ],
  });

  return <VerificationClient claims={claims} approverId={session.user.id} />;
}
