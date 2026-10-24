import * as path from "path";

// Load the root .env file if available (local development)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
} catch {
  // In production / Docker, environment variables are already in process.env
}

export default {
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
};

