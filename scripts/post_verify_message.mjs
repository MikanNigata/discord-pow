const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.VERIFY_CHANNEL_ID;

if (!token || !channelId) {
  console.error("DISCORD_BOT_TOKEN and VERIFY_CHANNEL_ID are required");
  process.exit(1);
}

const body = {
  content:
    "**認証（PoW）**\n" +
    "下の **認証開始** を押して、表示されたリンクを開いてください。\n" +
    "数秒待つと自動でロールが付与されます。",
  components: [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 1, // Primary
          custom_id: "pow_start",
          label: "認証開始",
        },
      ],
    },
  ],
};

const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
  method: "POST",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

console.log("status:", res.status);
console.log(await res.text());
