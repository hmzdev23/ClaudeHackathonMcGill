"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined)

function useTooltipContext() {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error("Tooltip components must be used within a Tooltip")
  }
  return context
}

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
  skipDelayDuration?: number
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

interface TooltipProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function Tooltip({ children, open: controlledOpen, defaultOpen = false, onOpenChange }: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  )
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  disabled?: boolean
}

function TooltipTrigger({ children, asChild, disabled }: TooltipTriggerProps) {
  const { setOpen } = useTooltipContext()

  const handleMouseEnter = () => {
    if (!disabled) setOpen(true)
  }
  const handleMouseLeave = () => setOpen(false)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onMouseEnter?: () => void; onMouseLeave?: () => void }>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    })
  }

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </span>
  )
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
}

function TooltipContent({ children, className, side = "top", sideOffset = 4 }: TooltipContentProps) {
  const { open } = useTooltipContext()

  if (!open) return null

  const positionClasses = {
    top: `bottom-full left-1/2 -translate-x-1/2 mb-${sideOffset}`,
    bottom: `top-full left-1/2 -translate-x-1/2 mt-${sideOffset}`,
    left: `right-full top-1/2 -translate-y-1/2 mr-${sideOffset}`,
    right: `left-full top-1/2 -translate-y-1/2 ml-${sideOffset}`,
  }

  return (
    <div
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border border-[var(--borderline)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-main)] shadow-md animate-in fade-in-0 zoom-in-95",
        positionClasses[side],
        className
      )}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
