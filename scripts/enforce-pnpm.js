const ua = process.env.npm_config_user_agent || "";

if (!ua.includes("pnpm/")) {
  // eslint-disable-next-line no-console
  console.error("This repository is pnpm-only. Please run commands with pnpm.");
  process.exit(1);
}
