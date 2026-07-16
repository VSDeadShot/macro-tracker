import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { foodName, calories, protein, carbs, fats } = await req.json();

    if (!foodName) {
      return NextResponse.json({ error: "Missing meal data" }, { status: 400 });
    }

    const meal = await prisma.meal.create({
      data: {
        user_id: user.id,
        food_items: foodName,
        calories,
        protein,
        carbs,
        fats,
      },
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error("Error saving meal:", error);
    return NextResponse.json({ error: "Failed to save meal" }, { status: 500 });
  }
}
