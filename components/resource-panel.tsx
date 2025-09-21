"use client"

import { useState, useEffect } from "react"
import type { Resource } from "@/types/career-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePersistentResources } from "@/hooks/use-persistent-resources"
import { Input } from "@/components/ui/input"
import {
  BookOpen,
  Video as VideoIcon,
  GraduationCap,
  Wrench,
  FileText,
  MessageSquareText,
  ExternalLink,
  Clock,
  Star,
  Bookmark,
  TrendingUp,
  Filter,
  Search,
} from "lucide-react"

/** Make the filter’s type align with your Resource["type"] plus "all" */
type ResourceType = Resource["type"]
type FilterType = "all" | ResourceType

interface ResourcePanelProps {
  resources: Resource[]
  currentNodeId?: string
}

/** Icons for known resource types */
const getResourceIcon = (type: Resource["type"]) => {
  switch (type) {
    case "course":
      return GraduationCap
    case "video":
      return VideoIcon
    case "website":
      return BookOpen
    case "tool":
      return Wrench
    case "thread":
      return MessageSquareText
    case "paper":
      return FileText
    default:
      return BookOpen
  }
}

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800 border-green-200"
    case "intermediate":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "advanced":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

/** Coerce tags into a string[] no matter what shape they come in */
function coerceTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === "string" && t.trim() !== "")
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return []
}

export function ResourcePanel({ resources, currentNodeId }: ResourcePanelProps) {
  const {
    savedResources,
    toggleSaveResource,
    saveResourcesForNode,
    getSavedResources,
    getResourceStats,
  } = usePersistentResources()

  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [activeTab, setActiveTab] = useState<"current" | "saved">("current")

  useEffect(() => {
    if (currentNodeId && resources.length > 0) {
      saveResourcesForNode(currentNodeId, resources)
    }
  }, [currentNodeId, resources, saveResourcesForNode])

  const savedResourcesList = getSavedResources()
  const stats = getResourceStats()

  const filterResources = (resourceList: Resource[]) => {
    return resourceList.filter((resource) => {
      const tags = coerceTags(resource.tags)
      const matchesSearch =
        searchTerm === "" ||
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (resource.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = filterType === "all" || resource.type === filterType
      return matchesSearch && matchesType
    })
  }

  const filteredCurrentResources = filterResources(resources)
  const filteredSavedResources = filterResources(savedResourcesList)

  const ResourceCard = ({
    resource,
    showNodeInfo = false, // kept for future usage
  }: {
    resource: Resource
    showNodeInfo?: boolean
  }) => {
    const IconComponent = getResourceIcon(resource.type)
    const isSaved = savedResources.has(resource.id)
    const tags = coerceTags(resource.tags)

    return (
      <Card className="bg-white border-emerald-100 hover:border-emerald-200 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <IconComponent className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <CardTitle className="text-sm font-semibold text-emerald-800 line-clamp-2">
                {resource.title}
              </CardTitle>
            </div>
            <Button
              aria-label={isSaved ? "Unsave resource" : "Save resource"}
              variant="ghost"
              size="sm"
              onClick={() => toggleSaveResource(resource)}
              className={`p-1 h-auto transition-colors ${
                isSaved ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-yellow-500"
              }`}
            >
              <Star className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {resource.description && (
            <p className="text-xs text-emerald-600 line-clamp-2">{resource.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {resource.difficulty && (
              <Badge variant="outline" className={`text-xs ${getDifficultyColor(resource.difficulty)}`}>
                {resource.difficulty}
              </Badge>
            )}
            {resource.duration && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="w-3 h-3 mr-1" />
                {resource.duration}
              </Badge>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag: string, index: number) => (
                <Badge
                  key={`${resource.id}-${index}-${tag}`}
                  variant="secondary"
                  className="text-xs bg-emerald-50 text-emerald-700"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50 bg-transparent"
            onClick={() => window.open(resource.url, "_blank")}
          >
            <span className="text-xs">Explore Resource</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (resources.length === 0 && savedResourcesList.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
        <p className="text-emerald-600 font-medium">No resources yet</p>
        <p className="text-emerald-500 text-sm">Explore career paths to discover curated resources</p>
      </div>
    )
  }

  /** Keep filter options aligned with Resource["type"] */
  const FILTER_OPTIONS: FilterType[] = [
    "all",
    "course",
    "video",
    "website",
    "tool",
    "thread",
    "paper",
  ]

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-700">{stats.savedCount}</div>
              <div className="text-xs text-emerald-600">Saved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-700">{stats.totalResources}</div>
              <div className="text-xs text-teal-600">Discovered</div>
            </div>
          </div>
          {stats.totalResources > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs text-emerald-600 mb-1">
                <TrendingUp className="w-3 h-3" />
                Progress: {Math.round(stats.completionRate)}%
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-500" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-emerald-200 focus:border-emerald-400"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              className={`text-xs ${
                filterType === type
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Filter className="w-3 h-3 mr-1" />
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "current" | "saved")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-emerald-50">
          <TabsTrigger value="current" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BookOpen className="w-4 h-4 mr-2" />
            Current ({filteredCurrentResources.length})
          </TabsTrigger>
          <TabsTrigger value="saved" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Bookmark className="w-4 h-4 mr-2" />
            Saved ({filteredSavedResources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {filteredCurrentResources.length > 0 ? (
                filteredCurrentResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-emerald-600 text-sm">
                    {searchTerm || filterType !== "all"
                      ? "No resources match your filters"
                      : "No resources for this step yet"}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {filteredSavedResources.length > 0 ? (
                filteredSavedResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} showNodeInfo />
                ))
              ) : (
                <div className="text-center py-8">
                  <Star className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-emerald-600 text-sm">
                    {searchTerm || filterType !== "all"
                      ? "No saved resources match your filters"
                      : "No saved resources yet"}
                  </p>
                  <p className="text-emerald-500 text-xs mt-1">Click the star icon to save resources for later</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
