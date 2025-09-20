// /lib/career-logic.ts
import type { UserProfile, PathNode } from '@/types/career-types'

const callAI = async (payload: any) => {
  const res = await fetch('/api/career/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(`AI error ${res.status}: ${msg}`)
  }
  return res.json()
}

/** Build the root node from the user's initial profile */
export async function generateInitialSuggestions(profile: UserProfile): Promise<PathNode> {
  const { node } = await callAI({ kind: 'initial', profile })
  return {
    id: `root-${Date.now()}`,
    title: node.title,
    description: node.description,
    options: node.options ?? [],
    resources: node.resources ?? [],
    level: 0,
  }
}

/** Grow the next node after the user picks an option (or types a custom one) */
export async function generateNodeSuggestions(
  currentNodeDraft: PathNode,
  userProfile: UserProfile,
  pathHistory: PathNode[],
): Promise<PathNode> {
  const { node } = await callAI({
    kind: 'next',
    userProfile,
    pathHistory,
    currentNode: currentNodeDraft,
  })
  return {
    ...currentNodeDraft,
    title: node.title || currentNodeDraft.title,
    description: node.description || currentNodeDraft.description,
    options: node.options ?? [],
    resources: node.resources ?? [],
  }
}

/** Local fallback so the UI isn’t empty if AI is still loading */
export function generateNextOptions(node: PathNode): string[] {
  const t = node.title.toLowerCase()
  const base = [
    `Research ${node.title}`,
    `Take a beginner course in ${node.title}`,
    `Build a mini project related to ${node.title}`,
    `Join a community/mentor group for ${node.title}`,
  ]
  if (t.includes('startup')) base.push('Do 10 customer interviews')
  if (t.includes('mechanical')) base.push('Join robotics/maker club')
  return Array.from(new Set(base)).slice(0, 6)
}
