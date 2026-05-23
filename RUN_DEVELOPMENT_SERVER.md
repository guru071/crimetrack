# 🚀 HOW TO RUN CRIMETRACK PRO v2.0 - DEVELOPMENT SERVER

## Quick Start (Choose Your Platform)

### 💻 Windows (Command Prompt or PowerShell)

```bash
cd C:\Users\gurup\police\crimetrack-app
npm install
npm run dev
```

The server will start and show you the local URL (usually `http://localhost:5173`)

### 🐧 Linux / Mac (Terminal)

```bash
cd ~/path/to/crimetrack-app
npm install
npm run dev
```

### 🐳 Docker (If Containerized)

```bash
docker build -t crimetrack-pro:2.0 .
docker run -p 3000:3000 crimetrack-pro:2.0
```

---

## Step-by-Step Instructions

### Step 1: Open Terminal/Command Prompt
- **Windows**: Press `Win + R`, type `cmd` or `powershell`, press Enter
- **Mac**: Open Terminal (Cmd + Space, type "Terminal")
- **Linux**: Open your terminal application

### Step 2: Navigate to Project
```bash
cd C:\Users\gurup\police\crimetrack-app
```

### Step 3: Install Dependencies (First Time Only)
```bash
npm install
```
This installs all required packages listed in `package.json`

### Step 4: Start Development Server
```bash
npm run dev
```

### Step 5: Open in Browser
Watch for output showing a URL like:
```
  VITE v8.0.12  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Click the URL or copy-paste it into your browser!

---

## What You'll See

When the app loads, you should see:
- ✅ Time-based colors (changes based on current hour)
- ✅ Navigation menu at bottom
- ✅ Dashboard with analytics
- ✅ Settings option
- ✅ Google Sheets sync button
- ✅ Advanced Analytics tab

---

## Development Features

### Auto-Reload
- Changes to code automatically reload the browser
- No need to restart the server

### Hot Module Replacement (HMR)
- Some changes don't require a full page reload
- Preserves app state when possible

### Browser DevTools
- Open: F12 or Right-click → Inspect
- Check Console for errors
- Debug JavaScript code

### Network Tab
- Monitor API calls
- Check Google Sheets sync requests

---

## Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Start backend server (if configured)
npm run backend
```

---

## Features to Test

### 1. Time-Based Theme
- ✅ Colors should match time of day
- ✅ Should update every 60 seconds
- ✅ Smooth transitions between colors

### 2. Advanced Analytics
- ✅ Click "Advanced Analytics" in menu
- ✅ Should see 4 charts with sample data
- ✅ Risk distribution pie chart
- ✅ Crime hotspots bar chart
- ✅ Timeline line chart
- ✅ Gang network analysis

### 3. Google Sheets Sync
- ✅ Look for sync button on dashboard
- ✅ Can configure sheet ID in settings
- ✅ Progress indicator visible

### 4. Security
- ✅ Check Settings for Security & Audit
- ✅ Audit logs should be visible
- ✅ View security tips

### 5. Create Records
- ✅ Add new record with form
- ✅ Can upload image
- ✅ Image auto-compresses
- ✅ Risk score auto-calculated

---

## Troubleshooting

### Port Already in Use
If you get "port 5173 is already in use":
```bash
# Kill the process on Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# On Mac/Linux
lsof -ti:5173 | xargs kill -9
```

### Dependencies Missing
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Cache Issues
```bash
npm cache clean --force
npm install
```

### ModuleNotFoundError
Check that all these files exist:
- ✅ `src/TimeBasedTheme.js`
- ✅ `src/AdvancedUtils.js`
- ✅ `src/AdvancedAnalytics.jsx`
- ✅ `src/SecurityAudit.jsx`
- ✅ `src/App.jsx`

---

## Production Build

When ready to deploy:

```bash
# Build for production
npm run build

# Output in: dist/ folder
```

Then deploy the `dist/` folder to your production server.

---

## Stop Development Server

Press `Ctrl + C` in your terminal to stop the server.

---

## Next Steps

1. ✅ Run `npm run dev`
2. ✅ Wait for server to start
3. ✅ Open browser to localhost URL
4. ✅ Test all features
5. ✅ Check console (F12) for errors
6. ✅ When ready: Run `npm run build`

---

## Need Help?

Check these files for more info:
- `QUICK_START.md` - Quick start guide
- `FEATURES_IMPLEMENTED.md` - All features explained
- `CRIMETRACK_PRO_v2_DEPLOYMENT_READY.md` - Deployment guide

---

**Ready?** Let's go! 🚀

```bash
npm install && npm run dev
```

Enjoy your CrimeTrack Pro v2.0! 🎉
