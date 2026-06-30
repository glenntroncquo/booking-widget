import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { SalonBooking } from "./salonify-booking";
import { FloatingLauncher } from "./components/FloatingLauncher";

// Define SalonTheme locally (not exported from package)
interface SalonTheme {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  text: string;
  background: string;
  buttonText: string;
}

// Default theme matching the package's expected structure
const defaultTheme: SalonTheme = {
  primary: "#FF6B9D",
  primaryHover: "#E91E63",
  primaryLight: "#FFB3D1",
  secondary: "#FFF0F5",
  text: "#1F2937",
  background: "#FEFEFE",
  buttonText: "#FFFFFF",
};

interface WidgetConfig {
  companyId: string;
  supabaseUrl: string;
  supabaseKey: string;
  theme?: SalonTheme;
  maxDate?: Date;
  showStaff?: boolean;
  staffIds?: string[];
  staffSlugs?: string[];
}

interface ErrorState {
  title: string;
  message: string;
}

function App() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);

  const displayMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    // supported: mode=floating OR launcher=true|1
    const mode = params.get("mode");
    if (mode === "floating") return "floating";
    const launcher = params.get("launcher");
    if (launcher && ["1", "true", "yes"].includes(launcher.toLowerCase()))
      return "floating";
    return "inline";
  }, []);

  // Parse URL parameters (Supabase config must come from env)
  const parseUrlParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);

    const companyId = params.get("companyId");
    const companySlug = params.get("companySlug");
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

    // Required: companyId OR companySlug from URL; supabaseUrl and supabaseKey from env
    if ((!companyId && !companySlug) || !supabaseUrl || !supabaseKey) {
      return null;
    }

    // Optional theme parameters: only collect keys explicitly present in the URL
    // so company_integrations styles can layer underneath them.
    const themeKeys: (keyof SalonTheme)[] = [
      "primary",
      "primaryHover",
      "primaryLight",
      "secondary",
      "text",
      "background",
      "buttonText",
    ];
    const themeOverrides: Partial<SalonTheme> = {};
    for (const key of themeKeys) {
      const value = params.get(key);
      if (value) themeOverrides[key] = value;
    }

    // Optional maxDate
    let maxDate: Date | undefined;
    const maxDateParam = params.get("maxDate");
    if (maxDateParam) {
      const parsedDate = new Date(maxDateParam);
      if (!isNaN(parsedDate.getTime())) {
        maxDate = parsedDate;
      }
    }

    // Optional showStaff
    const showStaffParam = params.get("showStaff");
    const showStaff =
      showStaffParam !== null ? showStaffParam.toLowerCase() === "true" : true;

    // Optional staffIds / staffSlugs (comma-separated) to preselect/filter staff
    const parseList = (value: string | null) =>
      value
        ? value
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
        : [];
    const staffIds = parseList(params.get("staffIds"));
    const staffSlugs = parseList(params.get("staffSlugs"));

    return {
      companyId,
      companySlug,
      supabaseUrl,
      supabaseKey,
      themeOverrides,
      maxDate,
      showStaff,
      staffIds,
      staffSlugs,
    };
  }, []);

  // Initialize configuration and Supabase client
  useEffect(() => {
    console.log("[Salonify Widget] Initializing...");
    console.log("[Salonify Widget] URL params:", window.location.search);
    
    if (!parseUrlParams) {
      console.error("[Salonify Widget] Missing required parameters");
      setError({
        title: "Missing Required Parameters",
        message:
          "Please provide companyId or companySlug as a URL parameter, and configure Supabase via environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).",
      });
      setLoading(false);
      return;
    }

    const {
      companyId: companyIdParam,
      companySlug,
      supabaseUrl,
      supabaseKey,
      themeOverrides,
      maxDate,
      showStaff,
      staffIds: staffIdsParam,
      staffSlugs,
    } = parseUrlParams;

    let cancelled = false;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve a company slug to its id. A companyId in the URL takes precedence.
    const resolveCompanyId = async (): Promise<string | null> => {
      if (companyIdParam) return companyIdParam;
      const { data, error: fetchError } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", companySlug)
        .maybeSingle();
      if (fetchError) {
        console.warn(
          "[Salonify Widget] Failed to resolve company slug:",
          fetchError.message
        );
        return null;
      }
      return (data?.id as string | undefined) ?? null;
    };

    // Fetch per-company styles from company_integrations (config.styles) and
    // merge them into the theme. Falls back gracefully if missing or the query
    // fails. Theme precedence: defaults -> company_integrations styles -> URL params.
    const loadStyles = async (companyId: string): Promise<SalonTheme> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("company_integrations")
          .select("config")
          .eq("company_id", companyId)
          .eq("integration_type", "booking")
          .maybeSingle();

        if (fetchError) {
          console.warn(
            "[Salonify Widget] Failed to load company_integrations styles:",
            fetchError.message
          );
          return { ...defaultTheme, ...themeOverrides };
        }

        const styles = (data?.config as { styles?: Partial<SalonTheme> } | null)
          ?.styles;
        if (!styles || typeof styles !== "object") {
          return { ...defaultTheme, ...themeOverrides };
        }
        return { ...defaultTheme, ...styles, ...themeOverrides };
      } catch (err) {
        console.warn("[Salonify Widget] Error fetching styles:", err);
        return { ...defaultTheme, ...themeOverrides };
      }
    };

    const initialize = async () => {
      const companyId = await resolveCompanyId();
      if (cancelled) return;

      if (!companyId) {
        setError({
          title: "Company Not Found",
          message:
            "Could not resolve the company from the provided companyId or companySlug.",
        });
        setLoading(false);
        return;
      }

      const theme = await loadStyles(companyId);
      if (cancelled) return;

      setConfig({
        companyId,
        supabaseUrl,
        supabaseKey,
        theme,
        maxDate,
        showStaff,
        staffIds: staffIdsParam,
        staffSlugs,
      });
      setError(null);
      setLoading(false);
      console.log("[Salonify Widget] Configuration set successfully");
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [parseUrlParams]);

  // Send ready event to parent window when widget is loaded
  useEffect(() => {
    if (config && window.parent && window.parent !== window) {
      console.log("[Salonify Widget] Widget ready, sending ready event to parent");
      window.parent.postMessage(
        {
          type: "salonify-widget-ready",
          source: "salonify-booking-widget",
        },
        "*" // In production, specify the origin
      );
    } else if (config) {
      console.log("[Salonify Widget] Widget ready (not in iframe)");
    }
  }, [config]);

  // Report content height to the parent window so the host iframe can
  // auto-resize to fit the widget (no inner scrollbars). Only relevant for
  // the inline display mode embedded in an iframe.
  useEffect(() => {
    if (!config) return;
    if (displayMode === "floating") return;
    if (!window.parent || window.parent === window) return;

    let lastHeight = 0;

    const sendHeight = () => {
      const height = Math.ceil(
        document.documentElement.getBoundingClientRect().height
      );
      if (height > 0 && height !== lastHeight) {
        lastHeight = height;
        window.parent.postMessage(
          {
            type: "salonify-widget-resize",
            source: "salonify-booking-widget",
            height,
          },
          "*"
        );
      }
    };

    sendHeight();

    const observer = new ResizeObserver(() => sendHeight());
    observer.observe(document.documentElement);
    window.addEventListener("resize", sendHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, [config, displayMode]);

  // Listen for postMessage from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin or trusted sources
      // In production, you might want to validate event.origin
      if (!event.data || typeof event.data !== "object") return;

      try {
        // Handle theme updates
        if (event.data.type === "widget-theme" && event.data.theme) {
          console.log("[Salonify Widget] Received theme update:", event.data.theme);
          if (config) {
            const updatedTheme: SalonTheme = {
              ...defaultTheme,
              ...config.theme,
              ...event.data.theme,
            };
            console.log("[Salonify Widget] Applying theme:", updatedTheme);
            setConfig({ ...config, theme: updatedTheme });
          }
          return;
        }

        // Handle full config updates
        if (event.data.type === "widget-config" && event.data.config) {
          if (config) {
            const newConfig = event.data.config as Partial<WidgetConfig>;
            // Merge theme if provided
            if (newConfig.theme) {
              newConfig.theme = {
                ...defaultTheme,
                ...config.theme,
                ...newConfig.theme,
              };
            }
            setConfig({ ...config, ...newConfig });
          }
          return;
        }
      } catch (err) {
        console.error("Failed to update config from postMessage:", err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [config]);

  // Send events to parent window (available for future use)
  // const sendEventToParent = (eventType: string, data?: unknown) => {
  //   if (window.parent && window.parent !== window) {
  //     window.parent.postMessage(
  //       {
  //         type: "salonify-booking-event",
  //         event: eventType,
  //         data,
  //       },
  //       "*" // In production, specify the origin
  //     );
  //   }
  // };

  // Render loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="error-container">
        <div className="error-title">{error.title}</div>
        <div className="error-message">{error.message}</div>
      </div>
    );
  }

  // Render booking widget
  if (!config) {
    return (
      <div className="error-container">
        <div className="error-title">Initialization Error</div>
        <div className="error-message">
          Failed to initialize the booking widget.
        </div>
      </div>
    );
  }

  return (
    <div className="widget-container">
      {displayMode === "floating" ? (
        <FloatingLauncher theme={config.theme || defaultTheme}>
          <SalonBooking
            companyId={config.companyId}
            supabaseConfig={{
              url: config.supabaseUrl,
              anonKey: config.supabaseKey,
            }}
            theme={config.theme}
            maxDate={config.maxDate}
            shouldShowStaff={config.showStaff}
            initialStaffIds={config.staffIds}
            initialStaffSlugs={config.staffSlugs}
          />
        </FloatingLauncher>
      ) : (
        <SalonBooking
          companyId={config.companyId}
          supabaseConfig={{
            url: config.supabaseUrl,
            anonKey: config.supabaseKey,
          }}
          theme={config.theme}
          maxDate={config.maxDate}
          shouldShowStaff={config.showStaff}
          initialStaffIds={config.staffIds}
          initialStaffSlugs={config.staffSlugs}
        />
      )}
    </div>
  );
}

export default App;

