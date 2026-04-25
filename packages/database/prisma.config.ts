import * as dotenv from "dotenv";
import * as path from "path";
import { defineConfig } from "@prisma/config";

// Load the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
