"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const BLUE = "#38BDF8";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  className,
  disabled = false,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => { setMounted(true); }, []);

  // Close on outside click (must check both trigger wrap and portal dropdown)
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !wrapRef.current?.contains(t) &&
        !dropdownRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Close on scroll anywhere
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function handleToggle() {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Decide whether to open above or below
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownH = Math.min(options.length * 44 + 16, 224);
      const openAbove = spaceBelow < dropdownH && rect.top > dropdownH;
      setPos({
        top: openAbove ? rect.top - dropdownH - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setOpen((p) => !p);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggle(); return; }
    if (e.key === "ArrowDown") {
      const cur = options.findIndex((o) => o.value === value);
      const next = options[cur + 1];
      if (next) onChange(next.value);
    }
    if (e.key === "ArrowUp") {
      const cur = options.findIndex((o) => o.value === value);
      const prev = options[cur - 1];
      if (prev) onChange(prev.value);
    }
  }

  const dropdownPortal = mounted && open
    ? createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label={label}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 99999,
            background: "rgba(10,12,22,0.99)",
            border: `1px solid rgba(56,189,248,0.2)`,
            borderRadius: "8px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            maxHeight: 224,
            overflowY: "auto",
            animation: "selectIn 0.12s ease-out",
          }}
        >
          <style>{`
            @keyframes selectIn {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="p-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded text-left transition-colors duration-100"
                  style={{
                    background: isSelected ? "rgba(56,189,248,0.12)" : "transparent",
                    color: isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isSelected ? "rgba(56,189,248,0.12)" : "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)";
                  }}
                >
                  <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      {label && (
        <label htmlFor={id} className="mono-label block mb-3">{label}</label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onKeyDown={handleKey}
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-all duration-200 text-left outline-none"
        style={{
          background: open ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${open ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "10px",
          color: selected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
          boxShadow: open ? `0 0 0 3px rgba(56,189,248,0.08)` : undefined,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: open ? BLUE : "rgba(255,255,255,0.3)" }}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {dropdownPortal}
    </div>
  );
}
