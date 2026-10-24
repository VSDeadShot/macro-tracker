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

  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secretKey) {
    console.error("Keep-alive misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json({ ok: false, error: "Keep-alive misconfigured" }, { status: 500 });
  }

  const [db, rest] = await Promise.all([readDatabase(), readViaRestApi(secretKey)]);

  // Both must succeed: the Prisma read goes through the pooler, which Supabase may not
  // count as project activity, so the PostgREST read is the one that keeps it awake
  if (db === "failed" || rest === "failed") {
    return NextResponse.json({ ok: false, db, rest }, { status: 500 });
  }

  return NextResponse.json({ ok: true, db, rest });
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

async function readViaRestApi(secretKey: string): Promise<CheckResult> {
  try {
    // New-style sb_secret_ keys go in the apikey header only (no Authorization: Bearer)
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/DailyTarget?select=id&limit=1`, {
      headers: { apikey: secretKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`Keep-alive PostgREST read failed: HTTP ${res.status}`);
      return "failed";
    }

    return "ok";
  } catch (error) {
    // Log only the error name, never the error itself, so the key or request headers can't end up in logs
    console.error("Keep-alive PostgREST read failed:", error instanceof Error ? error.name : "unknown error");
    return "failed";
  }
}
