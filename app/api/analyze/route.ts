import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST() {
  return NextResponse.json(
    { message: "Automatic analysis flow disabled." },
    { status: 410 }
  );
}