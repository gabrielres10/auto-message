import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { logger } from "../lib/logger";

let _client: Client | null = null;

export function getWhatsAppClient(): Client {
  if (!_client) {
    throw new Error(
      "WhatsApp client not initialized. Call initWhatsAppClient() first."
    );
  }
  return _client;
}

export async function initWhatsAppClient(): Promise<Client> {
  _client = new Client({
    authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  _client.on("qr", (qr) => {
    // TODO: push QR to Redis so the web app can expose it via polling
    logger.info("QR code received — scan with WhatsApp:");
    qrcode.generate(qr, { small: true });
  });

  _client.on("ready", () => {
    logger.info("WhatsApp client ready");
  });

  _client.on("auth_failure", (message) => {
    logger.error({ message }, "WhatsApp authentication failed");
  });

  _client.on("disconnected", (reason) => {
    logger.warn({ reason }, "WhatsApp client disconnected");
    _client = null;
  });

  await _client.initialize();
  return _client;
}
