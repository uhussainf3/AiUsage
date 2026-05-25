import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  try {
    const session = await auth();
    if (session) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch (e) {
    console.error("[RootPage] auth() error:", e);
    redirect("/login");
  }
}
