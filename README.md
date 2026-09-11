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

The widget fills the height of the iframe it is placed in. The stepper header and
the action footer stay pinned, and only the middle content scrolls — so give the
iframe a sensible height for the space it occupies.

**Option 1: Using `/widget` path (Recommended)**
```html
<iframe 
  src="https://your-domain.com/widget?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx"
  width="100%" 
  height="600px"
  frameborder="0"
></iframe>
```

**Option 2: Using root path**
```html
<iframe 
  src="https://your-domain.com/?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx"
  width="100%" 
  height="600px"
  frameborder="0"
></iframe>
```

> For a contained embed (e.g. below a site header) keep a fixed `height` like
> `600px`. For a full-page booking experience, give the iframe the full viewport
> height (e.g. `height: 100dvh` via CSS).

### Required Parameters

- `companyId` **or** `companySlug` - The company for bookings

Supabase URL and anon key come from the widget environment (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), not from the iframe query string.

Company is always required via query (or the equivalent React prop). The widget does not add public RPCs for deposits. `companySlug` is resolved with a `company` table SELECT, then the existing `company-get` edge if that SELECT is empty.

### Optional Parameters

- `locationId` - Pin a location UUID. Wins over `locationSlug`. When set, services/staff/availability load for that location.
- `locationSlug` - Pin a location by slug (resolved against `public.location` for the company).
- `staffIds` - Comma-separated staff UUIDs to preselect (after location is known).
- `staffSlugs` - Comma-separated staff slugs to preselect.
- `primary` - Primary theme color (hex code)
- `primaryHover` - Primary hover color (hex code)
- `primaryLight` - Primary light color (hex code)
- `secondary` - Secondary theme color (hex code)
- `text` - Text color (hex code)
- `background` - Background color (hex code)
- `maxDate` - Maximum booking date (ISO string, e.g., `2024-12-31`)
- `showStaff` - Show staff selection (`true` or `false`, default: `true`)
- `successUrl` / `success_url` - Host booking-path return URL after Stripe (preferred on deposit book)
- `cancelUrl` / `cancel_url` - Host booking-path cancel URL after Stripe
- `depositAmount` / `deposit_amount` - Optional host hint (from `company-get` when present)
- `depositEnabled` / `deposit_enabled` - Optional host hint; shows **Betaal voorschot** on the book step

`widget-config` postMessage can send the same keys.

### Booking deposits (Stripe Checkout)

Live `appointment-create` (v24) returns `checkout_url` + `deposit_amount` when a deposit is required. The public widget **only** uses that function. `payment-create-checkout` stays a staff XOR path and is not called here.

On book, the widget always sends snake_case `success_url` and `cancel_url`. Prefer host URLs from the iframe query or `widget-config` (booking-path URLs such as `https://booking.salonify.co/glennie?deposit=success`). If those are missing, the widget builds fallbacks from its own URL. Missing URLs → backend `DEPOSIT_URLS_REQUIRED`. Connect not ready → `CHARGES_NOT_ENABLED`.

When `checkout_url` is present:

1. Only `https://checkout.stripe.com` is followed (no open redirect).
2. In an iframe the widget postMessages the host (booking#6), then tries top navigation. Checkout is never loaded inside the nested iframe.
3. Standalone widget URLs redirect this window.

Host postMessage (so the top window can leave for Stripe when `window.top.location` is cross-origin blocked):

```javascript
{ type: "salonify-checkout", checkout_url, checkoutUrl }
{ type: "salonify-booking-event", event: "checkout", data: { checkout_url, checkoutUrl } }
```

Hosts should only follow `https://checkout.stripe.com`. Stripe return lands on the **host** path (`?deposit=success|cancel`). The widget’s own return screens are for standalone widget URLs.

```
https://booking.salonify.co/glennie?deposit=success
https://booking.salonify.co/glennie?deposit=cancel
https://your-domain.com/widget?companySlug=glennie&deposit=success
https://your-domain.com/widget?companySlug=glennie&deposit=cancel
```

| Return | Widget |
|---|---|
| `deposit=success` (or `session_id`) | Confirmation: voorschot paid |
| `deposit=cancel` | Cancelled payment; appointment is not treated as confirmed |

### Multi-location embed URLs

The booking site will match this flow:

| URL | Behavior |
|---|---|
| `?companyId=COMPANY` or `?companySlug=glennie` | If the company has more than one active location, a location picker is shown first. If there is only one, it is selected automatically. |
| `?companyId=COMPANY&locationId=LOCATION` | Skip picker. Load services + staff for that location. |
| `?companySlug=glennie&locationSlug=gent` | Resolve the location slug, then load services + staff. |
| `?companyId=COMPANY&locationId=LOCATION&staffIds=STAFF` | Same as above, and preselect staff. |

`locationId` always wins over `locationSlug`. React embeds use the same names as props (`locationId`, `locationSlug`). `widget-config` postMessage can update them too.

Examples:

```
https://your-domain.com/widget?companyId=xxx
https://your-domain.com/widget?companyId=xxx&locationId=yyy
https://your-domain.com/widget?companySlug=glennie&locationSlug=gent
https://your-domain.com/widget?companyId=xxx&locationId=yyy&staffIds=zzz
```

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
    locationId: "LOCATION_UUID",
    maxDate: new Date("2024-12-31"),
    successUrl: "https://booking.salonify.co/glennie?deposit=success",
    cancelUrl: "https://booking.salonify.co/glennie?deposit=cancel",
  }
}, "*");
```

#### Listening to Widget Events

```javascript
window.addEventListener("message", (event) => {
  if (event.data.type === "salonify-checkout") {
    // Host must only follow https://checkout.stripe.com
    window.location.assign(event.data.checkout_url);
    return;
  }
  if (event.data.type === "salonify-booking-event") {
    console.log("Event:", event.data.event);
    console.log("Data:", event.data.data);
    // checkout | booking-created | deposit-success | deposit-cancel
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

