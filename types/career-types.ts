// /types/career-types.ts
export type Resource = {
  id: string
  title: string
  description: string
  type: 'course' | 'video' | 'website' | 'tool'
  url?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  duration?: string
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
