// Prisma config for LivePoll
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

// Load .env.development.local in development, .env in production
dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.development.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
