import { env } from "./src/config/env.js";
import { connectDb } from "./src/config/db.js";
import { createApp } from "./src/app.js";

async function start() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
