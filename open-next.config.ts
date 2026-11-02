import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page is dynamic and nothing uses ISR or `use cache`, so no
// incremental-cache override (R2/KV) is needed.
export default defineCloudflareConfig({});
