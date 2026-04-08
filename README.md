# Private Culinary Journal

Private Culinary Journal is a React + TypeScript + Vite Progressive Web App that acts as a custom frontend for a self-hosted Mealie instance. The interface is tuned for iOS standalone install behavior, a warm editorial visual language, and fast access to recipes, meal plans, shopping lists, and device-local settings.

## What This App Includes

- A standalone-capable PWA shell configured for iPhone home screen install behavior.
- A fixed-header, fixed-tab layout where only the content area scrolls.
- A Mealie API integration layer using a configurable base URL and Bearer token.
- Four primary routes: Recipes, Meal Plan, Shopping List, and Settings.
- Recipe browsing with title-and-ingredient search plus list, grid, and swipe-card views.
- Meal plan date shortcuts that scroll the schedule to the selected day.
- A shopping list optimized for immediate checkbox feedback.
- An iOS Reminders export button that launches a Shortcut with newline-separated unchecked items.
- Docker and Nginx files for Portainer-friendly deployment.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- vite-plugin-pwa
- Framer Motion
- Lucide React

## Default Backend Settings

- Mealie base URL: `http://192.168.1.91:9000`
- API base used by the app: `http://192.168.1.91:9000/api/`
- Connection test endpoint: `/api/users/self`

## Local Development

### Prerequisites

- Node.js 20 or newer
- npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Vite is configured to listen on port `4173` and bind to `0.0.0.0`.

### Create a production build

```bash
npm run build
```

## First-Time App Setup

1. Open the app.
2. Go to `Settings`.
3. Leave the default Mealie base URL unless your server address is different.
4. Paste a long-lived Mealie API token.
5. Tap `Save Settings`.
6. Tap `Test Connection`.
7. If the test succeeds, go back to `Recipes`, `Meal Plan`, or `Shopping List`.

## Mealie API Notes

This client is built against the live Mealie OpenAPI schema from your server. The main endpoints used are:

- `GET /api/users/self`
- `GET /api/recipes`
- `GET /api/recipes/{slug}`
- `GET /api/households/mealplans`
- `GET /api/households/shopping/lists`
- `GET /api/households/shopping/lists/{item_id}`
- `PUT /api/households/shopping/items/{item_id}`

## PWA Notes

- The app manifest is configured with `display: standalone`.
- Placeholder SVG icons are included in `public/icons/` and should be replaced with final production assets later.
- The layout is intentionally body-locked so the browser frame behaves more like a native app shell.

## Docker Deployment

### Build and run with Docker Compose

```bash
docker compose up --build -d
```

### Default port mapping

- Container port: `80`
- Host port: `8088`

### Same-origin API proxy

The production Nginx container proxies `/api/*` to Mealie using the `MEALIE_UPSTREAM` environment variable from `docker-compose.yml`.

With the current compose file, the app container forwards API calls to:

```text
http://192.168.1.91:9000
```

After deployment, set the app's `Mealie Base URL` to the URL where this client is served, not the raw Mealie URL. Example:

```text
http://192.168.1.91:8088
```

That makes the browser call the app origin for both the UI and `/api`, which avoids the cross-origin request problem.

That means the app will be available at:

```text
http://YOUR-SERVER-IP:8088
```

### Portainer deployment notes

1. Open Portainer.
2. Go to `Stacks`.
3. Create a new stack or update an existing one.
4. Paste the contents of `docker-compose.yml`.
5. Set the stack path to this project if you are deploying from the filesystem, or upload the project files.
6. Deploy the stack.
7. Confirm that the container is healthy and serving traffic on host port `8088`.

## Project Structure

```text
.
├── public/icons/
├── nginx/
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   └── types/
├── Dockerfile
├── docker-compose.yml
├── tailwind.config.ts
└── vite.config.ts
```

## Apple Shortcut Setup Guide

This app exports unchecked shopping list items to an Apple Shortcut using the `shortcuts://` URL scheme. The shortcut name must match exactly.

### Goal

Create an iPhone shortcut named exactly:

```text
Add to Reminders
```

### Important note about input from URLs and other apps

Modern iOS does not show a separate toggle named "accept input from URLs." The shortcut becomes ready to receive text from `shortcuts://run-shortcut` as soon as you use the `Shortcut Input` variable inside the shortcut. The steps below do exactly that.

### Tap-by-tap instructions

1. On your iPhone, open the `Shortcuts` app.
2. Tap the `+` button in the top-right corner.
3. Tap the shortcut name at the top.
4. Choose `Rename`.
5. Enter `Add to Reminders` exactly, with spaces and capitalization as shown.
6. Tap `Done`.
7. You are now in the shortcut editor.
8. Tap `Search Actions` at the bottom.
9. Search for `Split Text`.
10. Tap `Split Text` to add it as the first action.
11. In the `Split Text` action, tap the `Text` field.
12. If `Shortcut Input` is already shown, leave it alone.
13. If it is not shown, tap the variable picker and choose `Shortcut Input`.
14. In the same `Split Text` action, tap the separator control.
15. Set the separator to `New Lines`.
16. Tap the action search area again.
17. Search for `Repeat with Each`.
18. Tap `Repeat with Each` to add it below `Split Text`.
19. In the `Repeat with Each` action, make sure the repeated value comes from the `Split Text` result.
20. Tap inside the `Repeat` block where the next action should go.
21. Search for `Add New Reminder`.
22. Tap `Add New Reminder`.
23. In the `Add New Reminder` action, tap the reminder title field.
24. Choose the magic variable `Repeat Item`.
25. Tap the `List` field inside `Add New Reminder`.
26. Pick the Reminders list you want these items to go into, for example `Groceries`.
27. Optional but recommended: add an `If` action inside the repeat block before `Add New Reminder`.
28. Set the condition so it only continues when `Repeat Item` is not empty.
29. Move `Add New Reminder` inside that `If` block if you added it.
30. Tap the play button once to test the shortcut manually.
31. If iOS asks for permission to access Reminders, allow it.
32. Tap `Done` to save the shortcut.

### What the app sends to the shortcut

When you tap `Export to Reminders`, the app gathers all unchecked shopping list items, joins them with newline characters, and launches a URL in this shape:

```text
shortcuts://run-shortcut?name=Add%20to%20Reminders&input=text&text=Apples%0AMilk%0ABread
```

That text becomes `Shortcut Input`, then `Split Text` turns it into one item per line, and `Repeat with Each` creates a reminder for every line.

## Nginx Reverse Proxy and SSL Setup Guide

### Why HTTPS is required on iPhone

iPhone Safari requires a secure context for service workers, installable PWAs, and reliable standalone home screen behavior. In plain terms:

- Without HTTPS, the app may not install correctly.
- Without HTTPS, service workers may not register.
- Without HTTPS, the iOS home screen experience becomes unreliable or unavailable.

If you want this app to behave like a native iOS app after `Add to Home Screen`, you should publish it behind HTTPS.

## Option A: Nginx Proxy Manager

This is the easiest path for most beginners.

### Before you start

You need:

- This app running in Docker or Portainer.
- A domain or subdomain that points to your server.
- Port `80` and `443` forwarded to your reverse proxy if you want a public Let's Encrypt certificate.

### Step-by-step with Portainer and Nginx Proxy Manager

1. Deploy this app first with the included `docker-compose.yml`.
2. Confirm the app works locally at `http://YOUR-SERVER-IP:8088`.
3. Open Nginx Proxy Manager.
4. Go to `Hosts`.
5. Click `Proxy Hosts`.
6. Click `Add Proxy Host`.
7. In `Domain Names`, enter the hostname you want to use, for example `mealie-app.example.com`.
8. Set `Scheme` to `http`.
9. For `Forward Hostname / IP`, enter either:
   - your Docker host LAN IP, for example `192.168.1.91`, if you want to proxy to the mapped host port, or
   - the container or service name if both containers are on the same Docker network.
10. For `Forward Port`, enter `8088` if you are using the mapped host port from the provided compose file.
11. Enable `Block Common Exploits`.
12. Save the proxy host.
13. Open the same proxy host again and go to the `SSL` tab.
14. Choose `Request a new SSL Certificate`.
15. Enable `Force SSL`.
16. Enable `HTTP/2 Support`.
17. Enter your email address for Let's Encrypt notifications.
18. Accept the Let's Encrypt terms.
19. Save again.
20. Wait for certificate issuance to finish.
21. Visit `https://your-domain.example.com` in Safari on your iPhone.
22. Verify that the padlock appears.
23. Tap Safari `Share`.
24. Tap `Add to Home Screen`.

### How the port mapping works

With the provided Docker Compose file:

- Nginx inside the PWA container listens on `80`.
- Docker maps that to host port `8088`.
- Nginx Proxy Manager then forwards external HTTPS traffic to `YOUR-SERVER-IP:8088`.

## Option B: Standard Nginx plus Certbot

If you are not using Nginx Proxy Manager, you can still publish the app with a classic reverse proxy.

### Basic flow

1. Run this container so the app is available on `http://127.0.0.1:8088` or `http://YOUR-SERVER-IP:8088`.
2. Install Nginx on the host machine or another reverse proxy server.
3. Create an Nginx server block for your domain.
4. Proxy HTTPS traffic to `http://127.0.0.1:8088`.
5. Use Certbot to request and install a Let's Encrypt certificate.

### Example reverse proxy block

```nginx
server {
    listen 80;
    server_name mealie-app.example.com;

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Example Certbot command

```bash
sudo certbot --nginx -d mealie-app.example.com
```

After Certbot finishes:

1. Open the HTTPS URL on your iPhone.
2. Confirm the certificate is valid.
3. Add the app to the home screen from Safari.

## Notes for production polish

- Replace the placeholder icons in `public/icons/` with final PNG or SVG assets.
- If you want richer recipe detail interactions, the Mealie favorites and ratings endpoints are available in the API.
- If you expose the app publicly, keep the Mealie server protected and use long-lived tokens sparingly.
