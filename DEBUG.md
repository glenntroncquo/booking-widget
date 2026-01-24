# Local Debugging Guide

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   This will start Vite dev server at `http://localhost:5173`

2. **Open a test file:**
   - **React Example**: Open `test-react.html` in your browser (double-click the file)
   - **Plain HTML**: Open `test-local.html` in your browser
   - **Direct Widget**: Navigate to `http://localhost:5173/?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx`

3. **Check the browser console:**
   - Open DevTools (F12 or Cmd+Option+I)
   - Look for `[Salonify Widget]` log messages
   - These will help you debug configuration and theme issues

## Testing Different URLs

### Test Root Path (/)
```
http://localhost:5173/?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx
```

### Test /widget Path
```
http://localhost:5173/widget?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx
```

## Debugging Features

The widget includes console logging for:
- ✅ Configuration parsing
- ✅ Theme updates via postMessage
- ✅ Widget ready events
- ✅ Error states

## Testing Theme Updates

### Using React Example (`test-react.html`)
1. Make sure `npm run dev` is running (widget server)
2. Open `test-react.html` in your browser (double-click the file)
3. The page will automatically:
   - Load the widget in an iframe
   - Listen for the "widget-ready" event
   - Send theme configuration via postMessage
4. Watch the debug log on the page and browser console

### Using Plain HTML (`test-local.html`)
1. Open `test-local.html` in your browser
2. Open browser DevTools console
3. Click "Send Theme" button
4. Watch console logs to see theme being applied

## Common Issues

### Widget not loading
- Check browser console for errors
- Verify all required URL parameters are present
- Check network tab for failed requests

### Theme not applying
- Check console for `[Salonify Widget] Received theme update` message
- Verify postMessage is being sent from parent window
- Check if widget is in an iframe (theme updates only work in iframes)

### 404 on /widget path
- In development, Vite handles all routes automatically
- The `/widget` path should work in dev mode
- If not, try the root path `/` instead

## Production Testing

After deploying to Vercel, test with:
```
https://your-domain.vercel.app/widget?companyId=xxx&supabaseUrl=xxx&supabaseKey=xxx
```
