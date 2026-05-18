import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { redis } from "@/lib/redis";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await redis.publish(
    "whatsapp:control",
    JSON.stringify({ action: "connect", userId: session.user.id }),
  );

  return NextResponse.json({ ok: true });
}
