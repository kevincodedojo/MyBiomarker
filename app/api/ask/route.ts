import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { askAI } from "@/lib/ai/insights";
import type { ReadingWithType } from "@/lib/types";

const body = z.object({ question: z.string().trim().min(3).max(500) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a question (3-500 characters)." }, { status: 400 });
  }

  const { data } = await supabase.from("readings").select("*, biomarker_types(*)");
  const readings = (data as ReadingWithType[]) ?? [];

  const result = await askAI(supabase, user.id, readings, parsed.data.question);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
