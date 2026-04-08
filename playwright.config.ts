import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  timeout: 60000,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
  },
};

export default config;
