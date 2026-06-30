import React, { useEffect, useRef } from "react";

/**
 * Example React component showing how to embed the Salonify booking widget
 * and pass theme configuration via postMessage
 */
export default function AppointmentPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Define your theme (matching your website's design)
  const salonTheme = {
    primary: "#FF8FB2",
    primaryHover: "#FFBDD4",
    primaryLight: "#FFF0F7",
    secondary: "#FFBDD4",
    text: "#4A3F45",
    background: "white",
    buttonText: "white",
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: In production, validate event.origin
      // if (event.origin !== "https://your-widget-domain.com") return;

      if (event.data?.type === "salonify-widget-ready" && iframeRef.current) {
        console.log("Widget is ready, sending theme...");
        
        // Send theme configuration to widget
        iframeRef.current.contentWindow?.postMessage(
          {
            type: "widget-theme",
            theme: salonTheme,
          },
          "*" // In production, specify the origin
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Fallback: Send theme when iframe loads
  const handleIframeLoad = () => {
    setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "widget-theme",
            theme: salonTheme,
          },
          "*"
        );
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-salon-off-white to-salon-softer-pink">
      <div className="section-container pt-20 lg:pt-32">
        <div className="max-w-4xl mx-auto">
          <iframe
            ref={iframeRef}
            src={`${import.meta.env.VITE_WIDGET_URL}?companyId=${import.meta.env.VITE_COMPANY_ID}&supabaseUrl=${import.meta.env.VITE_SUPABASE_URL}&supabaseKey=${import.meta.env.VITE_SUPABASE_ANON_KEY}`}
            width="100%"
            height="700px"
            frameBorder="0"
            onLoad={handleIframeLoad}
            className="rounded-xl shadow-xl"
          />
        </div>
      </div>
    </div>
  );
}

