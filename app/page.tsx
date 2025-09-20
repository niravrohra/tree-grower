"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TreeVisualization } from "@/components/tree-visualization"
import { MCQInterface } from "@/components/mcq-interface"
import { ResourcePanel } from "@/components/resource-panel"
import type { UserProfile, PathNode, Resource } from "@/types/career-types"
import { generateInitialSuggestions } from "@/lib/career-logic"
import { TreePine, Sprout, BookOpen } from "lucide-react"
import { useEffect } from "react"
export default function CareerPathExplorer() {
  const [step, setStep] = useState<"profile" | "exploration">("profile")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [currentNode, setCurrentNode] = useState<PathNode | null>(null)
  const [pathHistory, setPathHistory] = useState<PathNode[]>([])
  const [activePaths, setActivePaths] = useState<PathNode[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
const [resources, setResources] = useState<Resource[]>([])
const [resourcesLoading, setResourcesLoading] = useState(false)
const [resourcesError, setResourcesError] = useState<string | null>(null)


useEffect(() => {
  if (!currentNode) {
    setResources([])
    return
  }

  const q = `${currentNode.title} ${currentNode.description}`.trim()
  if (!q) return

  const ac = new AbortController()
  const t = setTimeout(() => {
    setResourcesLoading(true)
    setResourcesError(null)

    fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
      signal: ac.signal,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          // Prefer server-provided details
          const upstreamMsg =
            typeof data?.upstream === "object"
              ? (data.upstream.error?.message ||
                 data.upstream.message ||
                 JSON.stringify(data.upstream))
              : undefined
          const msg = data?.error || upstreamMsg || `Failed to fetch resources (${r.status})`
          throw new Error(msg)
        }
        return data
      })
      .then((data) => setResources(Array.isArray(data.resources) ? data.resources : []))
      .catch((err) => {
        if (err.name !== "AbortError") setResourcesError(err.message)
      })
      .finally(() => setResourcesLoading(false))
  }, 300)

  return () => {
    clearTimeout(t)
    ac.abort()
  }
}, [currentNode])


  const handleProfileSubmit = async (profile: UserProfile) => {
    setUserProfile(profile)
    setIsGenerating(true)

    try {
      const initialNode = await generateInitialSuggestions(profile)
      setCurrentNode(initialNode)
      setPathHistory([initialNode])
      setStep("exploration")
    } catch (error) {
      console.error("Error generating initial suggestions:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleNodeSelection = async (selectedOption: string, customInput?: string) => {
    if (!currentNode || !userProfile) return

    setIsGenerating(true)

    try {
      const nextNode: PathNode = {
        id: `${currentNode.id}-${Date.now()}`,
        title: customInput || selectedOption,
        description: `Exploring ${customInput || selectedOption}`,
        options: [], // Will be populated by AI
        resources: [],
        level: currentNode.level + 1,
        parentId: currentNode.id,
      }

      // Generate AI suggestions for the next node
      const { generateNodeSuggestions } = await import("@/lib/career-logic")
      const updatedNode = await generateNodeSuggestions(nextNode, userProfile, pathHistory)

      // Add to active paths if it's a significant milestone
      if (updatedNode.level % 2 === 0) {
        setActivePaths((prev) => [...prev, updatedNode])
      }

      setCurrentNode(updatedNode)
      setPathHistory((prev) => [...prev, updatedNode])
    } catch (error) {
      console.error("Error generating node suggestions:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBacktrack = (nodeId: string) => {
    const nodeIndex = pathHistory.findIndex((node) => node.id === nodeId)
    if (nodeIndex !== -1) {
      const newHistory = pathHistory.slice(0, nodeIndex + 1)
      setPathHistory(newHistory)
      setCurrentNode(newHistory[newHistory.length - 1])
    }
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <TreePine className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Career Growth Tree</span>
            </div>
            <h1 className="text-4xl font-bold text-balance mb-4">Grow Your Career Path</h1>
            <p className="text-lg text-muted-foreground text-pretty">
              Plant the seeds of your future. Tell us about yourself and watch your career possibilities branch out like
              a living tree.
            </p>
          </div>

          <ProfileForm onSubmit={handleProfileSubmit} isLoading={isGenerating} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* LEFT side: tree + MCQ */}
  <div className="lg:col-span-2 flex flex-col items-center space-y-6">
    {/* Header */}
    <div className="text-center py-4">
      <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-2">
        <Sprout className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">Growing Your Path</span>
      </div>
      <h2 className="text-2xl font-bold">Your Career Growth Tree</h2>
    </div>

    {/* Tree */}
    <div className="w-full max-w-6xl">
      <TreeVisualization
        pathHistory={pathHistory}
        activePaths={activePaths}
        currentNode={currentNode}
        onNodeClick={handleBacktrack}
        isGenerating={isGenerating}
      />
    </div>

    {/* MCQ */}
    {currentNode && (
      <div className="w-full max-w-2xl">
        <MCQInterface
          node={currentNode}
          onSelection={handleNodeSelection}
          isGenerating={isGenerating}
        />
      </div>
    )}
  </div>

  {/* RIGHT side: resources */}
  <aside className="lg:col-span-1">
    <div className="sticky top-20">
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resourcesLoading && (
            <p className="text-sm text-muted-foreground">Asking Gemini for resources…</p>
          )}
          {resourcesError && (
            <p className="text-sm text-red-600">Error: {resourcesError}</p>
          )}
          {!resourcesLoading && !resourcesError && resources.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Select a step to see curated resources.
            </p>
          )}
          {resources.length > 0 && <ResourcePanel resources={resources} />}
        </CardContent>
      </Card>
    </div>
  </aside>
</div>

      </div>
    </div>
  )
}

function ProfileForm({ onSubmit, isLoading }: { onSubmit: (profile: UserProfile) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    currentSituation: "",
    interests: "",
    experience: "",
    goals: "",
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isAutofilling, setIsAutofilling] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      id: Date.now().toString(),
      currentSituation: formData.currentSituation,
      interests: formData.interests.split(",").map((i) => i.trim()),
      experience: formData.experience,
      goals: formData.goals,
    })
  }

  const handleAutofill = async () => {
    if (!resumeFile) return
    setIsAutofilling(true)
    try {
      const data = new FormData()
      data.append("resume", resumeFile)
      const res = await fetch("/api/career/extract", { method: "POST", body: data })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || "Autofill failed")

      setFormData({
        currentSituation: json.currentSituation || "",
        interests: Array.isArray(json.interests) ? json.interests.join(", ") : "",
        experience: json.experience || "",
        goals: json.goals || "",
      })
    } catch (err) {
      console.error(err)
      alert("Could not autofill from resume.")
    } finally {
      setIsAutofilling(false)
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" />
          Plant Your Career Seed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume upload */}
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium">Resume (PDF/DOCX/TXT)</label>
            <Input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAutofill}
                disabled={!resumeFile || isAutofilling}
              >
                {isAutofilling ? "Autofilling..." : "Autofill from Resume"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a resume to pre-fill your info. You can still edit before submitting.
            </p>
          </div>

          {/* Current Situation */}
          <div>
            <label className="block text-sm font-medium mb-2">Current Situation</label>
            <Input
              placeholder="e.g., High school student, College graduate, Career changer..."
              value={formData.currentSituation}
              onChange={(e) => setFormData((prev) => ({ ...prev, currentSituation: e.target.value }))}
              required
            />
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium mb-2">Interests & Hobbies</label>
            <Input
              placeholder="e.g., Soccer, Mechanical engineering, Art, Technology..."
              value={formData.interests}
              onChange={(e) => setFormData((prev) => ({ ...prev, interests: e.target.value }))}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Separate multiple interests with commas</p>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium mb-2">Experience & Skills</label>
            <Textarea
              placeholder="Tell us about your experience, skills, achievements, or anything relevant..."
              value={formData.experience}
              onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-medium mb-2">Goals & Aspirations</label>
            <Textarea
              placeholder="What do you hope to achieve? What kind of impact do you want to make?"
              value={formData.goals}
              onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading || isAutofilling}>
            {isLoading ? (
              <>
                <Sprout className="w-4 h-4 mr-2 animate-spin" />
                Growing Your Tree...
              </>
            ) : (
              <>
                <TreePine className="w-4 h-4 mr-2" />
                Start Growing Your Career Tree
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
