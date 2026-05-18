import { ConnectionManager } from "./connection-manager";

const _managers = new Map<string, ConnectionManager>();

export function getConnectionManager(userId: string): ConnectionManager {
  const m = _managers.get(userId);
  if (!m) {
    throw new Error(`No WhatsApp client for user ${userId}. Call connectUser() first.`);
  }
  return m;
}

export function getWhatsAppClient(userId: string) {
  return getConnectionManager(userId).getClient();
}

export async function connectUser(userId: string): Promise<void> {
  let m = _managers.get(userId);
  if (!m) {
    m = new ConnectionManager(userId);
    _managers.set(userId, m);
  }
  await m.initialize();
}

export async function disconnectUser(userId: string): Promise<void> {
  const m = _managers.get(userId);
  if (m) {
    await m.destroy();
    _managers.delete(userId);
  }
}

export async function destroyAllClients(): Promise<void> {
  await Promise.all([..._managers.values()].map((m) => m.destroy()));
  _managers.clear();
}
