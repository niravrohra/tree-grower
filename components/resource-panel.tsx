"use client"

import type { Resource } from "@/types/career-types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, BookOpen, Video, Globe, Wrench, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResourcePanelProps {
  resources: Resource[]
}

export function ResourcePanel({ resources }: ResourcePanelProps) {
  const getResourceIcon = (type: Resource["type"]) => {
    switch (type) {
      case "course":
        return <BookOpen className="w-4 h-4" />
      case "video":
        return <Video className="w-4 h-4" />
      case "website":
        return <Globe className="w-4 h-4" />
      case "tool":
        return <Wrench className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const getDifficultyColor = (difficulty?: Resource["difficulty"]) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-300"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "advanced":
        return "bg-orange-100 text-orange-800 border-orange-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {resources.map((resource, index) => (
        <Card
          key={resource.id}
          className={cn(
            "p-4 transition-all duration-200 hover:shadow-md",
            "bg-gradient-to-br from-green-50/80 to-green-100/40 border-green-200",
            "hover:from-green-100/80 hover:to-green-150/40 hover:border-green-300",
          )}
        >
          <CardContent className="p-0">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-green-700">
                  {getResourceIcon(resource.type)}
                  <Leaf className="w-3 h-3 text-green-500" />
                </div>
                {resource.url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className="text-green-600 hover:text-green-700 hover:bg-green-100"
                  >
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-green-900 text-balance">{resource.title}</h4>
                <p className="text-xs text-green-700/80 text-pretty leading-relaxed">{resource.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs bg-green-200 text-green-800 border-green-300">
                  {resource.type}
                </Badge>
                {resource.difficulty && (
                  <Badge className={`text-xs ${getDifficultyColor(resource.difficulty)}`} variant="secondary">
                    {resource.difficulty}
                  </Badge>
                )}
                {resource.duration && (
                  <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                    {resource.duration}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
