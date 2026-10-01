import { useEffect } from "react";
import { AuthScreen } from "@/components/rosema/auth-screen";
import { Shell } from "@/components/rosema/shell";
import { resolveTheme, useRosema } from "@/lib/rosema/store";

export function RosemaApp() {
  const session = useRosema((s) => s.session);
  const users = useRosema((s) => s.users);
  const theme = resolveTheme({ session, users });
  const look = users.find((user) => user.id === session?.userId);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.wallpaper = look?.wallpaper || "theme";
    if (look?.accent) root.style.setProperty("--app-rose", look.accent);
    else root.style.removeProperty("--app-rose");
  }, [look?.accent, look?.wallpaper, theme]);

  useEffect(() => {
    void useRosema.persist.rehydrate();
  }, []);

  useEffect(() => {
    let pressed: HTMLElement | null = null;
    let sawClick = false;
    let timer = 0;

    const controlFrom = (event: Event): HTMLElement | null => {
      const point = event instanceof MouseEvent ? document.elementFromPoint(event.clientX, event.clientY) : null;
      const raw = point ?? (event.target instanceof Element ? event.target : null);
      const node = raw instanceof Element ? raw.closest("button, [role='button'], label") : null;
      if (!(node instanceof HTMLElement)) return null;
      if (node instanceof HTMLButtonElement && node.disabled) return null;
      return node;
    };

    const arm = (event: Event) => {
      const button = controlFrom(event);
      if (!button) return;
      pressed = button;
      sawClick = false;
    };

    const replay = (event: Event) => {
      if ("button" in event && typeof event.button === "number" && event.button !== 0) {
        pressed = null;
        return;
      }
      const button = controlFrom(event) ?? pressed;
      pressed = null;
      if (!button || (button instanceof HTMLButtonElement && button.disabled)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (sawClick || !document.contains(button) || (button instanceof HTMLButtonElement && button.disabled)) return;
        sawClick = true;
        button.click();
      }, 90);
    };

    const onClick = () => {
      sawClick = true;
    };

    document.addEventListener("pointerdown", arm, true);
    document.addEventListener("mousedown", arm, true);
    document.addEventListener("pointerup", replay, true);
    document.addEventListener("mouseup", replay, true);
    document.addEventListener("touchend", replay, true);
    document.addEventListener("click", onClick, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", arm, true);
      document.removeEventListener("mousedown", arm, true);
      document.removeEventListener("pointerup", replay, true);
      document.removeEventListener("mouseup", replay, true);
      document.removeEventListener("touchend", replay, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return session ? <Shell /> : <AuthScreen />;
}
