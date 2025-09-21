// /types/career-types.ts
export type Resource = {
  id: string
  title: string
  tags:string
  description: string
  type: 'course' | 'video' | 'website' | 'tool' | 'thread' | 'paper'
  url?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  duration?: string
  source?: 'gemini' | 'reddit' | 'reddit-sub' | 'site'
}

export type PathNode = {
  id: string
  title: string
  description: string
  options: string[]
  resources: Resource[]
  level: number
  parentId?: string
}

export type UserProfile = {
  id: string
  currentSituation: string
  interests: string[]
  experience?: string
  goals?: string
}
