import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { foodName, calories, protein, carbs, fats } = await req.json();

    if (!foodName) {
      return NextResponse.json({ error: "Missing meal data" }, { status: 400 });
    }

    const meal = await prisma.meal.create({
      data: {
        user_id: "demo-user", // We will update this when we add real Auth
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
