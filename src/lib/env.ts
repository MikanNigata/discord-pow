export interface Env {
  DISCORD_PUBLIC_KEY: string; // hex
  DISCORD_BOT_TOKEN: string;
  VERIFIED_ROLE_ID: string;
  POW_SECRET: string;
  POW_COMMAND_NAME?: string;
  ENABLE_VERIFY_BUTTON?: string;
  ENABLE_POW_SUBMIT?: string;
  ALLOWED_GUILD_IDS?: string;
  POW_TTL_SEC?: string;
  POW_DIFFICULTY_DEFAULT?: string;
  INTERACTIONS_RATE_LIMIT_PER_MIN?: string;
  SUBMIT_RATE_LIMIT_PER_MIN?: string;
  NONCE_STORE: DurableObjectNamespace;
}