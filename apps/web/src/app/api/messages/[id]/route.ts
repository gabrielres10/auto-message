import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { messageQueue } from "@/lib/queue";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await db.scheduledMessage.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(message);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await db.scheduledMessage.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (message.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only PENDING messages can be cancelled" },
      { status: 409 }
    );
  }

  if (message.jobId) {
    const job = await messageQueue.getJob(message.jobId);
    await job?.remove();
  }

  await db.scheduledMessage.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return new NextResponse(null, { status: 204 });
}
