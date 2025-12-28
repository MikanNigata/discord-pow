# discord-pow

PoW-based Discord role verification built on Cloudflare Workers. Users run a slash command, solve a short proof-of-work in the browser, and the Worker assigns a role when the solution checks out.

## Features
- Slash command `/pow` that issues a short-lived PoW token
- Browser-side PoW calculation (no client install)
- HMAC-signed token verification and role assignment

## Requirements
- Node.js + npm
- Cloudflare Workers + Wrangler v4
- Discord application + bot with "Manage Roles" permission

## Setup
1) Install deps
```bash
npm install
```

2) Register the guild command (fastest for testing)
```bash
# PowerShell example
$env:DISCORD_APP_ID="<app_id>"
$env:DISCORD_GUILD_ID="<guild_id>"
$env:DISCORD_BOT_TOKEN="<bot_token>"
node register_commands.mjs
```

3) Configure secrets for the Worker
```bash
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put VERIFIED_ROLE_ID
wrangler secret put POW_SECRET
```

4) Deploy
```bash
wrangler deploy
```

5) Set your Discord Interaction endpoint URL
- `https://<your-worker-domain>/interactions`

## Usage
- Run `/pow` in your server
- Open the URL, wait for PoW to complete, and the role is assigned automatically

## Config
- `src/index.ts`:
  - `POW_TTL_SEC` token lifetime (seconds)
  - `DIFFICULTY` PoW difficulty (leading zero bits)

## Endpoints
- `POST /interactions`: Discord interaction handler
- `GET /verify`: PoW page
- `POST /api/submit`: PoW submission endpoint

## Notes
- Ensure the bot role is above the target role in the server role hierarchy
- `VERIFIED_ROLE_ID` should be the ID of the role to grant
