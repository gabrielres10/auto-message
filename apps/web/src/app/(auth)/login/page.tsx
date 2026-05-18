import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getSession } from "@/lib/session";
import { Panel } from "@/components/ui/panel";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="w-full max-w-sm space-y-7">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-harmony-cta">
          <MessageSquare size={20} className="text-white" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-harmony-fg">Auto Message</h1>
          <p className="text-sm text-harmony-fg-secondary">
            Sign in to continue
          </p>
        </div>
      </div>

      <Panel padding="lg">
        <LoginForm />
      </Panel>
    </div>
  );
}
