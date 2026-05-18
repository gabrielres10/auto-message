import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { senderQueue } from "@/lib/queue";

// Next.js 15 — params is a Promise
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await db.scheduledMessage.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    include: { recurrenceRule: true, executions: { orderBy: { scheduledFor: "desc" } } },
  });

  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(message);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await db.scheduledMessage.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (message.status === "CANCELLED" || message.status === "COMPLETED") {
    return NextResponse.json(
      { error: `Cannot cancel a ${message.status.toLowerCase()} message` },
      { status: 409 },
    );
  }

  // Cancel any queued or pending executions and remove their BullMQ jobs.
  const pendingExecutions = await db.messageExecution.findMany({
    where: {
      scheduledMessageId: id,
      status: { in: ["QUEUED", "PENDING"] },
    },
    select: { id: true, jobId: true },
  });

  await Promise.all(
    pendingExecutions
      .filter((e) => e.jobId !== null)
      .map(async (e) => {
        const job = await senderQueue.getJob(e.jobId!);
        await job?.remove();
      }),
  );

  await db.messageExecution.updateMany({
    where: {
      scheduledMessageId: id,
      status: { in: ["QUEUED", "PENDING"] },
    },
    data: { status: "CANCELLED" },
  });

  await db.scheduledMessage.update({
    where: { id },
    data: { status: "CANCELLED", isActive: false, nextRunAt: null },
  });

  return new NextResponse(null, { status: 204 });
}
