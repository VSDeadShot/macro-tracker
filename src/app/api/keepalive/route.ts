import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

type CheckResult = "ok" | "failed";

// Called daily by Vercel Cron (see vercel.json) so the free-tier Supabase project
// never sees 7 days of inactivity and auto-pauses.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [db, auth] = await Promise.all([readDatabase(), pingSupabaseAuth()]);

  // The DB read is what matters; the auth ping is best-effort extra activity
  if (db === "failed") {
    return NextResponse.json({ ok: false, db, auth }, { status: 500 });
  }

  return NextResponse.json({ ok: true, db, auth });
}

async function readDatabase(): Promise<CheckResult> {
  try {
    await prisma.dailyTarget.count();
    return "ok";
  } catch (error) {
    console.error("Keep-alive DB read failed:", error);
    return "failed";
  }
}

async function pingSupabaseAuth(): Promise<CheckResult> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Unexpected status ${res.status}`);
    }

    return "ok";
  } catch (error) {
    console.error("Keep-alive Supabase Auth ping failed:", error);
    return "failed";
  }
}
