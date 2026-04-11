# Private Culinary Journal

A React + TypeScript PWA that acts as a polished mobile-first frontend for your self-hosted [Mealie](https://mealie.io) instance. Designed for iPhone home screen installation, warm editorial styling, and fast everyday cooking access.

---

## Features

### Recipes
- Browse your entire Mealie recipe library in **grid**, or **swipe card** view.
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
- **Export to Reminders** — sends all shopping list items to an Apple Shortcut in one tap (see setup guide below).

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

The **Export to Reminders** button sends every shopping list item to Apple Reminders via a custom Shortcut.

### How it works

When you tap **Export to Reminders**, the app launches a URL like this:

```
shortcuts://run-shortcut?name=Add%20to%20Reminders&input=text&text=Apples%0AMilk%0ABread
```

Each item is separated by a newline (`%0A`). iOS opens the Shortcuts app, which receives the full list as text input, splits it line by line, and creates one Reminder per item.

### Shortcut setup

The Shortcuts editor changes between iOS releases. On iOS 26 the labels and button locations are different from older screenshots, so the reliable way to build this is to follow the shortcut logic below rather than exact taps.

You only need to create this shortcut once. It lives on your iPhone. The app just tells it to run.

1. Open **Shortcuts** and create a new shortcut named exactly `Add to Reminders`.
2. Add a **Split Text** action.
3. Set the **Split Text** input to the shortcut's incoming text.
    On newer iOS versions this variable may appear as `Input`, `Shortcut Input`, or already be filled in automatically.
4. Set the **Split Text** separator to **New Lines**.
5. Add a **Repeat with Each** action using the output from **Split Text**.
6. Inside the repeat block, add an **If** action with the condition `Repeat Item` `is not empty`.
7. Inside that `If` block, add **Add New Reminder** or **Add Reminder**.
8. Set the reminder title to `Repeat Item`.
9. Choose the Reminders list you want, such as `Groceries`.
10. Save the shortcut, then run it manually once from the Shortcuts app and allow Reminders access when prompted.

The final shortcut flow should be:

```text
Input -> Split Text (New Lines) -> Repeat with Each -> If Repeat Item is not empty -> Add Reminder
```

After that, go to **Shopping List** in the app and tap **Export to Reminders**. Your items should appear in Reminders within a few seconds.

---

### Troubleshooting

| Problem | Fix |
|---|---|
| "Shortcut not found" | The shortcut name must be exactly `Add to Reminders` — check for extra spaces or different capitalisation |
| Nothing appears in Reminders | Open the Shortcuts app and run the shortcut manually first. Check that Reminders permission was granted |
| Each item is one letter | **Split Text** separator is set to **Every Character** instead of **New Lines** — fix that in Step 2 |
| All items become one reminder | **Repeat with Each** is using the wrong input — point it at the output of **Split Text** |
| Empty reminders appear | Add the `If Repeat Item is not empty` check before **Add Reminder** |
| The editor looks different from this README | That is expected on newer iOS versions. Look for the same actions and use the shortcut's incoming text as the source input |
| iOS shows a confirmation dialog every time | In newer iOS versions this setting moves around. Search iPhone Settings for `Shortcuts` and disable the run confirmation if Apple still exposes it |
| The Shortcuts app opens but nothing happens | Open the shortcut and confirm it still uses incoming shortcut text, then run it manually once to grant permissions |

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
