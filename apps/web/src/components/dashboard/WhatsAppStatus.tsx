"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, Loader2, X } from "lucide-react";
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
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const connectingRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (!res.ok) return;
      const data: WAStatus = await res.json();
      setStatus(data);

      if (connectingRef.current && data.status === "qr_pending" && data.qr) {
        connectingRef.current = false;
        setConnecting(false);
        setShowQr(true);
      }
      if (connectingRef.current && data.status === "connected") {
        connectingRef.current = false;
        setConnecting(false);
      }
      if (disconnecting && data.status !== "connected") {
        setDisconnecting(false);
        setShowQr(false);
      }
    } catch {}
  }, [disconnecting]);

  useEffect(() => {
    poll();
    const interval = connecting ? 1500 : 5000;
    const id = setInterval(poll, interval);
    return () => clearInterval(id);
  }, [poll, connecting]);

  // Close modal on Escape key.
  useEffect(() => {
    if (!showQr) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQr(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showQr]);

  async function handleConnect() {
    connectingRef.current = true;
    setConnecting(true);
    setShowQr(false);
    try {
      await fetch("/api/whatsapp/connect", { method: "POST" });
    } catch {
      connectingRef.current = false;
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setShowQr(false);
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
    } catch {
      setDisconnecting(false);
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
  const canConnect =
    !connecting &&
    (status.status === "disconnected" || status.status === "not_configured");

  const dotClass = isConnected
    ? "bg-emerald-500"
    : isQrPending || connecting
      ? "bg-amber-400 animate-pulse"
      : "bg-red-500";

  const statusLabel = connecting
    ? "Connecting…"
    : isConnected
      ? (status.phoneNumber ?? status.displayName ?? "Connected")
      : isQrPending
        ? "Scan QR"
        : "Disconnected";

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Status pill */}
        <button
          onClick={() => isQrPending && status.qr && setShowQr((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 px-3 py-1.5 text-xs",
            "transition-colors hover:bg-harmony-surface-2",
            isQrPending && "cursor-pointer",
          )}
        >
          {connecting ? (
            <Loader2 size={12} className="animate-spin text-amber-500" />
          ) : (
            <span className={cn("h-2 w-2 rounded-full", dotClass)} />
          )}
          <span className="hidden text-harmony-fg-secondary sm:inline">{statusLabel}</span>
        </button>

        {/* Connect button */}
        {canConnect && (
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 px-3 py-1.5 text-xs text-harmony-fg-secondary transition-colors hover:bg-harmony-surface-2"
          >
            <Smartphone size={12} strokeWidth={1.5} />
            <span className="hidden sm:inline">Connect</span>
          </button>
        )}

        {/* Close session button */}
        {isConnected && !disconnecting && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <X size={12} strokeWidth={2} />
            <span className="hidden sm:inline">Close session</span>
          </button>
        )}

        {disconnecting && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-harmony-fg-secondary">
            <Loader2 size={12} className="animate-spin" />
            <span className="hidden sm:inline">Closing…</span>
          </div>
        )}
      </div>

      {/* Centered QR modal */}
      {showQr && status.qr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQr(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-harmony-border-subtle bg-harmony-surface-1 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQr(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-harmony-fg-secondary transition-colors hover:bg-harmony-surface-2 hover:text-harmony-fg"
            >
              <X size={16} />
            </button>

            <h2 className="mb-1 text-center text-base font-semibold text-harmony-fg">
              Connect WhatsApp
            </h2>
            <p className="mb-6 text-center text-xs text-harmony-fg-secondary">
              Open WhatsApp → Linked Devices → Link a device
            </p>

            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(status.qr)}&size=280x280&margin=10`}
                alt="WhatsApp QR code"
                width={280}
                height={280}
                className="rounded-2xl"
              />
            </div>

            <p className="mt-5 text-center text-xs text-harmony-fg-secondary">
              QR code expires in ~20 seconds — it will refresh automatically.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
