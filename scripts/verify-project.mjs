import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const checks = [];
function check(label, test) {
  assert.ok(test, label);
  checks.push(label);
}

const packageJson = JSON.parse(read("package.json"));
const html = read("index.html");
const main = read("src/main.jsx");
const apiClient = read("src/lib/api.js");
const app = read("src/App.jsx");
const vite = read("vite.config.js");
const api = read("api/index.js");
const workflow = read(".github/workflows/deploy-pages.yml");

check("Vite HTML entry exists and points to the JavaScript React entrypoint",
  existsSync("src/main.jsx") && !existsSync("src/main.tsx") && !existsSync("src/App.tsx") && /src\/main\.jsx/.test(html) && !/src\/main\.tsx/.test(html));
check("Offline storefront cache is only used for network failures, not HTTP errors",
  /if\(!e\?\.status&&method===["']GET["']&&path\.startsWith\(["']\/api\/storefront\/["']\)\)/.test(apiClient));
check("Public storefront cache keys use the same encoded path for reads and writes",
  /qc_public_["']\+path/.test(apiClient) && /qc_public_\/api\/storefront\/["']\+encodeURIComponent\(route\.slug\)/.test(app));
check("API client is isolated in a dedicated module and imported by the app",
  /from ["']\.\/lib\/api\.js["']/.test(app) && /export \{ api \}/.test(apiClient) && /AbortController/.test(apiClient) && /isPublicStorefront/.test(apiClient));
check("React entrypoint imports the active app and global stylesheet",
  /from ["']\.\/App\.jsx["']/.test(main) && /import ["']\.\/index\.css["']/.test(main));
check("Production entrypoint includes a render-error boundary",
  /FatalBoundary/.test(main) && /getDerivedStateFromError/.test(main));
check("Only one Vite configuration is present and GitHub Pages base path is explicit",
  !existsSync("vite.config.ts") && /VITE_GITHUB_PAGES/.test(vite) && /\/QuickCart\//.test(vite));
check("Package exposes build, API-server, and local-development commands",
  Boolean(packageJson.scripts?.build && packageJson.scripts?.server && packageJson.scripts?.dev));
check("Public customer cart cache is scoped to both store and normalized email",
  /qc_cart:/.test(app) && /emailOf\(customer\?\.email\)/.test(app) && /storeId\+":"\+email/.test(app));
check("Customer order history requires a customer-authenticated API route",
  /app\.get\('\/api\/customer\/orders',customerAuth/.test(api));
check("Order creation validates the signed-in customer token and uses its email",
  /app\.post\('\/api\/orders',async/.test(api) &&
  /p\?\.role==='customer'/.test(api) &&
  /customerPayload\.email/.test(api) &&
  /CUSTOMER_AUTH_REQUIRED/.test(api));
check("Order idempotency has a database uniqueness constraint",
  /createIndex\(\{storeId:1,clientOrderId:1\},\{unique:true/.test(api));
check("Seller order deletion is scoped to the seller's own store",
  /app\.delete\('\/api\/orders\/:id',auth/.test(api) &&
  /deleteOne\(\{id:req\.params\.id,storeId:store\.id\}\)/.test(api));
check("Customer checkout defaults to pickup",
  /\[ful,setFul\]=useState\("pickup"\)/.test(app));
check("Checkout retries reuse an idempotency key only for the same cart and checkout details",
  /checkoutFingerprint=JSON\.stringify/.test(app) && /savedCheckout\.fingerprint===checkoutFingerprint/.test(app) && /localStorage\.setItem\(clientOrderKey,JSON\.stringify\(\{id:clientOrderId,fingerprint:checkoutFingerprint\}\)\)/.test(app) && /localStorage\.removeItem\(clientOrderKey\)/.test(app));
check("Deployment workflow checks backend syntax and verifies live sitemap files",
  /node --check api\/index\.js/.test(workflow) &&
  /Verify live SEO files/.test(workflow) &&
  /sitemap\.xml/.test(workflow));

console.log(`QuickCart project checks passed: ${checks.length}/${checks.length}`);
for (const label of checks) console.log(`✓ ${label}`);
