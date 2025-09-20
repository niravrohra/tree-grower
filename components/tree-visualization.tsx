"use client"

import type { PathNode } from "@/types/career-types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TreePine, Leaf, Sprout } from "lucide-react"

interface TreeVisualizationProps {
  pathHistory: PathNode[]
  activePaths: PathNode[]
  currentNode: PathNode | null
  onNodeClick: (nodeId: string) => void
  isGenerating?: boolean
}

export function TreeVisualization({
  pathHistory,
  activePaths,
  currentNode,
  onNodeClick,
  isGenerating = false,
}: TreeVisualizationProps) {
  const maxLevel = Math.max(...pathHistory.map((node) => node.level), 0)

  return (
    <div className="relative min-h-[600px] p-8 bg-gradient-to-b from-green-50/30 to-green-100/20 rounded-2xl overflow-auto">
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-16 bg-gradient-to-t from-amber-800 to-amber-700 rounded-t-lg" />

      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
        <div className="w-16 h-4 bg-gradient-to-r from-transparent via-amber-700 to-transparent opacity-60 rounded-full" />
        <div className="w-24 h-2 bg-gradient-to-r from-transparent via-amber-600 to-transparent opacity-40 rounded-full mt-1" />
      </div>

      <div className="relative pt-8">
        {Array.from({ length: maxLevel + 1 }, (_, level) => {
          const nodesAtLevel = pathHistory.filter((node) => node.level === level)
          const isRoot = level === 0
          const spacing = Math.max(200, 300 - level * 30) // Nodes get closer as tree grows

          return (
            <div
              key={level}
              className={cn(
                "flex items-center justify-center mb-12 relative",
                level > 0 && "animate-in slide-in-from-bottom-4 duration-500",
              )}
              style={{
                marginBottom: `${Math.max(48, 80 - level * 8)}px`,
              }}
            >
              {level > 0 && (
                <svg
                  className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none"
                  width="400"
                  height="48"
                  viewBox="0 0 400 48"
                >
                  {nodesAtLevel.map((node, index) => {
                    const totalNodes = nodesAtLevel.length
                    const centerX = 200
                    const nodeX = centerX + (index - (totalNodes - 1) / 2) * spacing

                    return (
                      <path
                        key={node.id}
                        d={`M ${centerX} 0 Q ${(centerX + nodeX) / 2} 24 ${nodeX} 48`}
                        stroke="oklch(0.4 0.1 120)"
                        strokeWidth="3"
                        fill="none"
                        className="tree-branch opacity-80"
                      />
                    )
                  })}
                </svg>
              )}

              <div className="flex items-center gap-6 flex-wrap justify-center" style={{ gap: `${spacing / 4}px` }}>
                {nodesAtLevel.map((node, index) => (
                  <div key={node.id} className="relative tree-node">
                    <Card
                      className={cn(
                        "p-4 cursor-pointer transition-all duration-300 hover:shadow-lg min-w-[180px] max-w-[240px]",
                        "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
                        "hover:from-green-100 hover:to-green-150 hover:border-green-300",
                        currentNode?.id === node.id &&
                          "ring-2 ring-green-500 bg-gradient-to-br from-green-100 to-green-200",
                        activePaths.some((p) => p.id === node.id) &&
                          "border-emerald-400 shadow-emerald-200/50 shadow-lg",
                        isRoot && "bg-gradient-to-br from-amber-50 to-green-50 border-amber-200",
                      )}
                      onClick={() => onNodeClick(node.id)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isRoot ? (
                              <Sprout className="w-4 h-4 text-green-600" />
                            ) : level === 1 ? (
                              <TreePine className="w-4 h-4 text-green-700" />
                            ) : (
                              <Leaf className="w-4 h-4 text-green-600 tree-leaf" />
                            )}
                            <Badge
                              variant={currentNode?.id === node.id ? "default" : "secondary"}
                              className={cn("text-xs", isRoot && "bg-amber-100 text-amber-800 border-amber-300")}
                            >
                              {isRoot ? "Seed" : `Branch ${node.level}`}
                            </Badge>
                          </div>
                          {activePaths.some((p) => p.id === node.id) && (
                            <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-700">
                              Growing
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-balance text-green-900">{node.title}</h3>
                        <p className="text-xs text-green-700/80 text-pretty">{node.description}</p>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-full border border-green-200">
              <Sprout className="w-4 h-4 text-green-600 animate-spin" />
              <span className="text-sm text-green-700">Growing new branches...</span>
            </div>
          </div>
        )}

        {pathHistory.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-64 text-green-600">
            <TreePine className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-center">Your career tree will grow here as you explore your path</p>
          </div>
        )}
      </div>
    </div>
  )
}
