import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Lets `next dev` see Cloudflare bindings (via getCloudflareContext) the way
// the deployed Worker does. No-op outside the dev server.
void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {};

export default nextConfig;
