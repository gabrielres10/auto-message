import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { localToUtc } from "@auto-message/shared";
import type { RecurrenceType } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await db.scheduledMessage.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: { recurrenceRule: true, executions: { orderBy: { scheduledFor: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = (await request.json()) as Record<string, unknown>;

  const phoneNumber = String(raw.phoneNumber ?? "");
  const body = String(raw.body ?? "");
  const timezone = String(raw.timezone ?? "");
  const scheduledTime = String(raw.scheduledTime ?? ""); // "HH:MM"
  const scheduledDate = String(raw.scheduledDate ?? ""); // "YYYY-MM-DD"
  const recurrenceType = (raw.recurrenceType as RecurrenceType | undefined) ?? "ONCE";

  if (!phoneNumber || !body || !timezone || !scheduledTime || !scheduledDate) {
    return NextResponse.json(
      { error: "phoneNumber, body, timezone, scheduledTime, and scheduledDate are required" },
      { status: 400 },
    );
  }

  // Compute the first UTC fire time.
  // Use noon UTC of the given date so getDateInTz returns the correct calendar day
  // regardless of the user's timezone offset.
  const [year, month, day] = scheduledDate.split("-").map(Number);
  const [hour, minute] = scheduledTime.split(":").map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0));
  const nextRunAt = localToUtc(noonUtc, hour, minute, timezone);

  // Optional recurrence fields
  const interval = Number(raw.interval ?? 1);
  const daysOfWeek = Array.isArray(raw.daysOfWeek) ? (raw.daysOfWeek as string[]) : [];
  const daysOfMonth = Array.isArray(raw.daysOfMonth) ? (raw.daysOfMonth as number[]) : [];
  const endsAt = raw.endsAt ? new Date(String(raw.endsAt)) : null;
  const maxOccurrences = raw.maxOccurrences ? Number(raw.maxOccurrences) : null;

  const needsRule = recurrenceType !== "ONCE";

  const message = await db.scheduledMessage.create({
    data: {
      userId: session.user.id,
      phoneNumber,
      body,
      timezone,
      scheduledTime,
      recurrenceType,
      status: "ACTIVE",
      isActive: true,
      nextRunAt,
      ...(needsRule
        ? {
            recurrenceRule: {
              create: {
                type: recurrenceType,
                interval,
                daysOfWeek: daysOfWeek as never,
                daysOfMonth,
                startsAt: nextRunAt,
                endsAt,
                maxOccurrences,
              },
            },
          }
        : {}),
    },
    include: { recurrenceRule: true },
  });

  return NextResponse.json(message, { status: 201 });
}
