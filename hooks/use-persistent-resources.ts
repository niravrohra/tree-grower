"use client"

import { useState, useEffect, useCallback } from "react"
import type { Resource } from "@/types/career-types"

interface ResourceCollection {
  [nodeId: string]: Resource[]
}

interface SavedResourcesState {
  savedResources: Set<string>
  resourceCollections: ResourceCollection
  resourceHistory: Resource[]
}

const STORAGE_KEY = "career-explorer-resources"

export function usePersistentResources() {
  const [state, setState] = useState<SavedResourcesState>({
    savedResources: new Set(),
    resourceCollections: {},
    resourceHistory: [],
  })

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setState({
          savedResources: new Set(parsed.savedResources || []),
          resourceCollections: parsed.resourceCollections || {},
          resourceHistory: parsed.resourceHistory || [],
        })
      }
    } catch (error) {
      console.error("Failed to load saved resources:", error)
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      const toSave = {
        savedResources: Array.from(state.savedResources),
        resourceCollections: state.resourceCollections,
        resourceHistory: state.resourceHistory,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (error) {
      console.error("Failed to save resources:", error)
    }
  }, [state])

  const saveResource = useCallback((resource: Resource) => {
    setState((prev) => ({
      ...prev,
      savedResources: new Set([...prev.savedResources, resource.id]),
      resourceHistory: prev.resourceHistory.some((r) => r.id === resource.id)
        ? prev.resourceHistory
        : [...prev.resourceHistory, resource],
    }))
  }, [])

  const unsaveResource = useCallback((resourceId: string) => {
    setState((prev) => {
      const newSaved = new Set(prev.savedResources)
      newSaved.delete(resourceId)
      return {
        ...prev,
        savedResources: newSaved,
      }
    })
  }, [])

  const toggleSaveResource = useCallback(
    (resource: Resource) => {
      if (state.savedResources.has(resource.id)) {
        unsaveResource(resource.id)
      } else {
        saveResource(resource)
      }
    },
    [state.savedResources, saveResource, unsaveResource],
  )

  const saveResourcesForNode = useCallback((nodeId: string, resources: Resource[]) => {
    setState((prev) => ({
      ...prev,
      resourceCollections: {
        ...prev.resourceCollections,
        [nodeId]: resources,
      },
      resourceHistory: [...prev.resourceHistory.filter((r) => !resources.some((nr) => nr.id === r.id)), ...resources],
    }))
  }, [])

  const getResourcesForNode = useCallback(
    (nodeId: string): Resource[] => {
      return state.resourceCollections[nodeId] || []
    },
    [state.resourceCollections],
  )

  const getSavedResources = useCallback((): Resource[] => {
    return state.resourceHistory.filter((resource) => state.savedResources.has(resource.id))
  }, [state.resourceHistory, state.savedResources])

  const clearAllResources = useCallback(() => {
    setState({
      savedResources: new Set(),
      resourceCollections: {},
      resourceHistory: [],
    })
  }, [])

  const getResourceStats = useCallback(() => {
    const totalResources = state.resourceHistory.length
    const savedCount = state.savedResources.size
    const nodeCount = Object.keys(state.resourceCollections).length

    return {
      totalResources,
      savedCount,
      nodeCount,
      completionRate: totalResources > 0 ? (savedCount / totalResources) * 100 : 0,
    }
  }, [state])

  return {
    savedResources: state.savedResources,
    resourceCollections: state.resourceCollections,
    resourceHistory: state.resourceHistory,
    saveResource,
    unsaveResource,
    toggleSaveResource,
    saveResourcesForNode,
    getResourcesForNode,
    getSavedResources,
    clearAllResources,
    getResourceStats,
  }
}
