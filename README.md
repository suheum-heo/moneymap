# 가계부

A personal budget tracker PWA built with Next.js. Works offline, installable on iPhone.

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub
```bash
cd gaegyebu
git init
git add .
git commit -m "init: gaegyebu PWA"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/gaegyebu.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your `gaegyebu` GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy** — done!

### 3. Install on iPhone (PWA)
1. Open your Vercel URL in **Safari** on iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add** — it'll appear like a native app!

## Local dev
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Notes
- Data is stored in `localStorage` — stays on your device
- Adding months: edit the `MONTHS` array in `src/app/page.tsx`
- Dark mode: follows your system setting automatically
