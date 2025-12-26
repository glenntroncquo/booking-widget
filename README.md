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

Embed the widget in any website using an iframe:

```html
<iframe 
  src="https://your-domain.com/widget?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx"
  width="100%" 
  height="600px"
  frameborder="0"
></iframe>
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

The widget supports communication with the parent window via the PostMessage API.

#### Listening to Widget Events

```javascript
window.addEventListener("message", (event) => {
  if (event.data.type === "salonify-booking-event") {
    console.log("Event:", event.data.event);
    console.log("Data:", event.data.data);
  }
});
```

#### Sending Configuration Updates

```javascript
const iframe = document.querySelector("iframe");
iframe.contentWindow.postMessage({
  type: "widget-config",
  config: {
    theme: {
      primary: "#FF6B9D",
      // ... other theme properties
    }
  }
}, "*");
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

