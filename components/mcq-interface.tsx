"use client"

import { useState } from "react"
import type { PathNode } from "@/types/career-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Plus, Leaf, Sprout } from "lucide-react"
import { generateNextOptions } from "@/lib/career-logic"
import { cn } from "@/lib/utils"

interface MCQInterfaceProps {
  node: PathNode
  onSelection: (option: string, customInput?: string) => void
  isGenerating?: boolean
}

export function MCQInterface({ node, onSelection, isGenerating = false }: MCQInterfaceProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // Generate options if not already present
  const options = node.options.length > 0 ? node.options : generateNextOptions(node)

  const handleOptionSelect = (option: string) => {
    if (isGenerating) return
    setSelectedOption(option)
  }

  const handleConfirmSelection = () => {
    if (selectedOption && !isGenerating) {
      onSelection(selectedOption)
      setSelectedOption(null)
    }
  }

  const handleCustomSubmit = () => {
    if (customInput.trim() && !isGenerating) {
      onSelection("Custom Path", customInput.trim())
      setCustomInput("")
      setShowCustomInput(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-green-50/80 to-green-100/50 border-green-200 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-green-900">
          <Leaf className="w-5 h-5 text-green-600" />
          Choose Your Next Branch
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            {node.title}
          </Badge>
          <ArrowRight className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">Growing...</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-green-700/80">{node.description}</p>

        {isGenerating ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <Sprout className="w-5 h-5 text-green-600 animate-spin" />
                <span className="text-green-700">AI is growing new possibilities for you...</span>
              </div>
            </div>
            {/* Show skeleton options */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-green-100/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {options.map((option, index) => (
              <Button
                key={index}
                variant={selectedOption === option ? "default" : "outline"}
                className={cn(
                  "w-full justify-start text-left h-auto p-4 transition-all duration-200",
                  "bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-900",
                  "hover:from-green-100 hover:to-green-150 hover:border-green-300 hover:shadow-md",
                  selectedOption === option &&
                    "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600 shadow-lg",
                )}
                onClick={() => handleOptionSelect(option)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      selectedOption === option ? "bg-white" : "bg-green-400",
                    )}
                  />
                  <div className="font-medium">{option}</div>
                </div>
              </Button>
            ))}

            {!showCustomInput ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-green-700 hover:bg-green-100 hover:text-green-800"
                onClick={() => setShowCustomInput(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Plant your own seed (custom path)
              </Button>
            ) : (
              <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <label className="text-sm font-medium text-green-800">Describe your custom path:</label>
                <Input
                  placeholder="e.g., Start a YouTube channel about my interests..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                  className="bg-white border-green-300 focus:border-green-500"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCustomSubmit} className="bg-green-600 hover:bg-green-700">
                    <Sprout className="w-3 h-3 mr-1" />
                    Plant This Seed
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowCustomInput(false)}
                    className="text-green-700 hover:bg-green-100"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedOption && !isGenerating && (
          <Button
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
            onClick={handleConfirmSelection}
          >
            <Leaf className="w-4 h-4 mr-2" />
            Grow this branch: "{selectedOption}"
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
