"use client"

import { useState, useEffect, useCallback } from "react"
import type { GameProgress, Badge } from "@/types/career-types"

const STORAGE_KEY = "career-explorer-progress"

const AVAILABLE_BADGES: Omit<Badge, "unlockedAt">[] = [
  {
    id: "first-step",
    name: "First Steps",
    description: "Started your career journey",
    icon: "🌱",
  },
  {
    id: "explorer",
    name: "Explorer",
    description: "Explored 5 different career paths",
    icon: "🗺️",
  },
  {
    id: "resource-collector",
    name: "Resource Collector",
    description: "Saved 10 resources",
    icon: "📚",
  },
  {
    id: "path-master",
    name: "Path Master",
    description: "Reached level 5 in your career tree",
    icon: "🏆",
  },
  {
    id: "knowledge-seeker",
    name: "Knowledge Seeker",
    description: "Completed 3 quizzes",
    icon: "🧠",
  },
  {
    id: "persistent-learner",
    name: "Persistent Learner",
    description: "Used the app for 3 different sessions",
    icon: "⭐",
  },
]

export function useGameProgress() {
  const [progress, setProgress] = useState<GameProgress>({
    level: 1,
    xp: 0,
    badges: [],
    exploredPaths: 0,
    completedQuizzes: 0,
  })

  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Badge[]>([])

  // Load progress from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setProgress({
          level: parsed.level || 1,
          xp: parsed.xp || 0,
          badges: parsed.badges || [],
          exploredPaths: parsed.exploredPaths || 0,
          completedQuizzes: parsed.completedQuizzes || 0,
        })
      }
    } catch (error) {
      console.error("Failed to load game progress:", error)
    }
  }, [])

  // Save progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch (error) {
      console.error("Failed to save game progress:", error)
    }
  }, [progress])

  // Calculate level from XP
  const calculateLevel = (xp: number): number => {
    return Math.floor(xp / 100) + 1
  }

  // Check for new badges
  const checkForNewBadges = useCallback((newProgress: GameProgress) => {
    const newBadges: Badge[] = []

    AVAILABLE_BADGES.forEach((badgeTemplate) => {
      const alreadyHas = newProgress.badges.some((b) => b.id === badgeTemplate.id)
      if (alreadyHas) return

      let shouldUnlock = false

      switch (badgeTemplate.id) {
        case "first-step":
          shouldUnlock = newProgress.exploredPaths >= 1
          break
        case "explorer":
          shouldUnlock = newProgress.exploredPaths >= 5
          break
        case "resource-collector":
          shouldUnlock = newProgress.xp >= 200 // Assuming 20 XP per saved resource
          break
        case "path-master":
          shouldUnlock = newProgress.level >= 5
          break
        case "knowledge-seeker":
          shouldUnlock = newProgress.completedQuizzes >= 3
          break
        case "persistent-learner":
          shouldUnlock = newProgress.exploredPaths >= 10
          break
      }

      if (shouldUnlock) {
        const newBadge: Badge = {
          ...badgeTemplate,
          unlockedAt: new Date(),
        }
        newBadges.push(newBadge)
      }
    })

    if (newBadges.length > 0) {
      setRecentlyUnlocked(newBadges)
      setTimeout(() => setRecentlyUnlocked([]), 5000) // Clear after 5 seconds
    }

    return newBadges
  }, [])

  // Add XP and check for level ups and badges
  const addXP = useCallback(
    (amount: number, reason?: string) => {
      setProgress((prev) => {
        const newXP = prev.xp + amount
        const newLevel = calculateLevel(newXP)
        const leveledUp = newLevel > prev.level

        const newProgress = {
          ...prev,
          xp: newXP,
          level: newLevel,
        }

        const newBadges = checkForNewBadges(newProgress)

        return {
          ...newProgress,
          badges: [...prev.badges, ...newBadges],
        }
      })

      // Show XP gain animation
      if (typeof window !== "undefined") {
        const event = new CustomEvent("xpGain", {
          detail: { amount, reason },
        })
        window.dispatchEvent(event)
      }
    },
    [checkForNewBadges],
  )

  // Track specific actions
  const trackPathExplored = useCallback(() => {
    setProgress((prev) => {
      const newProgress = {
        ...prev,
        exploredPaths: prev.exploredPaths + 1,
      }

      const newBadges = checkForNewBadges(newProgress)

      return {
        ...newProgress,
        badges: [...prev.badges, ...newBadges],
      }
    })
    addXP(25, "Explored new path")
  }, [addXP, checkForNewBadges])

  const trackResourceSaved = useCallback(() => {
    addXP(10, "Saved resource")
  }, [addXP])

  const trackQuizCompleted = useCallback(() => {
    setProgress((prev) => {
      const newProgress = {
        ...prev,
        completedQuizzes: prev.completedQuizzes + 1,
      }

      const newBadges = checkForNewBadges(newProgress)

      return {
        ...newProgress,
        badges: [...prev.badges, ...newBadges],
      }
    })
    addXP(50, "Completed quiz")
  }, [addXP, checkForNewBadges])

  const getXPToNextLevel = useCallback(() => {
    const currentLevelXP = (progress.level - 1) * 100
    const nextLevelXP = progress.level * 100
    return nextLevelXP - progress.xp
  }, [progress])

  const getProgressToNextLevel = useCallback(() => {
    const currentLevelXP = (progress.level - 1) * 100
    const nextLevelXP = progress.level * 100
    const progressInLevel = progress.xp - currentLevelXP
    return (progressInLevel / 100) * 100
  }, [progress])

  return {
    progress,
    recentlyUnlocked,
    addXP,
    trackPathExplored,
    trackResourceSaved,
    trackQuizCompleted,
    getXPToNextLevel,
    getProgressToNextLevel,
  }
}
