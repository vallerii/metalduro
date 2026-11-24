"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MENU_SELECTOR = ".header-user-menu, .header-nav-menu";

function closeMenus(except?: Element | null) {
  document.querySelectorAll<HTMLDetailsElement>(MENU_SELECTOR).forEach((menu) => {
    if (menu !== except && menu.open) menu.open = false;
  });
}

/** Closes header <details> menus on outside click, Esc, link click and route change. */
export function HeaderMenuDismiss() {
  const pathname = usePathname();

  useEffect(() => {
    closeMenus();
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      closeMenus(target?.closest(MENU_SELECTOR));
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(".header-popover a")) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
