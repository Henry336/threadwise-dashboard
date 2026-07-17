"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

export type ActionMenuAction = {
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
};

export type ActionMenuState<T> = {
  item: T;
  anchorX: number;
  anchorY: number;
  placement: "pointer" | "trigger";
};

export function useActionMenu<T>() {
  const [menu, setMenu] = useState<ActionMenuState<T> | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const open = (event: MouseEvent<HTMLElement>, item: T) => {
    event.preventDefault();
    event.stopPropagation();
    const pointer = event.type === "contextmenu";
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({
      item,
      anchorX: pointer ? event.clientX : rect.right,
      anchorY: pointer ? event.clientY : rect.bottom,
      placement: pointer ? "pointer" : "trigger",
    });
  };

  return { menu, open, close: () => setMenu(null) };
}

export function ActionMenu<T>({ state, label, actions, onClose }: {
  state: ActionMenuState<T>;
  label: string;
  actions: ActionMenuAction[];
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: state.anchorX, top: state.anchorY + 7 });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    if (window.matchMedia("(max-width: 640px)").matches) {
      menu.querySelector<HTMLButtonElement>('button[role="menuitem"]')?.focus();
      return;
    }
    const bounds = menu.getBoundingClientRect();
    const desiredLeft = state.placement === "trigger" ? state.anchorX - bounds.width : state.anchorX;
    const desiredTop = state.anchorY + (state.placement === "trigger" ? 7 : 0);
    setPosition({
      left: Math.max(12, Math.min(desiredLeft, window.innerWidth - bounds.width - 12)),
      top: Math.max(12, Math.min(desiredTop, window.innerHeight - bounds.height - 12)),
    });
    menu.querySelector<HTMLButtonElement>('button[role="menuitem"]')?.focus();
  }, [state]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="tw-action-menu-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={menuRef}
        className="tw-context-menu tw-action-menu"
        role="menu"
        aria-label={`${label} actions`}
        style={{ left: position.left, top: position.top }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <i aria-hidden="true" />
        <span>{label}</span>
        {actions.map((action, index) => action.label === "separator"
          ? <hr key={`separator-${index}`} />
          : <button
              key={action.label}
              role="menuitem"
              className={action.danger ? "danger" : ""}
              onClick={() => { onClose(); action.onSelect(); }}
            >
              {action.icon}{action.label}
            </button>)}
      </div>
    </div>,
    document.body,
  );
}
