"use client"

import { useEffect, useCallback } from "react"

interface KeyboardShortcutHandlers {
  onHelp?: () => void
  onEscape?: () => void
  onSpace?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onEnter?: () => void
  onSave?: () => void
  onReset?: () => void
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key) {
        case "?":
          event.preventDefault()
          handlers.onHelp?.()
          break
        case "Escape":
          event.preventDefault()
          handlers.onEscape?.()
          break
        case " ":
          event.preventDefault()
          handlers.onSpace?.()
          break
        case "ArrowLeft":
          event.preventDefault()
          handlers.onArrowLeft?.()
          break
        case "ArrowRight":
          event.preventDefault()
          handlers.onArrowRight?.()
          break
        case "Enter":
          if (event.target === document.body) {
            event.preventDefault()
            handlers.onEnter?.()
          }
          break
        case "s":
        case "S":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handlers.onSave?.()
          }
          break
        case "r":
        case "R":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handlers.onReset?.()
          }
          break
      }
    },
    [handlers, enabled],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
