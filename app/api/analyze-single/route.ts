import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Endpoint disabled. Use Telegram bot instead." },
    { status: 410 }
  );
}