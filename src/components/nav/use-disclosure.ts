"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared open/close behaviour for a header disclosure (the "More" menu, the
 * user menu): closes on an outside pointer down and on Escape, returning
 * focus to the trigger button either way, so keyboard users never lose
 * their place.
 */
export function useDisclosure<TContainer extends HTMLElement, TTrigger extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<TContainer>(null);
  const triggerRef = useRef<TTrigger>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return { open, setOpen, containerRef, triggerRef };
}
