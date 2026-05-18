"use client";

import { useEffect, useState } from "react";
import { Smartphone, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WAStatus {
  status: "not_configured" | "connected" | "qr_pending" | "disconnected";
  phoneNumber?: string;
  displayName?: string;
  qrCode?: string;
}

export default function WhatsAppStatus() {
  const [status, setStatus] = useState<WAStatus | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/whatsapp/status");
        if (res.ok) setStatus(await res.json());
      } catch {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  if (!status) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-harmony-fg-secondary">
        <Loader2 size={13} className="animate-spin" />
        <span className="hidden sm:inline">WhatsApp</span>
      </div>
    );
  }

  const cfg: Record<
    WAStatus["status"],
    { dot: string; label: string; icon: typeof Smartphone }
  > = {
    connected: {
      dot: "bg-emerald-500",
      label: status.phoneNumber ?? "Connected",
      icon: Smartphone,
    },
    qr_pending: {
      dot: "bg-amber-400 animate-pulse",
      label: "Scan QR",
      icon: Smartphone,
    },
    disconnected: {
      dot: "bg-red-500",
      label: "Disconnected",
      icon: WifiOff,
    },
    not_configured: {
      dot: "bg-harmony-fg-secondary",
      label: "Not connected",
      icon: WifiOff,
    },
  };

  const { dot, label } = cfg[status.status];

  return (
    <div className="relative">
      <button
        onClick={() => status.status === "qr_pending" && setShowQr((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 px-3 py-1.5 text-xs",
          "transition-colors hover:bg-harmony-surface-2",
          status.status === "qr_pending" && "cursor-pointer",
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span className="hidden text-harmony-fg-secondary sm:inline">{label}</span>
      </button>

      {/* QR popover */}
      {showQr && status.qrCode && (
        <div className="absolute right-0 top-full z-50 mt-2 rounded-xl border border-harmony-border-subtle bg-harmony-surface-1 p-4 shadow-lg">
          <p className="mb-3 text-center text-xs font-medium text-harmony-fg">
            Scan with WhatsApp
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(status.qrCode)}&size=200x200`}
            alt="WhatsApp QR code"
            width={200}
            height={200}
            className="rounded-lg"
          />
          <p className="mt-3 text-center text-xs text-harmony-fg-secondary">
            Opens WhatsApp → Linked Devices
          </p>
        </div>
      )}
    </div>
  );
}
