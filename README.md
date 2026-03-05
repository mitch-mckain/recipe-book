# Mitch's Recipe Book 📖

A personal high-protein recipe app. 10 meals, 4 custom spice blends, smart shopping list, and pantry inventory.

---

## 🚀 Deploy to Vercel (free, ~10 minutes)

### Step 1 — Install Node.js (if you haven't)
Go to [nodejs.org](https://nodejs.org) and download the LTS version. Install it.

### Step 2 — Create a GitHub account
Go to [github.com](https://github.com) → Sign up (free).

### Step 3 — Create a new GitHub repository
1. Click the **+** icon in the top right → **New repository**
2. Name it `recipe-book`
3. Leave it **Public** (required for free Vercel deploys)
4. Click **Create repository**

### Step 4 — Upload this folder to GitHub
GitHub will show you instructions after creating the repo. The easiest way:

**Option A — GitHub Desktop (easiest, no terminal needed):**
1. Download [GitHub Desktop](https://desktop.github.com)
2. Open it → File → Add Local Repository → select the `recipe-book` folder
3. Click **Publish repository** → push to the repo you just created

**Option B — Terminal:**
```bash
cd path/to/recipe-book
npm install
git init
git add .
git commit -m "Initial recipe book"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/recipe-book.git
git push -u origin main
```

### Step 5 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub (free)
2. Click **Add New → Project**
3. Find and import your `recipe-book` repo
4. Vercel auto-detects Vite — just click **Deploy**
5. Done! You'll get a URL like `recipe-book-mitch.vercel.app`

**Every future update:** just push to GitHub → Vercel auto-rebuilds in ~30 seconds.

---

## 💾 What gets saved (localStorage)

Your pantry stock levels, weekly meal selections, and manual shopping list checks are saved to your browser's local storage. This means:

- ✅ Refreshing the page keeps everything
- ✅ Works on any browser you use on the same device
- ℹ️ Different devices/browsers start fresh (by design — so your phone shopping list doesn't conflict with your laptop)

---

## 🛠 Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project structure

```
recipe-book/
├── index.html          # App shell
├── package.json        # Dependencies
├── vite.config.js      # Build config
└── src/
    ├── main.jsx        # React entry point
    └── App.jsx         # Everything — recipes, shopping, pantry, spice blends
```
