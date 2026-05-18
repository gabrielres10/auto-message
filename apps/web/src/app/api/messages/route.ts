import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { messageQueue } from "@/lib/queue";
import type { CreateMessageInput } from "@auto-message/shared";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: add cursor-based pagination
  const messages = await db.scheduledMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: replace with zod validation
  const body = (await request.json()) as CreateMessageInput;
  const { recipient, content, scheduledAt } = body;

  if (!recipient || !content || !scheduledAt) {
    return NextResponse.json(
      { error: "recipient, content, and scheduledAt are required" },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduledAt);

  const message = await db.scheduledMessage.create({
    data: {
      userId: session.user.id,
      recipient,
      content,
      scheduledAt: scheduledDate,
    },
  });

  const delay = scheduledDate.getTime() - Date.now();
  const job = await messageQueue.add(
    "send-message",
    { messageId: message.id, recipient, content, scheduledAt },
    { delay: Math.max(0, delay) }
  );

  await db.scheduledMessage.update({
    where: { id: message.id },
    data: { jobId: job.id },
  });

  return NextResponse.json(message, { status: 201 });
}
