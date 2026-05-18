export type ClientState =
  | "INITIALIZING"
  | "QR_PENDING"
  | "AUTHENTICATED"
  | "READY"
  | "DISCONNECTED"
  | "DESTROYED";

export interface SessionPatch {
  isConnected?: boolean;
  phoneNumber?: string | null;
  displayName?: string | null;
  qrCode?: string | null;
  qrExpiresAt?: Date | null;
  connectedAt?: Date | null;
  lastActiveAt?: Date | null;
  disconnectedAt?: Date | null;
  disconnectReason?: string | null;
}
