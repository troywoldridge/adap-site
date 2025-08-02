// simple logging endpoint; later persist to DB or forward to analytics service
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const payload = await req.json();
    console.log("Hero analytics event:", payload); // swap for real ingestion
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
};
