// lib/resume/extract-llm.ts
import { z } from "zod"
import { GoogleGenerativeAI } from "@google/generative-ai"

const UserProfileSchema = z.object({
  currentSituation: z.string().default(""),
  interests: z.array(z.string()).default([]),
  experience: z.string().default(""),
  goals: z.string().default(""),
})

export type ExtractedProfile = z.infer<typeof UserProfileSchema>

function stripFences(s: string) {
  return s.replace(/```json|```/g, "").trim()
}

export async function extractProfileFromText(resumeText: string): Promise<ExtractedProfile> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY")

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  const prompt = `
You are an information extractor. From the RESUME TEXT below, return a STRICT JSON object with exactly these keys:
- "currentSituation": a short phrase like "High school student", "College sophomore", or "Software Engineer".
- "interests": an array of short strings (interests/hobbies/domains); can be empty if not present.
- "experience": 1–3 sentence summary of experience/skills (concise).
- "goals": 1–2 sentence summary of goals if present; else empty string.

Rules:
- Output ONLY JSON, no prose, no markdown fences.
- Do not invent details not present in the resume.

RESUME TEXT:
${resumeText}
  `.trim()

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const json = stripFences(text)

  const parsed = JSON.parse(json)
  return UserProfileSchema.parse(parsed)
}
