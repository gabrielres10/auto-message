"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone, WifiOff, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WAStatus {
  status: "not_configured" | "connected" | "qr_pending" | "disconnected";
  phoneNumber?: string | null;
  displayName?: string | null;
  qr?: string | null;
}

export default function WhatsAppStatus() {
  const [status, setStatus] = useState<WAStatus | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState<"connect" | "disconnect" | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Close QR popover on outside click.
  useEffect(() => {
    if (!showQr) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowQr(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showQr]);

  async function sendControl(action: "connect" | "disconnect") {
    setLoading(action);
    try {
      await fetch(`/api/whatsapp/${action}`, { method: "POST" });
      if (action === "connect") setShowQr(false);
    } finally {
      setLoading(null);
    }
  }

  if (!status) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-harmony-fg-secondary">
        <Loader2 size={13} className="animate-spin" />
        <span className="hidden sm:inline">WhatsApp</span>
      </div>
    );
  }

  const isConnected = status.status === "connected";
  const isQrPending = status.status === "qr_pending";
  const canConnect = status.status === "disconnected" || status.status === "not_configured";

  const dotClass = isConnected
    ? "bg-emerald-500"
    : isQrPending
      ? "bg-amber-400 animate-pulse"
      : "bg-red-500";

  const label = isConnected
    ? (status.phoneNumber ?? status.displayName ?? "Connected")
    : isQrPending
      ? "Scan QR"
      : "Disconnected";

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex items-center gap-1">
        {/* Status pill */}
        <button
          onClick={() => isQrPending && setShowQr((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 px-3 py-1.5 text-xs",
            "transition-colors hover:bg-harmony-surface-2",
            isQrPending && "cursor-pointer",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", dotClass)} />
          <span className="hidden text-harmony-fg-secondary sm:inline">{label}</span>
        </button>

        {/* Connect button */}
        {canConnect && (
          <button
            disabled={loading !== null}
            onClick={() => sendControl("connect")}
            className="flex items-center gap-1.5 rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 px-3 py-1.5 text-xs text-harmony-fg-secondary transition-colors hover:bg-harmony-surface-2 disabled:opacity-50"
          >
            {loading === "connect" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Smartphone size={12} strokeWidth={1.5} />
            )}
            <span className="hidden sm:inline">Connect</span>
          </button>
        )}

        {/* Close session button */}
        {isConnected && (
          <button
            disabled={loading !== null}
            onClick={() => sendControl("disconnect")}
            className="flex items-center gap-1.5 rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
          >
            {loading === "disconnect" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <X size={12} strokeWidth={2} />
            )}
            <span className="hidden sm:inline">Close session</span>
          </button>
        )}
      </div>

      {/* QR popover */}
      {showQr && status.qr && (
        <div className="absolute right-0 top-full z-50 mt-2 rounded-xl border border-harmony-border-subtle bg-harmony-surface-1 p-4 shadow-lg">
          <p className="mb-3 text-center text-xs font-medium text-harmony-fg">
            Scan with WhatsApp
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(status.qr)}&size=200x200`}
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
