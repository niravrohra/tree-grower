import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ===== Input Schemas ===== */
const ProfileSchema = z.object({
  id: z.string(),
  currentSituation: z.string(),
  interests: z.array(z.string()),
  experience: z.string().optional().default(''),
  goals: z.string().optional().default(''),
})

const PathNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  options: z.array(z.string()),
  resources: z.array(z.any()),
  level: z.number(),
  parentId: z.string().optional(),
})

const InitialSchema = z.object({
  kind: z.literal('initial'),
  profile: ProfileSchema,
})

const NextNodeSchema = z.object({
  kind: z.literal('next'),
  userProfile: ProfileSchema,
  pathHistory: z.array(PathNodeSchema),
  currentNode: PathNodeSchema,
})

const RequestSchema = z.discriminatedUnion('kind', [InitialSchema, NextNodeSchema])

/** ===== Output Schema (strict, but we'll normalize first) ===== */
const OutputSchema = z.object({
  node: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    options: z.array(z.string()).default([]),
    resources: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().default(''),
      type: z.enum(['course','video','website','tool']),
      url: z.string().url().optional(),
      difficulty: z.enum(['beginner','intermediate','advanced']).optional(),
      duration: z.string().optional(),
    })).default([]),
  })
})

/** ===== Helpers ===== */
function tryParseJson<T = any>(s: string): T | null {
  try { return JSON.parse(s) } catch { return null }
}

function extractJson(text: string): any | null {
  const fence = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/)
  if (fence?.[1]) {
    const j = tryParseJson(fence[1].trim())
    if (j) return j
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const j = tryParseJson(text.slice(start, end + 1))
    if (j) return j
  }
  return null
}

function coerceToNodeShape(maybe: any): any {
  if (!maybe) return null
  if (maybe.node) return maybe
  const looksLikeNode =
    typeof maybe.title === 'string' &&
    typeof maybe.description === 'string'
  if (looksLikeNode) return { node: maybe }
  return null
}

function uid() {
  return 'r_' + Math.random().toString(36).slice(2, 10)
}

function inferTypeFromUrl(url?: string): 'course'|'video'|'website'|'tool' {
  if (!url) return 'website'
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com')) return 'video'
  if (u.includes('coursera.org') || u.includes('udemy.com') || u.includes('edx.org') || u.includes('class') || u.includes('course')) return 'course'
  if (u.includes('github.com') || u.includes('npmjs.com') || u.includes('tool')) return 'tool'
  return 'website'
}

function toStringArray(x: any): string[] {
  if (!x) return []
  if (Array.isArray(x)) return x.map(v => (typeof v === 'string' ? v : (typeof v?.label === 'string' ? v.label : JSON.stringify(v)))).filter(Boolean)
  if (typeof x === 'string') return [x]
  return []
}

type StrictResource = z.infer<typeof OutputSchema>['node']['resources'][number]

function normalizeResource(anyRes: any): StrictResource | null {
  // Accept strings ("https://...") or objects
  if (typeof anyRes === 'string') {
    const maybeUrl = anyRes.startsWith('http') ? anyRes : undefined
    return {
      id: uid(),
      title: maybeUrl ? 'Resource' : anyRes || 'Resource',
      description: '',
      type: inferTypeFromUrl(maybeUrl),
      url: maybeUrl,
    } as StrictResource
  }
  if (anyRes && typeof anyRes === 'object') {
    const url = typeof anyRes.url === 'string' ? anyRes.url : (typeof anyRes.link === 'string' ? anyRes.link : undefined)
    const title = typeof anyRes.title === 'string' ? anyRes.title
      : (typeof anyRes.name === 'string' ? anyRes.name
      : (typeof anyRes.label === 'string' ? anyRes.label
      : (url ? new URL(url).hostname.replace(/^www\./,'') : 'Resource')))
    const description = typeof anyRes.description === 'string' ? anyRes.description
      : (typeof anyRes.summary === 'string' ? anyRes.summary : '')
    const type = ((): 'course'|'video'|'website'|'tool' => {
      const raw = typeof anyRes.type === 'string' ? anyRes.type.toLowerCase() : ''
      if (raw === 'course' || raw === 'video' || raw === 'website' || raw === 'tool') return raw
      return inferTypeFromUrl(url)
    })()
    const difficulty = ((): 'beginner'|'intermediate'|'advanced'|undefined => {
      const d = typeof anyRes.difficulty === 'string' ? anyRes.difficulty.toLowerCase() : undefined
      return (d === 'beginner' || d === 'intermediate' || d === 'advanced') ? d : undefined
    })()
    const duration = typeof anyRes.duration === 'string' ? anyRes.duration : undefined
    return {
      id: typeof anyRes.id === 'string' ? anyRes.id : uid(),
      title,
      description,
      type,
      url,
      difficulty,
      duration,
    }
  }
  return null
}

function normalizeNodeJson(json: any) {
  // Accept {node:{...}} or {title, description, ...}
  const candidate = json?.node ? json.node : json

  const title = typeof candidate?.title === 'string' && candidate.title.trim() ? candidate.title.trim() : 'Next Step'
  const description = typeof candidate?.description === 'string' ? candidate.description.trim() : 'Continue exploring this path.'
  const options = toStringArray(candidate?.options).slice(0, 6)

  const rawRes = Array.isArray(candidate?.resources) ? candidate.resources : []
  const resources = rawRes
    .map(normalizeResource)
    .filter(Boolean) as StrictResource[]
  const resourcesClamped = resources.slice(0, 8)

  return { node: { title, description, options, resources: resourcesClamped } }
}

/** ===== Google REST call ===== */
async function callGeminiREST(prompt: string, system: string) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY missing')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${system}\n\n${prompt}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return String(raw)
}

/** ===== Route ===== */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RequestSchema.parse(body)

    const system = [
      'You are CareerTree, a concise career mentor.',
      'CRITICAL: Respond with pure JSON ONLY. No prose. No markdown. No code fences.',
      'Shape: { "node": { "title": string, "description": string, "options": string[], "resources": Resource[] } }',
      'Options must be specific, mutually exclusive, and actionable.',
      'Resources must be credible and leveled (beginner→advanced).',
      'Descriptions <= 2 sentences.'
    ].join(' ')

    const prompt =
      parsed.kind === 'initial'
        ? [
            `Build the ROOT node for this user profile.`,
            `Profile JSON: ${JSON.stringify(parsed.profile)}`,
            `Return JSON only: {"node":{...}}`,
          ].join('\n')
        : [
            `Grow the NEXT node given profile + path history + current node.`,
            `User Profile: ${JSON.stringify(parsed.userProfile)}`,
            `Path History: ${JSON.stringify(parsed.pathHistory)}`,
            `Current Node: ${JSON.stringify(parsed.currentNode)}`,
            `Advance one step with 3–6 specific options and up to 6 resources.`,
            `Return JSON only: {"node":{...}}`,
          ].join('\n')

    // Attempt 1 via REST
    let raw = await callGeminiREST(prompt, system)
    let json = tryParseJson(raw) ?? extractJson(raw) ?? coerceToNodeShape(tryParseJson(raw))

    // Attempt 2 (fallback, stricter)
    if (!json) {
      raw = await callGeminiREST(
        `${prompt}\n\nReturn ONLY valid JSON. If uncertain, return: {"node":{"title":"TBD","description":"TBD","options":[],"resources":[]}}`,
        system
      )
      json = tryParseJson(raw) ?? extractJson(raw) ?? coerceToNodeShape(tryParseJson(raw))
    }

    if (!json) throw new Error('Model did not return valid JSON.')

    // 🔧 Normalize whatever came back into strict shape, then validate
    const normalized = normalizeNodeJson(json)
    const out = OutputSchema.parse(normalized)

    return NextResponse.json(out, { status: 200 })
  } catch (err: any) {
    console.error('Gemini error', err)
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
