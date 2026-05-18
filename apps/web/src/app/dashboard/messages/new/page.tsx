import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CreateMessageForm from "@/components/dashboard/CreateMessageForm";

export const metadata = { title: "New Schedule" };

export default function NewMessagePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <div className="mb-8 pl-10 md:pl-0">
        <Link
          href="/dashboard"
          className="mb-4 flex items-center gap-1.5 text-sm text-harmony-fg-secondary transition-colors hover:text-harmony-fg"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to dashboard
        </Link>
        <h1 className="text-xl font-semibold text-harmony-fg">New Schedule</h1>
        <p className="mt-0.5 text-sm text-harmony-fg-secondary">
          Set up a scheduled WhatsApp message
        </p>
      </div>

      <CreateMessageForm />
    </div>
  );
}
