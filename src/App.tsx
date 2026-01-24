import { useEffect, useState, useMemo } from "react";
import { SalonBooking } from "salonify-booking";

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
}

interface ErrorState {
  title: string;
  message: string;
}

function App() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);

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
      buttonText: params.get("buttonText") || defaultTheme.buttonText,
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
    console.log("[Salonify Widget] Initializing...");
    console.log("[Salonify Widget] URL params:", window.location.search);
    
    if (!parseUrlParams) {
      console.error("[Salonify Widget] Missing required parameters");
      setError({
        title: "Missing Required Parameters",
        message:
          "Please provide companyId, supabaseUrl, and supabaseKey as URL parameters.",
      });
      setLoading(false);
      return;
    }

    try {
      console.log("[Salonify Widget] Configuration parsed:", {
        companyId: parseUrlParams.companyId,
        supabaseUrl: parseUrlParams.supabaseUrl,
        hasTheme: !!parseUrlParams.theme,
      });
      
      // Set configuration (the package will handle Supabase client creation internally)
      setConfig(parseUrlParams);
      setError(null);
      console.log("[Salonify Widget] Configuration set successfully");
    } catch (err) {
      console.error("[Salonify Widget] Configuration error:", err);
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
      <SalonBooking
        companyId={config.companyId}
        supabaseConfig={{
          url: config.supabaseUrl,
          anonKey: config.supabaseKey,
        }}
        theme={config.theme}
        maxDate={config.maxDate}
        shouldShowStaff={config.showStaff}
      />
    </div>
  );
}

export default App;

