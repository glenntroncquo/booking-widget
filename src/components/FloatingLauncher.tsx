import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ThemeLike = {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  text: string;
  background: string;
  buttonText: string;
};

type FloatingLauncherProps = {
  theme: ThemeLike;
  title?: string;
  launcherLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim();
  if (![3, 6].includes(normalized.length)) return `rgba(0,0,0,${alpha})`;
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

export function FloatingLauncher({
  theme,
  title = "Maak afspraak",
  launcherLabel = "Maak afspraak",
  defaultOpen = false,
  children,
}: FloatingLauncherProps) {
  const [open, setOpen] = useState(defaultOpen);

  const accentShadow = useMemo(() => withAlpha(theme.primary, 0.25), [theme]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlBg: html.style.background,
      htmlOverflowX: html.style.overflowX,
      bodyBg: body.style.background,
      bodyMargin: body.style.margin,
      bodyPadding: body.style.padding,
      bodyOverflowX: body.style.overflowX,
      bodyOverflow: body.style.overflow,
    };
    html.style.background = "transparent";
    html.style.overflowX = "visible";
    body.style.background = "transparent";
    body.style.margin = "0";
    body.style.padding = "0";
    body.style.overflowX = "visible";
    body.style.overflow = "visible";
    return () => {
      html.style.background = prev.htmlBg;
      html.style.overflowX = prev.htmlOverflowX;
      body.style.background = prev.bodyBg;
      body.style.margin = prev.bodyMargin;
      body.style.padding = prev.bodyPadding;
      body.style.overflowX = prev.bodyOverflowX;
      body.style.overflow = prev.bodyOverflow;
    };
  }, []);

  useEffect(() => {
    // Optional parent control: postMessage { type: 'salonify-widget-open'|'salonify-widget-close'|'salonify-widget-toggle' }
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "salonify-widget-open") setOpen(true);
      if (data.type === "salonify-widget-close") setOpen(false);
      if (data.type === "salonify-widget-toggle") setOpen((v) => !v);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "salonify-widget-state",
          source: "salonify-booking-widget",
          open,
        },
        "*",
      );
    }
  }, [open]);

  const node = (
    <div className="salonify-floating-root">
      <div className="salonify-floating-anchor">
        <button
          type="button"
          className="salonify-floating-launcher"
          style={{
            background: theme.primary,
            color: theme.buttonText,
            boxShadow: `0 12px 30px ${accentShadow}, 0 8px 16px rgba(0,0,0,0.18)`,
            opacity: open ? 0 : 1,
            pointerEvents: open ? "none" : "auto",
            transform: open ? "translateY(8px) scale(0.98)" : "translateY(0) scale(1)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              theme.primaryHover || theme.primary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = theme.primary;
          }}
          onClick={() => setOpen(true)}
          aria-label={launcherLabel}
        >
          <span className="salonify-floating-launcher-badge" aria-hidden="true">
            S
          </span>
          <span className="salonify-floating-launcher-text">{launcherLabel}</span>
        </button>

        <div
          className="salonify-floating-panel"
          style={{
            background: theme.background,
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transform: open
              ? "translateY(0) scale(1)"
              : "translateY(14px) scale(0.98)",
            boxShadow:
              "0 28px 70px rgba(0,0,0,0.28), 0 10px 25px rgba(0,0,0,0.18)",
            borderColor: withAlpha(theme.text, 0.12),
          }}
          role="dialog"
          aria-modal="false"
          aria-label={title}
        >
          <div
            className="salonify-floating-header"
            style={{ borderBottomColor: withAlpha(theme.text, 0.08) }}
          >
            <div className="salonify-floating-title" style={{ color: theme.text }}>
              {title}
            </div>
            <button
              type="button"
              className="salonify-floating-close"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              style={{ color: withAlpha(theme.text, 0.7) }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="salonify-floating-content">{children}</div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}

