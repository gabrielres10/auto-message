import { ConnectionManager } from "./connection-manager";

let _manager: ConnectionManager | null = null;

/**
 * Returns the singleton ConnectionManager.
 * Must be called after `initWhatsAppClient()` has been invoked.
 */
export function getConnectionManager(): ConnectionManager {
  if (!_manager) {
    throw new Error(
      "WhatsApp client not initialized. Call initWhatsAppClient() first.",
    );
  }
  return _manager;
}

/**
 * Convenience accessor for the raw whatsapp-web.js Client.
 * Throws if the client is not in READY state.
 */
export function getWhatsAppClient() {
  return getConnectionManager().getClient();
}

/**
 * Creates and initializes the singleton ConnectionManager.
 * Must be called once at worker startup, after env vars are loaded.
 *
 * @param userId  The DB user ID whose WhatsAppSession row will be kept in sync.
 */
export async function initWhatsAppClient(userId: string): Promise<void> {
  _manager = new ConnectionManager(userId);
  await _manager.initialize();
}

/**
 * Gracefully destroys the client and persists disconnect state.
 * Should be called during worker shutdown.
 */
export async function destroyWhatsAppClient(): Promise<void> {
  if (_manager) {
    await _manager.destroy();
    _manager = null;
  }
}
