# Private Culinary Journal

A React + TypeScript PWA that acts as a polished mobile-first frontend for your self-hosted [Mealie](https://mealie.io) instance. Designed for iPhone home screen installation, warm editorial styling, and fast everyday cooking access.

---

## Features

### Recipes
- Browse your entire Mealie recipe library in **list**, **grid**, or **swipe card** view.
- Full-text **search** across recipe names and ingredients.
- **Favourite** recipes with a heart tap — synced back to your Mealie user account.
- **Pull to refresh** to pick up new recipes from Mealie.

### Recipe Detail
- **Servings scaler** — tap + / − and all ingredient quantities update proportionally.
- **Cook Mode** — enlarges the method text for easy cross-room reading. Accessible via the inline button or the sticky pill that appears when you scroll past the header.
- **Ingredient highlighting** — in Cook Mode, ingredient names in each step are highlighted. Tap one to see a tooltip with the full ingredient details.
- **Add all ingredients to shopping list** with one tap.

### Recipe Editing
Open the ⋯ menu on any recipe and choose **Edit recipe** to:
- Change the title, description, prep/cook/total time, and serving count.
- **Add, edit, or remove ingredients.** Each ingredient has separate quantity, unit, food name, and note fields. Ingredients originally stored as free-text notes can be split into structured fields and saved correctly.
- **Add, edit, or remove steps.** Each step has an optional title and body.
- **Convert to metric** — converts imperial quantities (cups, oz, lbs, °F) to metric in one tap, including Fahrenheit temperatures written inside step text.
- **Replace or add the recipe photo** — tap the camera button in the Photo section to pick an image from your library. It uploads to Mealie when you save.

### Meal Plan
- See the next **14 days** of planned meals grouped by day.
- Tap a **date chip** in the header bar to scroll the feed to that day.
- **Long-press** a date chip to open a new meal entry pre-filled for that day (horizontal scrolling through chips will not accidentally trigger this).
- **+ button** on each day card to add a meal to that day.
- Edit or delete individual meal plan entries.
- Add either a **recipe link** or a **free-text note** as a meal entry.
- **Pull to refresh** to sync with Mealie.

### Shopping List
- View your current Mealie shopping list with checkbox-style rows.
- Items check off with immediate visual feedback, synced back to Mealie.
- **Export to Reminders** — sends all unchecked items to an Apple Shortcut in one tap (see setup guide below).

### Settings
- Configure your Mealie base URL and API token.
- **Test Connection** button verifies credentials before use.
- Settings persist locally across sessions.

---

## Tech Stack

| Layer | Library |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Icons | Lucide React |
| PWA | vite-plugin-pwa |
| Routing | React Router |

---

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm

### Install and run

```bash
npm install
npm run dev
```

Vite serves on port `4173` bound to `0.0.0.0`.

### Production build

```bash
npm run build
```

---

## First-Time App Setup

1. Open the app.
2. Tap **Settings** (bottom nav).
3. Set **Mealie Base URL** to your Mealie server address, e.g. `http://192.168.1.91:9000`.
4. Paste a long-lived Mealie **API token** (Mealie → User Profile → API Tokens → Create).
5. Tap **Save Settings**.
6. Tap **Test Connection** — it should say "Connected".
7. Navigate to **Recipes**, **Meal Plan**, or **Shopping List**.

---

## Installing as an iPhone App

1. Open the app URL in **Safari** on your iPhone.
2. Tap the **Share** button (box with arrow icon at the bottom of Safari).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

The app now opens full-screen without the browser bar. HTTPS is required for this to work reliably — see the proxy setup below.

---

## Docker Deployment

### Build and run

```bash
docker compose up --build -d
```

The app is served on host port **8088**.

### Same-origin API proxy

The built-in Nginx config proxies `/api/*` to the Mealie instance at the address in `MEALIE_UPSTREAM` inside `docker-compose.yml`. This avoids cross-origin issues in the browser.

After deploying, set the app's **Mealie Base URL** in Settings to the **app's own address**, not the raw Mealie URL:

```
http://YOUR-SERVER-IP:8088
```

### Portainer deployment

1. Open Portainer → **Stacks** → **Add stack**.
2. Paste the contents of `docker-compose.yml`.
3. Deploy.
4. Confirm the container is running and reachable on port `8088`.

---

## HTTPS Setup (Nginx Proxy Manager)

iPhone requires HTTPS for service workers, home screen installation, and reliable standalone behavior.

### What you need

- This app deployed in Docker.
- A domain or subdomain pointing to your server (e.g. `recipes.yourdomain.com`).
- Nginx Proxy Manager (or any reverse proxy that can issue Let's Encrypt certificates).

### Steps

1. Confirm the app works at `http://YOUR-SERVER-IP:8088`.
2. Open Nginx Proxy Manager → **Proxy Hosts** → **Add Proxy Host**.
3. **Domain Names**: your subdomain.
4. **Scheme**: `http`.
5. **Forward Hostname / IP**: your server's LAN IP.
6. **Forward Port**: `8088`.
7. On the **SSL** tab: select **Request a new SSL certificate**, enable **Force SSL**, accept the Let's Encrypt terms, and save.
8. Update the app's **Mealie Base URL** in Settings to the `https://` address.
9. Re-add to iPhone home screen after switching to HTTPS.

---

## Apple Shortcuts — Export Shopping List to Reminders

The **Export to Reminders** button sends every unchecked shopping list item to Apple Reminders via a custom Shortcut.

### How it works

When you tap **Export to Reminders**, the app launches a URL like this:

```
shortcuts://run-shortcut?name=Add%20to%20Reminders&input=text&text=Apples%0AMilk%0ABread
```

Each item is separated by a newline (`%0A`). iOS opens the Shortcuts app, which receives the full list as text input, splits it line by line, and creates one Reminder per item.

### Before you start

You only need to create this shortcut once. It lives on your iPhone. The app just tells it to run.

---

### Step 1 — Create a new shortcut

1. Open the **Shortcuts** app on your iPhone.
2. Tap **+** in the top-right corner.
3. Tap the name area at the top → **Rename**.
4. Type exactly:
   ```
   Add to Reminders
   ```
   Spelling, spaces, and capitalisation must match exactly.
5. Tap **Done**.

---

### Step 2 — Add the Split Text action

6. Tap **Add Action** (or the search bar at the bottom).
7. Search for **Split Text** and tap it to add it.
8. Inside the **Split Text** action:
   - You will see a blue pill labelled something like **Clipboard** or **Provided Input** in the Text field. Tap that pill.
   - If a menu appears, choose **Shortcut Input**. If it already says **Shortcut Input**, leave it.
   - Tap the separator control below it (shows **Every Character** by default).
   - Change it to **New Lines**.

---

### Step 3 — Add the Repeat with Each action

9. Tap **+** below the Split Text action.
10. Search for **Repeat with Each** and tap it.
11. The **Repeat with Each** input pill should automatically say **Split Text** (the output from step 2). If not, tap the pill and choose **Split Text**.

---

### Step 4 — Skip blank lines (strongly recommended)

12. Tap inside the **Repeat** block to add an action inside it.
13. Search for **If** and tap it.
14. Configure the **If** condition:
    - First field: tap it → choose **Repeat Item**.
    - Middle field (condition): choose **is not**.
    - Last field: leave it completely blank (no text).
15. The next action goes **inside the If block**, between **If** and **End If**.

---

### Step 5 — Add the reminder action

16. Tap **+** inside the **If** block (between **If** and **End If**).
17. Search for **Add New Reminder** and tap it.
18. Inside **Add New Reminder**:
    - Tap the **Reminder** title field (where it says "Remind me to…"). Delete any placeholder text.
    - Tap the variable icon (looks like a box/magic wand) and choose **Repeat Item**.
    - Tap the **List** row and choose the Reminders list you want — e.g. **Groceries**.

---

### Step 6 — Save and test

19. Tap the **play ▶ button** at the very bottom to do a test run. When iOS asks for permission to access Reminders, tap **Allow**.
20. Tap **Done** to save the shortcut.

Now go to **Shopping List** in the app and tap **Export to Reminders**. Your unchecked items should appear in Reminders within a few seconds.

---

### Troubleshooting

| Problem | Fix |
|---|---|
| "Shortcut not found" | The shortcut name must be exactly `Add to Reminders` — check for extra spaces or different capitalisation |
| Nothing appears in Reminders | Open the Shortcuts app and run the shortcut manually first. Check that Reminders permission was granted |
| Each item is one letter | **Split Text** separator is set to **Every Character** instead of **New Lines** — fix that in Step 2 |
| All items become one reminder | **Split Text** was not added, or the **Repeat with Each** is looping over the wrong thing |
| Empty reminders appear | Add the **If / is not empty** check from Step 4 |
| iOS shows a confirmation dialog every time | Go to iPhone **Settings → Shortcuts** and disable **Confirm Shortcuts to Run** |
| The Shortcuts app opens but nothing happens | Make sure you are running iOS 15 or later |

---

## Mealie API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users/self` | Verify token, get user ID |
| GET | `/api/users/{id}/favorites` | Load server-synced favourites |
| POST | `/api/users/{id}/favorites/{slug}` | Add favourite |
| DELETE | `/api/users/{id}/favorites/{slug}` | Remove favourite |
| GET | `/api/recipes` | Recipe library |
| GET | `/api/recipes/{slug}` | Recipe detail |
| PUT | `/api/recipes/{slug}` | Save recipe edits |
| PUT | `/api/recipes/{slug}/image` | Upload recipe photo |
| DELETE | `/api/recipes/{slug}` | Delete recipe |
| GET | `/api/households/mealplans` | Meal plan entries |
| POST | `/api/households/mealplans` | Create meal plan entry |
| PUT | `/api/households/mealplans/{id}` | Edit meal plan entry |
| DELETE | `/api/households/mealplans/{id}` | Delete meal plan entry |
| GET | `/api/households/shopping/lists` | Shopping list index |
| GET | `/api/households/shopping/lists/{id}` | Shopping list detail |
| PUT | `/api/households/shopping/items/{id}` | Check/uncheck item |
| POST | `/api/households/shopping/lists/{id}/recipe/{recipeId}` | Add recipe to list |

---

## Project Structure

```
.
├── public/icons/           # PWA icons (replace with final assets)
├── nginx/                  # Nginx config template
├── src/
│   ├── app/                # Context providers (settings, header slots)
│   ├── components/         # Shared UI components
│   ├── hooks/              # Custom hooks (pull-to-refresh, stored state)
│   ├── lib/                # API client, cache, utilities
│   ├── pages/              # Route-level page components
│   └── types/              # TypeScript types for Mealie API
├── Dockerfile
├── docker-compose.yml
├── tailwind.config.ts
└── vite.config.ts
```
