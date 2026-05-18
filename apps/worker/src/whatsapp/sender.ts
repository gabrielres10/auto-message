import { UnrecoverableError } from "bullmq";
import { logger } from "../lib/logger";
import { getConnectionManager } from "./client";

const E164_RE = /^\+[1-9]\d{6,14}$/;

// whatsapp-web.js error patterns that confirm the number isn't on WhatsApp.
// Retrying these is pointless, so we use UnrecoverableError to skip remaining attempts.
const INVALID_NUMBER_PATTERNS = [
  /not a valid whatsapp/i,
  /invalid wid/i,
  /not registered/i,
  /phone number shared via business/i,
];

export interface SendResult {
  messageId: string;
  timestamp: number;
}

/**
 * Sends a WhatsApp message via the singleton client.
 *
 * Throws `UnrecoverableError` (no retry) when:
 *  - `phoneNumber` is not a valid E.164 string
 *  - The number is not registered on WhatsApp
 *
 * Throws a regular Error (retryable) for transient failures:
 *  - Client not yet READY (will retry when client reconnects)
 *  - Network timeouts, WhatsApp server errors
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  body: string,
  userId: string,
): Promise<SendResult> {
  if (!E164_RE.test(phoneNumber)) {
    throw new UnrecoverableError(
      `Invalid E.164 phone number: "${phoneNumber}"`,
    );
  }

  // Throws if state !== READY — BullMQ will retry after backoff.
  const client = getConnectionManager(userId).getClient();

  // Strip leading '+' to build the WhatsApp chat ID.
  const chatId = `${phoneNumber.slice(1)}@c.us`;

  // Pre-check registration to avoid a wasteful send attempt and get a clearer
  // error. Treated as "maybe registered" if the check itself errors.
  const isRegistered = await client
    .isRegisteredUser(chatId)
    .catch(() => true);

  if (!isRegistered) {
    throw new UnrecoverableError(
      `${phoneNumber} is not registered on WhatsApp`,
    );
  }

  let response;
  try {
    response = await client.sendMessage(chatId, body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isInvalidNumber = INVALID_NUMBER_PATTERNS.some((p) => p.test(msg));
    if (isInvalidNumber) {
      throw new UnrecoverableError(
        `${phoneNumber} is not registered on WhatsApp: ${msg}`,
      );
    }
    // Re-throw everything else as retryable.
    throw err;
  }

  const result: SendResult = {
    messageId: response.id._serialized,
    timestamp: response.timestamp as number,
  };

  logger.debug({ chatId, ...result }, "WhatsApp message sent");
  return result;
}
