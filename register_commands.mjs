const APP_ID = process.env.DISCORD_APP_ID;       // Application ID
const GUILD_ID = process.env.DISCORD_GUILD_ID;   // テスト用サーバーID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; // Bot Token
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID ?? APP_ID;
const COMMAND_NAME = process.env.POW_COMMAND_NAME ?? "pow";

if (!APPLICATION_ID || !GUILD_ID || !BOT_TOKEN) {
  console.error(
    "Set DISCORD_APPLICATION_ID (or DISCORD_APP_ID), DISCORD_GUILD_ID, DISCORD_BOT_TOKEN env vars."
  );
  process.exit(1);
}

// Guildコマンド（反映が速い）
const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`;

const commands = [
  { name: COMMAND_NAME, description: "PoW認証URLを発行します", type: 1 }
];

const res = await fetch(url, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bot ${BOT_TOKEN}`
  },
  body: JSON.stringify(commands)
});

const text = await res.text();
if (!res.ok) {
  console.error("Failed:", res.status, text);
  process.exit(1);
}
console.log("Registered commands:", text);
