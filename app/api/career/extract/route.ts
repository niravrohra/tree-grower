// app/api/career/extract/route.ts
import { NextResponse } from "next/server"
import { extractTextFromFile } from "@/lib/resume/parse"
import { extractProfileFromText } from "@/lib/resume/extract-llm"

export const runtime = "nodejs" // pdf-parse needs Node runtime

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("resume")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 })
    }

    // Optional: size guard (e.g., 8 MB)
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 })
    }

    const text = await extractTextFromFile(file)
    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Could not read text from resume" }, { status: 422 })
    }

    const extracted = await extractProfileFromText(text)

    // Map to your existing UserProfile shape that page.tsx expects:contentReference[oaicite:0]{index=0}
    const userProfile = {
      id: Date.now().toString(),
      currentSituation: extracted.currentSituation,
      interests: extracted.interests,
      experience: extracted.experience,
      goals: extracted.goals,
    }

    return NextResponse.json(userProfile)
  } catch (err) {
    console.error("Resume extraction error:", err)
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 })
  }
}
