// app/api/resources/route.ts
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SYS_INSTRUCTIONS = `
You are a resource curator for career path exploration.
Given a user's current step (query), return the BEST mix of actionable resources:
- High-signal Reddit threads (if relevant), flagship tutorials, top courses, canonical docs, and one or two quick-start videos.
- Prefer authoritative sources over random blogs.
- Include diverse formats (docs, video, course, thread, tool, paper) when useful.
- Only include links that are likely to be accessible worldwide.

STRICT JSON OUTPUT:
{
  "resources": [
    { "title": "...", "url": "https://...", "description": "...", "type": "website|video|course|thread|paper|tool" }
  ]
}
Return max 12 items. Do NOT include commentary outside JSON.
`

function coerceArray(x: any) {
  return Array.isArray(x) ? x : []
}

function normalizeQ(raw: unknown): string {
  const q = typeof raw === "string" ? raw.trim() : ""
  return q.slice(0, 800)
}

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_API_KEY
    if (!key) {
      return NextResponse.json(
        { resources: [], error: "Missing GOOGLE_API_KEY" },
        { status: 500 }
      )
    }

    const { q: rawQ } = await req.json().catch(() => ({ q: "" }))
    const q = normalizeQ(rawQ)
    if (!q) {
      return NextResponse.json(
        { resources: [], error: "Missing 'q' in JSON body" },
        { status: 400 }
      )
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

    const body = {
      // ✅ no "role" inside systemInstruction
      systemInstruction: { parts: [{ text: SYS_INSTRUCTIONS }] },
      contents: [{ role: "user", parts: [{ text: `User step / goal:\n"${q}"\n\nNow produce the JSON exactly as specified.` }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
      },
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const raw = await resp.text()
    let json: any = null
    try { json = raw ? JSON.parse(raw) : null } catch {}

    if (!resp.ok) {
      return NextResponse.json(
        { resources: [], error: `Gemini API error: ${resp.status}`, upstream: json || raw },
        { status: resp.status }
      )
    }

    const text: string =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ??
      json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
      ""

    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      const start = text.indexOf("{")
      const end = text.lastIndexOf("}")
      parsed = start >= 0 && end >= start ? JSON.parse(text.slice(start, end + 1)) : { resources: [] }
    }

    const items = coerceArray(parsed.resources).slice(0, 12)
    const shaped = items.map((r: any, i: number) => ({
      id: `gem-${i}-${(r.url || r.title || "x").slice(0, 20)}`,
      title: String(r.title || "").trim() || (r.url || "Untitled"),
      url: String(r.url || "").trim(),
      description: r.description ? String(r.description).trim() : "",
      type: ["video", "course", "thread", "paper", "tool"].includes(r.type) ? r.type : "website",
      source: "gemini" as const,
    })).filter((x) => x.url)

    return NextResponse.json({ resources: shaped })
  } catch (err: any) {
    console.error("Gemini REST error:", err)
    return NextResponse.json(
      { resources: [], error: String(err?.message || err) },
      { status: 500 }
    )
  }
}
