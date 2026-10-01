import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { parseMealInput } from "@/lib/meal-input";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseMealInput(await req.json());

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const meal = await prisma.meal.create({
      data: {
        user_id: user.id,
        ...parsed.value,
      },
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error("Error saving meal:", error);
    return NextResponse.json({ error: "Failed to save meal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing meal ID" }, { status: 400 });
    }

    // Only allow deleting meals that belong to the authenticated user
    await prisma.meal.delete({
      where: {
        id,
        user_id: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal:", error);
    return NextResponse.json({ error: "Failed to delete meal" }, { status: 500 });
  }
}
