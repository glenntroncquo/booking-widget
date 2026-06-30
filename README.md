# Salonify Booking Widget

A standalone, iframe-embeddable React widget for the `salonify-booking` package. This widget can be embedded across any website using a simple iframe tag.

## Features

- ✅ Easy iframe embedding
- ✅ URL parameter configuration
- ✅ Customizable theme
- ✅ PostMessage API for parent window communication
- ✅ Responsive design
- ✅ Error handling and loading states

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Usage

### Basic Embedding

Embed the widget in any website using an iframe. You can use either the root URL or the `/widget` path:

**Option 1: Using `/widget` path (Recommended)**
```html
<iframe 
  id="salonify-widget"
  src="https://your-domain.com/widget?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx"
  width="100%" 
  height="600px"
  frameborder="0"
  scrolling="no"
></iframe>
```

**Option 2: Using root path**
```html
<iframe 
  id="salonify-widget"
  src="https://your-domain.com/?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx"
  width="100%" 
  height="600px"
  frameborder="0"
  scrolling="no"
></iframe>
```

> The `height` here is only an initial value. Add the auto-resize snippet below so
> the iframe grows/shrinks to fit the widget content (no inner scrollbar, the whole
> form is always visible).

### Auto-resizing the iframe (recommended)

The widget reports its content height to the parent window via `postMessage`
(`{ type: "salonify-widget-resize", height }`). Listen for it and update the
iframe height so the form is never cut off and there's no inner scrollbar:

```javascript
const iframe = document.getElementById("salonify-widget");

window.addEventListener("message", (event) => {
  // In production, validate event.origin against your widget domain
  if (event.data?.type === "salonify-widget-resize" && event.data.height) {
    iframe.style.height = event.data.height + "px";
  }
});
```

### Required Parameters

- `companyId` - The company ID for bookings
- `supabaseUrl` - Your Supabase project URL
- `supabaseKey` - Your Supabase anon/public key

### Optional Parameters

- `primary` - Primary theme color (hex code)
- `primaryHover` - Primary hover color (hex code)
- `primaryLight` - Primary light color (hex code)
- `secondary` - Secondary theme color (hex code)
- `text` - Text color (hex code)
- `background` - Background color (hex code)
- `maxDate` - Maximum booking date (ISO string, e.g., `2024-12-31`)
- `showStaff` - Show staff selection (`true` or `false`, default: `true`)

### Example with Theme

```html
<iframe 
  src="https://your-domain.com/widget?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx&primary=%23FF6B9D&primaryHover=%23E91E63&showStaff=true"
  width="100%" 
  height="600px"
  frameborder="0"
></iframe>
```

Note: URL-encode special characters in the iframe src (e.g., `#` becomes `%23`).

### PostMessage API

The widget supports communication with the parent window via the PostMessage API. This is the recommended way to pass theme configuration from your website.

#### Sending Theme Configuration

**Option 1: Wait for Widget Ready Event (Recommended)**

```javascript
const iframe = document.querySelector("iframe");

// Listen for widget ready event
window.addEventListener("message", (event) => {
  if (event.data.type === "salonify-widget-ready") {
    // Widget is ready, send theme configuration
    iframe.contentWindow.postMessage({
      type: "widget-theme",
      theme: {
        primary: "#FF8FB2",
        primaryHover: "#FFBDD4",
        primaryLight: "#FFF0F7",
        secondary: "#FFBDD4",
        text: "#4A3F45",
        background: "white",
        buttonText: "white",
      },
    }, "*");
  }
});
```

**Option 2: Send Theme Immediately (if iframe is already loaded)**

```javascript
const iframe = document.querySelector("iframe");

// Wait for iframe to load, then send theme
iframe.addEventListener("load", () => {
  iframe.contentWindow.postMessage({
    type: "widget-theme",
    theme: {
      primary: "#FF8FB2",
      primaryHover: "#FFBDD4",
      primaryLight: "#FFF0F7",
      secondary: "#FFBDD4",
      text: "#4A3F45",
      background: "white",
      buttonText: "white",
    },
  }, "*");
});
```

**Option 3: React Example with useEffect**

```jsx
import { useEffect, useRef } from "react";

function AppointmentPage() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === "salonify-widget-ready" && iframeRef.current) {
        iframeRef.current.contentWindow.postMessage({
          type: "widget-theme",
          theme: {
            primary: "#FF8FB2",
            primaryHover: "#FFBDD4",
            primaryLight: "#FFF0F7",
            secondary: "#FFBDD4",
            text: "#4A3F45",
            background: "white",
            buttonText: "white",
          },
        }, "*");
      }

      // Auto-resize the iframe to fit the widget content
      if (event.data.type === "salonify-widget-resize" && event.data.height && iframeRef.current) {
        iframeRef.current.style.height = event.data.height + "px";
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="https://your-domain.com/widget?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx"
      width="100%"
      height="600px"
      frameBorder="0"
      scrolling="no"
    />
  );
}
```

#### Sending Full Configuration Updates

You can also send complete configuration updates:

```javascript
iframe.contentWindow.postMessage({
  type: "widget-config",
  config: {
    theme: {
      primary: "#FF8FB2",
      // ... other theme properties
    },
    showStaff: true,
    maxDate: new Date("2024-12-31"),
  }
}, "*");
```

#### Listening to Widget Events

```javascript
window.addEventListener("message", (event) => {
  if (event.data.type === "salonify-booking-event") {
    console.log("Event:", event.data.event);
    console.log("Data:", event.data.data);
  }
});
```

## Deployment

### Vercel (Recommended)

The project is configured for Vercel deployment. You can deploy in several ways:

**Option 1: Vercel CLI**
```bash
npm i -g vercel
vercel
```

**Option 2: GitHub Integration**
1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Vercel will auto-detect Vite and use the `vercel.json` configuration
4. Deploy!

**Option 3: Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import your Git repository
3. Vercel will automatically detect the framework and deploy

The `vercel.json` file is already configured with:
- Build command: `npm run build`
- Output directory: `dist`
- Framework: `vite`
- SPA routing support (all routes serve `index.html`)

### Other Hosting Options

- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **GitHub Pages**: Push `dist` contents to `gh-pages` branch
- **AWS S3**: Upload `dist` contents to an S3 bucket with static website hosting
- **Cloudflare Pages**: Connect your repo and set build output to `dist`

## Security Considerations

- The widget uses Supabase's anon/public key, which should be safe to expose in URLs
- For production, consider implementing origin validation for postMessage communication
- Always use HTTPS for the widget URL

## License

MIT

