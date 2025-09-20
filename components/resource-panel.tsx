"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import type { Resource } from "@/types/career-types"

export function ResourcePanel({ resources }: { resources: Resource[] }) {
  if (!resources?.length) return null

  return (
    <div className="space-y-3">
      {resources.map((r) => (
        <Card key={r.id} className="hover:bg-muted/40 transition-colors">
          <CardContent className="p-4">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="group block">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium leading-snug group-hover:underline">
                    {r.title || r.url}
                  </div>
                  {r.description && (
                    <div className="text-xs text-muted-foreground line-clamp-3">
                      {r.description}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{r.source ?? "gemini"}</Badge>
                    {r.type && <Badge variant="secondary">{r.type}</Badge>}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
              </div>
            </a>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
