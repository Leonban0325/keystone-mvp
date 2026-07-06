# Keystone Demo — Setup & Hosting Guide (no coding experience needed)

This guide covers, from zero:

1. [What this app actually is](#1-what-this-app-actually-is)
2. [Option A — run it on your MacBook (use this for the live pitch)](#2-option-a--run-it-on-your-macbook)
3. [Option B — put it on the internet with a free public link](#3-option-b--put-it-on-the-internet-netlify-free)
4. [The pre-pitch checklist](#4-pre-pitch-checklist)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. What this app actually is

Keystone is a **static web app**: once built, it is just a folder of files
(HTML, JavaScript, CSS) that any browser can open. There is **no server, no
database, no account, nothing to keep running**. All the "banking" activity is
simulated inside the browser tab.

The only optional network call is the AI lease extraction, and it falls back
to a bundled canned result automatically — so the demo is designed to work
**with the internet completely off**.

That means:

| Where it lives | Good for | Needs internet? |
|---|---|---|
| Your MacBook (Option A) | The live pitch on stage | Only once, to install |
| Netlify free hosting (Option B) | Sending a link to judges/teammates | Yes (they load it once) |

Do both. Pitch from the laptop; share the link afterwards.

---

## 2. Option A — run it on your MacBook

You'll use the **Terminal** app. You only type (or paste) commands — nothing
here can damage your Mac. Total time: ~10 minutes, once.

### Step 1 · Install Node.js (one time)

Node.js is the program that runs the demo's toolchain.

1. Go to <https://nodejs.org>
2. Click the big green **LTS** download button (macOS installer, `.pkg`)
3. Open the downloaded file and click through the installer (all defaults)

To check it worked: open **Terminal** (press `⌘ + Space`, type `terminal`,
press Enter) and type:

```
node --version
```

If it prints something like `v22.x.x`, you're good.

### Step 2 · Download the code (one time)

Easiest way, no coding tools needed:

1. Go to <https://github.com/Leonban0325/keystone-mvp>
2. Click the **branch selector** (says `main`) and choose
   **`claude/focused-albattani-xpv100`** — that's where the app lives
3. Click the green **Code** button → **Download ZIP**
4. Double-click the ZIP in your Downloads folder to unzip it
5. Rename the unzipped folder to just `keystone` and drag it to your home
   folder (the one with your username)

### Step 3 · Install & start (the everyday routine)

In Terminal, paste these three lines one at a time (press Enter after each):

```
cd ~/keystone
npm install
npm run dev
```

- `npm install` downloads the toolchain — **needs internet, takes 1–2 min,
  only needed once ever**
- `npm run dev` starts the demo — leave this Terminal window open while
  you present

Now open your browser at:

> **http://localhost:5173/?demo=clean**

That's the pitch URL (`?demo=clean` hides the developer badges). Bookmark it.

To stop the demo: click on the Terminal window and press `Ctrl + C`.
To start it again any day: open Terminal → `cd ~/keystone` → `npm run dev`.

### Even sturdier for the stage (optional)

The command above runs a "development server". For the actual pitch you can
run the final production build instead — same app, slightly faster, nothing
that can hot-reload or hiccup:

```
cd ~/keystone
npm run build
npm run preview
```

Then use **http://localhost:4173/?demo=clean** instead.

---

## 3. Option B — put it on the internet (Netlify, free)

Netlify hosts static sites for free, and has a drag-and-drop uploader —
no account linking, no configuration files.

### Step 1 · Build the folder to upload

In Terminal:

```
cd ~/keystone
npm run build
```

This creates a folder called **`dist`** inside `keystone` — that folder *is*
the entire app.

### Step 2 · Drag and drop

1. Go to <https://app.netlify.com/drop>
2. Create a free account when prompted (email or Google login)
3. Open Finder at `~/keystone`, and **drag the `dist` folder** onto the
   Netlify Drop page
4. Wait ~20 seconds — Netlify gives you a live URL like
   `https://sparkling-otter-123abc.netlify.app`

That URL now works on any device, anywhere. Share
`https://…netlify.app/?demo=clean` for the clean pitch view.

To pick a nicer address: in Netlify, **Site configuration → Change site
name** → e.g. `keystone-demo` → your link becomes
`https://keystone-demo.netlify.app`.

### Updating the public site later

If the code changes: `npm run build` again, then in Netlify open your site →
**Deploys** tab → drag the new `dist` folder onto the page. Done.

### Two cautions for the public link

- **Never put your Anthropic API key into a version you upload.** The key
  would be visible to anyone. The public site should simply run without a
  key — the lease wizard then uses its built-in canned extraction, which is
  exactly what the pitch script uses anyway.
- Each visitor gets their own private sandbox (state lives in their browser),
  so judges can click Refund or move the clock without affecting your demo.

### Alternatives (equally fine)

- **Vercel** (<https://vercel.com>): log in with GitHub, "Add New → Project",
  import `keystone-mvp`, set the production branch to
  `claude/focused-albattani-xpv100`, framework preset **Vite**, deploy.
  Redeploys automatically whenever the code changes — nicer long-term, but
  requires connecting your GitHub account.
- **GitHub Pages**: works but needs config changes; not worth it here.

---

## 4. Pre-pitch checklist

Run through this the night before **and** 10 minutes before going on:

- [ ] `npm run dev` (or `npm run preview`) is running; the page loads
- [ ] Open the site **without** `?demo=clean`, click the ⚙ gear →
      **Reset demo to seed**
- [ ] Dashboard shows: **10 units · €125,000 under management · 1 violation ·
      €171.94 total/unit/yr**
- [ ] Persona picker: choose **Meridian Properties SCI** (A1) as the start
- [ ] Switch to the `?demo=clean` tab for the actual pitch
- [ ] Optional flourish: run `npm test` in a second Terminal — 43 green
      tests = "our statutory test packs pass"
- [ ] Turn ON Do Not Disturb, close Slack/Mail, plug in power
- [ ] The 3-minute script is in `README.md`; the persona extension
      (B1 roll-up → C1 partner funnel) runs from the gear panel

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| `command not found: npm` | Node.js isn't installed — redo Option A, Step 1, then close and reopen Terminal |
| `Port 5173 is already in use` | The demo is already running in another Terminal window — just use the browser, or press `Ctrl + C` in the old window |
| Page is blank / weird after lots of clicking | ⚙ gear → **Reset demo to seed**. Nuclear option: browser settings → clear site data for localhost |
| "1 violation" isn't showing | You (or a judge) already clicked the Refund button — Reset demo to seed |
| The AI extraction says "canned" | Expected and fine — that's the offline fallback, and the demo script works identically. Live mode only activates if a `VITE_ANTHROPIC_KEY` is configured, which the pitch does not need |
| Wi-Fi dies mid-pitch | Nothing happens. The app is already loaded and everything is local. Carry on |
