import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, requireUser, StudioFailure } from "@/lib/wardrobe/server";
import { getWeather } from "@/lib/wardrobe/weather";

const city = z.string().trim().min(2).max(60);

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const parsed = city.safeParse(request.nextUrl.searchParams.get("city"));
    if (!parsed.success) throw new StudioFailure("invalid");
    return Response.json(await getWeather(parsed.data));
  } catch (e) {
    return fail(e);
  }
}

// Saves the city only after the forecast service recognises it.
export async function PUT(request: Request) {
  try {
    const { user, supabase } = await requireUser();
    const parsed = z.object({ city }).safeParse(await request.json());
    if (!parsed.success) throw new StudioFailure("invalid");
    const weather = await getWeather(parsed.data.city);
    const { error } = await supabase.from("profiles").update({ city: weather.city }).eq("id", user.id);
    if (error) throw error;
    return Response.json(weather);
  } catch (e) {
    return fail(e);
  }
}
