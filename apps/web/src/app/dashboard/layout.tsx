import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
