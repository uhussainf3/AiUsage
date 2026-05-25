import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Providers } from "@/components/providers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <Providers>
      <div className="app-shell">
        <TopNav user={session.user} />
        <div className="app-body">{children}</div>
      </div>
    </Providers>
  );
}
