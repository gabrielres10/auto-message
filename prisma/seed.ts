import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Base date: today at midnight UTC
const NOW = new Date();
const today = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()));
const days = (n: number) => new Date(today.getTime() + n * 86_400_000);

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const plainPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin User";

  const password = await bcrypt.hash(plainPassword, 12);

  const user = await db.user.upsert({
    where: { email },
    update: { password },
    create: { email, name, password },
  });

  console.log(`✓ Admin user: ${user.email} / ${plainPassword}`);

  // ── WhatsApp session ────────────────────────────────────────────────────────
  await db.whatsAppSession.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      isConnected: true,
      phoneNumber: "+573001234567",
      displayName: "Admin User",
      connectedAt: days(-3),
      lastActiveAt: days(0),
    },
  });

  console.log("✓ WhatsApp session");

  // ── Message templates ───────────────────────────────────────────────────────
  const templates = [
    {
      name: "Appointment reminder",
      body: "Hi {{name}}, this is a reminder of your appointment on {{date}} at {{time}}. Reply CONFIRM to confirm.",
      variables: ["name", "date", "time"],
    },
    {
      name: "Payment due",
      body: "Hi {{name}}, your payment of {{amount}} is due on {{date}}. Please ensure timely payment.",
      variables: ["name", "amount", "date"],
    },
    {
      name: "Weekly check-in",
      body: "Good morning {{name}}! Here is your weekly update for the week of {{week}}.",
      variables: ["name", "week"],
    },
    {
      name: "Birthday greeting",
      body: "Happy birthday, {{name}}! Wishing you a wonderful day. 🎂",
      variables: ["name"],
    },
  ];

  for (const t of templates) {
    await db.messageTemplate.upsert({
      where: { userId_name: { userId: user.id, name: t.name } },
      update: { body: t.body, variables: t.variables },
      create: { userId: user.id, ...t },
    });
  }

  console.log(`✓ ${templates.length} message templates`);

  // ── Scheduled messages ──────────────────────────────────────────────────────
  // Clean up existing seed messages so re-runs are idempotent
  await db.messageExecution.deleteMany({ where: { scheduledMessage: { userId: user.id } } });
  await db.recurrenceRule.deleteMany({ where: { scheduledMessage: { userId: user.id } } });
  await db.scheduledMessage.deleteMany({ where: { userId: user.id } });

  // 1. ONCE — delivered last week (COMPLETED)
  const once = await db.scheduledMessage.create({
    data: {
      userId: user.id,
      phoneNumber: "+573001234567",
      body: "Hello! Your one-time appointment reminder for tomorrow at 10:00 AM.",
      timezone: "America/Bogota",
      scheduledTime: "09:00",
      recurrenceType: "ONCE",
      status: "COMPLETED",
      isActive: false,
      nextRunAt: null,
      lastRunAt: days(-7),
      totalExecutions: 1,
      recurrenceRule: {
        create: {
          type: "ONCE",
          startsAt: days(-7),
          occurrenceCount: 1,
          maxOccurrences: 1,
        },
      },
    },
  });

  await db.messageExecution.create({
    data: {
      scheduledMessageId: once.id,
      scheduledFor: days(-7),
      queuedAt: new Date(days(-7).getTime() - 60_000),
      startedAt: new Date(days(-7).getTime() + 1_000),
      completedAt: new Date(days(-7).getTime() + 3_500),
      jobId: "whatsapp-messages:1001",
      attempt: 1,
      status: "SENT",
      responseData: { messageId: "3EB0C67D6A12", timestamp: days(-7).toISOString() },
    },
  });

  console.log("✓ ONCE message (COMPLETED)");

  // 2. DAILY — active, fires every day at 08:30
  const daily = await db.scheduledMessage.create({
    data: {
      userId: user.id,
      phoneNumber: "+573009876543",
      body: "Good morning! Your daily stand-up starts in 30 minutes. Don't forget to update your tickets.",
      timezone: "America/Bogota",
      scheduledTime: "08:30",
      recurrenceType: "DAILY",
      status: "ACTIVE",
      isActive: true,
      nextRunAt: days(1),
      lastRunAt: days(0),
      totalExecutions: 14,
      recurrenceRule: {
        create: {
          type: "DAILY",
          interval: 1,
          startsAt: days(-14),
          occurrenceCount: 14,
        },
      },
    },
  });

  // Execution history: last 3 days sent, today sent
  for (let i = 3; i >= 0; i--) {
    await db.messageExecution.create({
      data: {
        scheduledMessageId: daily.id,
        scheduledFor: days(-i),
        queuedAt: new Date(days(-i).getTime() + 8.5 * 3600_000 - 60_000),
        startedAt: new Date(days(-i).getTime() + 8.5 * 3600_000 + 500),
        completedAt: new Date(days(-i).getTime() + 8.5 * 3600_000 + 2_800),
        jobId: `whatsapp-messages:${2000 + i}`,
        attempt: 1,
        status: "SENT",
        responseData: { messageId: `3EB0${i}DAILY`, timestamp: days(-i).toISOString() },
      },
    });
  }

  console.log("✓ DAILY message (ACTIVE, 14 executions)");

  // 3. WEEKLY — fires Mon/Wed/Fri at 09:00, paused
  const weekly = await db.scheduledMessage.create({
    data: {
      userId: user.id,
      phoneNumber: "+573001112233",
      body: "Reminder: team sync today at 9 AM. Please review the agenda beforehand.",
      timezone: "America/Bogota",
      scheduledTime: "09:00",
      recurrenceType: "WEEKLY",
      status: "PAUSED",
      isActive: false,
      nextRunAt: null,
      lastRunAt: days(-2),
      totalExecutions: 6,
      recurrenceRule: {
        create: {
          type: "WEEKLY",
          interval: 1,
          daysOfWeek: ["MONDAY", "WEDNESDAY", "FRIDAY"],
          startsAt: days(-30),
          occurrenceCount: 6,
        },
      },
    },
  });

  // One failed execution followed by a retry that succeeded
  await db.messageExecution.create({
    data: {
      scheduledMessageId: weekly.id,
      scheduledFor: days(-4),
      queuedAt: new Date(days(-4).getTime() + 9 * 3600_000 - 60_000),
      startedAt: new Date(days(-4).getTime() + 9 * 3600_000 + 500),
      completedAt: new Date(days(-4).getTime() + 9 * 3600_000 + 15_000),
      jobId: "whatsapp-messages:3001",
      attempt: 1,
      status: "FAILED",
      errorMessage: "WhatsApp session disconnected — ECONNRESET",
    },
  });

  await db.messageExecution.create({
    data: {
      scheduledMessageId: weekly.id,
      scheduledFor: days(-4),
      queuedAt: new Date(days(-4).getTime() + 9 * 3600_000 + 30_000),
      startedAt: new Date(days(-4).getTime() + 9 * 3600_000 + 31_000),
      completedAt: new Date(days(-4).getTime() + 9 * 3600_000 + 33_500),
      jobId: "whatsapp-messages:3002",
      attempt: 2,
      status: "SENT",
      responseData: { messageId: "3EB0RETRY01", timestamp: days(-4).toISOString() },
    },
  });

  console.log("✓ WEEKLY message (PAUSED, Mon/Wed/Fri, includes retry history)");

  // 4. MONTHLY — fires on the 1st and 15th at 10:00, active
  const monthly = await db.scheduledMessage.create({
    data: {
      userId: user.id,
      phoneNumber: "+573004445566",
      body: "Hi! This is your bi-monthly billing reminder. Your invoice is ready in the portal.",
      timezone: "America/Bogota",
      scheduledTime: "10:00",
      recurrenceType: "MONTHLY",
      status: "ACTIVE",
      isActive: true,
      nextRunAt: (() => {
        const next = new Date(today);
        next.setUTCDate(15);
        if (next <= today) next.setUTCMonth(next.getUTCMonth() + 1);
        return next;
      })(),
      lastRunAt: (() => {
        const last = new Date(today);
        last.setUTCDate(1);
        if (last > today) last.setUTCMonth(last.getUTCMonth() - 1);
        return last;
      })(),
      totalExecutions: 3,
      recurrenceRule: {
        create: {
          type: "MONTHLY",
          interval: 1,
          daysOfMonth: [1, 15],
          startsAt: days(-90),
          occurrenceCount: 3,
        },
      },
    },
  });

  await db.messageExecution.create({
    data: {
      scheduledMessageId: monthly.id,
      scheduledFor: days(-30),
      queuedAt: new Date(days(-30).getTime() + 10 * 3600_000 - 60_000),
      startedAt: new Date(days(-30).getTime() + 10 * 3600_000 + 500),
      completedAt: new Date(days(-30).getTime() + 10 * 3600_000 + 2_200),
      jobId: "whatsapp-messages:4001",
      attempt: 1,
      status: "SENT",
      responseData: { messageId: "3EB0MONTH01", timestamp: days(-30).toISOString() },
    },
  });

  console.log("✓ MONTHLY message (ACTIVE, 1st and 15th)");

  // 5. ONCE — upcoming, not yet executed (ACTIVE)
  const upcoming = await db.scheduledMessage.create({
    data: {
      userId: user.id,
      phoneNumber: "+573007778899",
      body: "Don't forget — your dentist appointment is tomorrow at 3 PM. Reply 1 to confirm.",
      timezone: "America/Bogota",
      scheduledTime: "14:00",
      recurrenceType: "ONCE",
      status: "ACTIVE",
      isActive: true,
      nextRunAt: days(1),
      totalExecutions: 0,
      recurrenceRule: {
        create: {
          type: "ONCE",
          startsAt: days(1),
          maxOccurrences: 1,
          occurrenceCount: 0,
        },
      },
    },
  });

  console.log("✓ ONCE message (ACTIVE, fires tomorrow)");

  // 6. ONCE — cancelled before it fired
  const cancelled = await db.scheduledMessage.create({
    data: {
      userId: user.id,
      phoneNumber: "+573002223344",
      body: "Your subscription renewal is due in 3 days.",
      timezone: "America/Bogota",
      scheduledTime: "11:00",
      recurrenceType: "ONCE",
      status: "CANCELLED",
      isActive: false,
      nextRunAt: null,
      totalExecutions: 0,
      recurrenceRule: {
        create: {
          type: "ONCE",
          startsAt: days(3),
          maxOccurrences: 1,
          occurrenceCount: 0,
        },
      },
    },
  });

  console.log("✓ ONCE message (CANCELLED)");

  console.log("\nSeed complete.");
  console.log(`  ${[once, daily, weekly, monthly, upcoming, cancelled].length} scheduled messages`);
  console.log(`  Login: ${email} / ${plainPassword}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
