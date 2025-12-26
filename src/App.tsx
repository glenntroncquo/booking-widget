import { useEffect, useState, useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SalonBooking, SalonTheme, defaultTheme } from "salonify-booking";
import "salonify-booking/styles"; // Import package styles

interface WidgetConfig {
  companyId: string;
  supabaseUrl: string;
  supabaseKey: string;
  theme?: SalonTheme;
  maxDate?: Date;
  showStaff?: boolean;
}

interface ErrorState {
  title: string;
  message: string;
}

function App() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  // Parse URL parameters
  const parseUrlParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);

    const companyId = params.get("companyId");
    const supabaseUrl = params.get("supabaseUrl");
    const supabaseKey = params.get("supabaseKey");

    // Required parameters
    if (!companyId || !supabaseUrl || !supabaseKey) {
      return null;
    }

    // Optional theme parameters
    const theme: SalonTheme = {
      primary: params.get("primary") || defaultTheme.primary,
      primaryHover: params.get("primaryHover") || defaultTheme.primaryHover,
      primaryLight: params.get("primaryLight") || defaultTheme.primaryLight,
      secondary: params.get("secondary") || defaultTheme.secondary,
      text: params.get("text") || defaultTheme.text,
      background: params.get("background") || defaultTheme.background,
    };

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

    return {
      companyId,
      supabaseUrl,
      supabaseKey,
      theme,
      maxDate,
      showStaff,
    };
  }, []);

  // Initialize configuration and Supabase client
  useEffect(() => {
    if (!parseUrlParams) {
      setError({
        title: "Missing Required Parameters",
        message:
          "Please provide companyId, supabaseUrl, and supabaseKey as URL parameters.",
      });
      setLoading(false);
      return;
    }

    try {
      // Initialize Supabase client
      const client = createClient(
        parseUrlParams.supabaseUrl,
        parseUrlParams.supabaseKey
      );

      setSupabase(client);
      setConfig(parseUrlParams);
      setError(null);
    } catch (err) {
      setError({
        title: "Configuration Error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to initialize the booking widget.",
      });
    } finally {
      setLoading(false);
    }
  }, [parseUrlParams]);

  // Listen for postMessage from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin or trusted sources
      // In production, you might want to validate event.origin
      if (event.data && event.data.type === "widget-config") {
        try {
          const newConfig = event.data.config as Partial<WidgetConfig>;
          if (config && supabase) {
            setConfig({ ...config, ...newConfig });
          }
        } catch (err) {
          console.error("Failed to update config from postMessage:", err);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [config, supabase]);

  // Send events to parent window
  const sendEventToParent = (eventType: string, data?: unknown) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "salonify-booking-event",
          event: eventType,
          data,
        },
        "*" // In production, specify the origin
      );
    }
  };

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
  if (!config || !supabase) {
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
      <SalonBooking
        companyId={config.companyId}
        supabase={supabase}
        theme={config.theme}
        maxDate={config.maxDate}
        shouldShowStaff={config.showStaff}
      />
    </div>
  );
}

export default App;

