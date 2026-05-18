import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * GET /api/whatsapp/status
 *
 * Returns the WhatsApp connection status for the authenticated user by reading
 * from the WhatsAppSession table, which the worker keeps in sync.
 *
 * The QR code string is only included while it hasn't expired — the client
 * should poll this endpoint (e.g. every 5 s) and render the QR via a library
 * such as `qrcode.react`.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const waSession = await db.whatsAppSession.findUnique({
    where: { userId: session.user.id },
    select: {
      isConnected: true,
      phoneNumber: true,
      displayName: true,
      connectedAt: true,
      lastActiveAt: true,
      disconnectedAt: true,
      disconnectReason: true,
      qrCode: true,
      qrExpiresAt: true,
    },
  });

  if (!waSession) {
    return NextResponse.json({
      status: "not_configured",
      phoneNumber: null,
      displayName: null,
      connectedAt: null,
      lastActiveAt: null,
      disconnectedAt: null,
      disconnectReason: null,
      qr: null,
    });
  }

  const now = new Date();
  const qrValid =
    waSession.qrCode !== null &&
    waSession.qrExpiresAt !== null &&
    waSession.qrExpiresAt > now;

  const status = waSession.isConnected
    ? "connected"
    : qrValid
      ? "qr_pending"
      : "disconnected";

  return NextResponse.json({
    status,
    phoneNumber: waSession.phoneNumber,
    displayName: waSession.displayName,
    connectedAt: waSession.connectedAt,
    lastActiveAt: waSession.lastActiveAt,
    disconnectedAt: waSession.disconnectedAt,
    disconnectReason: waSession.disconnectReason,
    // QR is only sent while valid — clients should poll and render with qrcode.react
    qr: qrValid ? waSession.qrCode : null,
  });
}
