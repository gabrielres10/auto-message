import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  localTimeToUtc,
  validateScheduleInput,
  SchedulingMode,
  WEEKDAY_DAYS,
  type ScheduleInput,
} from "@auto-message/shared";
import type { RecurrenceType } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await db.scheduledMessage.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: {
      recurrenceRule: true,
      executions: { orderBy: { scheduledFor: "desc" }, take: 1 },
    },
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

  const input: ScheduleInput = {
    phoneNumber: String(raw.phoneNumber ?? ""),
    body: String(raw.body ?? ""),
    timezone: String(raw.timezone ?? ""),
    scheduledTime: String(raw.scheduledTime ?? ""),
    scheduledDate: String(raw.scheduledDate ?? ""),
    mode: String(raw.mode ?? raw.recurrenceType ?? "") as SchedulingMode,
    daysOfWeek: Array.isArray(raw.daysOfWeek)
      ? (raw.daysOfWeek as string[]).filter(Boolean) as ScheduleInput["daysOfWeek"]
      : undefined,
    intervalDays:
      raw.intervalDays !== undefined
        ? Number(raw.intervalDays)
        : raw.interval !== undefined
          ? Number(raw.interval)
          : undefined,
    endsAt: raw.endsAt ? String(raw.endsAt).slice(0, 10) : undefined,
    maxOccurrences: raw.maxOccurrences ? Number(raw.maxOccurrences) : undefined,
  };

  const validation = validateScheduleInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }

  // ── Normalize WEEKDAYS mode to WEEKLY + Mon–Fri daysOfWeek ─────────────────
  // WEEKDAYS is a UI convenience; it's stored as WEEKLY internally.
  let recurrenceType: RecurrenceType;
  let daysOfWeek: string[];

  if (input.mode === SchedulingMode.WEEKDAYS) {
    recurrenceType = "WEEKDAYS";
    daysOfWeek = WEEKDAY_DAYS as unknown as string[];
  } else if (input.mode === SchedulingMode.WEEKLY) {
    recurrenceType = "WEEKLY";
    daysOfWeek = input.daysOfWeek as string[];
  } else {
    recurrenceType = input.mode as RecurrenceType;
    daysOfWeek = [];
  }

  const interval =
    input.mode === SchedulingMode.CUSTOM ? (input.intervalDays ?? 1) : 1;

  // ── Compute first UTC fire time ──────────────────────────────────────────────
  const nextRunAt = localTimeToUtc(
    input.scheduledDate,
    input.scheduledTime,
    input.timezone,
  );

  const endsAt = input.endsAt
    ? new Date(`${input.endsAt}T23:59:59`)
    : null;

  const needsRule = recurrenceType !== "ONCE";

  const message = await db.scheduledMessage.create({
    data: {
      userId: session.user.id,
      phoneNumber: input.phoneNumber,
      body: input.body,
      timezone: input.timezone,
      scheduledTime: input.scheduledTime,
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
                daysOfMonth: [],
                startsAt: nextRunAt,
                endsAt,
                maxOccurrences: input.maxOccurrences ?? null,
              },
            },
          }
        : {}),
    },
    include: { recurrenceRule: true },
  });

  return NextResponse.json(message, { status: 201 });
}
