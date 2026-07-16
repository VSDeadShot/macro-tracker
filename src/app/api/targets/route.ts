import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create default targets for this user
    let targets = await prisma.dailyTarget.findUnique({
      where: { user_id: user.id },
    });

    if (!targets) {
      targets = await prisma.dailyTarget.create({
        data: { user_id: user.id },
      });
    }

    return NextResponse.json(targets);
  } catch (error) {
    console.error("Error fetching targets:", error);
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { target_calories, target_protein, target_carbs, target_fats } = await req.json();

    const targets = await prisma.dailyTarget.upsert({
      where: { user_id: user.id },
      update: {
        target_calories,
        target_protein,
        target_carbs,
        target_fats,
      },
      create: {
        user_id: user.id,
        target_calories,
        target_protein,
        target_carbs,
        target_fats,
      },
    });

    return NextResponse.json(targets);
  } catch (error) {
    console.error("Error updating targets:", error);
    return NextResponse.json({ error: "Failed to update targets" }, { status: 500 });
  }
}
