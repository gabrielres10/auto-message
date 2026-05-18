import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Drop-in replacement for getServerSession that treats stale or corrupt
 * tokens (e.g. leftover cookies from a previous session strategy) as
 * "no session" instead of propagating a JWT_SESSION_ERROR.
 */
export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}
