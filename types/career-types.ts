export interface UserProfile {
  id: string
  currentSituation: string
  interests: string[]
  experience: string
  goals: string
}

export interface PathNode {
  id: string
  title: string
  description: string
  options: string[]
  resources: Resource[]
  level: number
  parentId?: string
}

export interface Resource {
  id: string
  title: string
  description: string
  type: "course" | "article" | "video" | "book" | "website" | "tool"
  url?: string
  difficulty?: "beginner" | "intermediate" | "advanced"
  duration?: string
}

export interface CareerPath {
  id: string
  nodes: PathNode[]
  isActive: boolean
  completionPercentage: number
}
