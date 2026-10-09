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
const css = read("src/index.css");
const serviceWorker = read("public/sw.js");
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
check("Storefront carts persist for guests and customers, stay store-scoped, and merge guest items on sign-in",
  /qc_cart:/.test(app) && /emailOf\(customer\?\.email\)/.test(app) &&
  /storeId\+":"\+\(email\|\|"guest"\)/.test(app) &&
  /localStorage\.getItem\("qc_cart:"\+storeId\+":guest"\)/.test(app) &&
  /localStorage\.setItem\("qc_cart:"\+owner,JSON\.stringify\(cart\)\)/.test(app) &&
  /localStorage\.removeItem\("qc_cart:"\+storeId\+":guest"\)/.test(app));
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
check("Customer accounts cannot retain seller credentials or enter the seller dashboard",
  /localStorage\.removeItem\("quickcart_token"\);localStorage\.removeItem\("quickcart_store_id"\);localStorage\.removeItem\("quickcart_login_at"\);localStorage\.setItem\("quickcart_customer_token"/.test(app) &&
  /if\(route\.type!=="app"\|\|!\(customerSession\|\|localStorage\.getItem\("quickcart_customer_token"\)\)\)return;localStorage\.removeItem\("quickcart_token"\)/.test(app) &&
  /if\(\(route\.type==="app"\|\|route\.type==="auth"\)&&\(customerSession\|\|localStorage\.getItem\("quickcart_customer_token"\)\)\)return <Landing/.test(app) &&
  /localStorage\.removeItem\("quickcart_customer_token"\);localStorage\.removeItem\("quickcart_customer"\);setCustomerSession\(null\);localStorage\.setItem\("quickcart_token"/.test(app));
check("Product add-more button gets a full-width row after an item is added",
  /public-product-actions"\+\(qty>0\?" has-quantity":""\)/.test(app) &&
  /\.public-store-page \.public-product-actions\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/.test(css) &&
  /\.public-store-page \.public-product-actions>\.primary-button\{[\s\S]*?width:100%/.test(css));
check("Customer checkout defaults to pickup",
  /\[ful,setFul\]=useState\("pickup"\)/.test(app));
check("Checkout retries reuse an idempotency key only for the same cart and checkout details",
  /checkoutFingerprint=JSON\.stringify/.test(app) && /savedCheckout\.fingerprint===checkoutFingerprint/.test(app) && /localStorage\.setItem\(clientOrderKey,JSON\.stringify\(\{id:clientOrderId,fingerprint:checkoutFingerprint\}\)\)/.test(app) && /localStorage\.removeItem\(clientOrderKey\)/.test(app));
check("Customer receipt OCR validates uploads and always releases worker resources",
  /file\.size>10\*1024\*1024/.test(app) &&
  /if\(worker\)try\{await worker\.terminate\(\)\}catch\{\}/.test(app) &&
  /URL\.revokeObjectURL\(preview\)/.test(app));
check("Checkout idempotency does not reuse un-fingerprinted legacy keys",
  /savedCheckout&&typeof savedCheckout==="object"&&savedCheckout\.fingerprint===checkoutFingerprint\?savedCheckout\.id:""/.test(app) &&
  !/typeof savedCheckout==="string"\?savedCheckout/.test(app));
check("Deployment workflow checks backend syntax and verifies live sitemap files",
  /node --check api\/index\.js/.test(workflow) &&
  /Verify live SEO files/.test(workflow) &&
  /sitemap\.xml/.test(workflow));

check("Restored cart is not cleared before storefront products finish loading",
  /if\(!data\?\.store\|\|!Array\.isArray\(data\?\.products\)\)return;/.test(app));

check("Adding the first product automatically focuses the cart without a cart/tracking toggle",
  /const adding=Number\(next\)>Number\(cart\[id\]\|\|0\);\s*if\(adding&&items\.length===0\)setFocusCartAfterAdd\(true\)/.test(app) &&
  /if\(!focusCartAfterAdd\|\|!items\.length\)return;setFocusCartAfterAdd\(false\);requestAnimationFrame\(\(\)=>document\.getElementById\("public-checkout"\)\?\.scrollIntoView/.test(app) &&
  !/setPanelsExpanded|panelsExpanded|panelsPreferenceStore/.test(app));
check("Guest cart quantities merge with the signed-in customer cart instead of overwriting matching products",
  /const merged=\{\.\.\.safeSaved\};if\(email\)for\(const \[id,qty\] of Object\.entries\(safeGuest\)\)merged\[id\]=\(Math\.max\(0,Number\(merged\[id\]\)\|\|0\)\+Math\.max\(0,Number\(qty\)\|\|0\)\)/.test(app));

check("Successful checkout scrolls to automatically rendered order tracking",
  /id="customer-order-tracking" className="panel customer-order-status"/.test(app) &&
  /requestAnimationFrame\(\(\)=>document\.getElementById\("customer-order-tracking"\)\?\.scrollIntoView/.test(app));

check("First product added focuses the automatically visible cart while quantity controls stay linked to cart state",
  /\[focusCartAfterAdd,setFocusCartAfterAdd\]=useState\(false\)/.test(app) &&
  /if\(adding&&items\.length===0\)setFocusCartAfterAdd\(true\)/.test(app) &&
  /if\(!focusCartAfterAdd\|\|!items\.length\)return;setFocusCartAfterAdd\(false\);requestAnimationFrame\(\(\)=>document\.getElementById\("public-checkout"\)\?\.scrollIntoView/.test(app) &&
  /onClick=\{\(\)=>updateCart\(x\.id,qty\+1\)\}/.test(app));

check("Server order history remains authoritative after reload while preserving local WhatsApp handoff state",
  /const cachedById=new Map\(cached\.map\(o=>\[String\(o\.id\),o\]\)\)/.test(app) &&
  /whatsappSent:cachedById\.get\(String\(o\.id\)\)\?\.whatsappSent===true/.test(app) &&
  /setCustomerOrders\(remote\.map\(o=>/.test(app) &&
  /setCustomerOrders\(current=>freshOrders\.orders\.filter/.test(app) &&
  /whatsappSent:current\.find\(c=>c\.id===o\.id\)\?\.whatsappSent===true/.test(app));
check("Customer order quantity changes validate stock, preserve minimum quantities, and restore stock on reductions or cancellations",
  /\/api\/orders\/:id\/customer-update/.test(api) &&
  /customerConfirmationTokenHash/.test(api) &&
  /status:\{\$in:\['new','confirmed'\]\}/.test(api) &&
  /\$inc:\{stock:Math\.max\(0,Number\(item\.quantity\)\|\|0\)\}/.test(api) &&
  /\$inc:\{stock:1\}/.test(api) &&
  /if\(action==='increase'\)/.test(api) &&
  /stock:\{\$gt:0\}/.test(api) &&
  /Each item must stay at quantity 1 or more/.test(api));
check("Customer order tracking exposes plus/minus and cancel actions and refreshes storefront data after changes",
  /onModifyOrder/.test(app) &&
  /action:"reduce",itemId:item\.id/.test(app) &&
  /action:"increase",itemId:item\.id/.test(app) &&
  /action:"cancel"/.test(app) &&
  /onStoreRefresh\?\.\(fresh\)/.test(app) &&
  /onStoreRefresh=\{setPublicData\}/.test(app));
check("Customer order edits recover securely through a signed-in customer session when the per-order token is absent",
  /const customerToken=localStorage\.getItem\("quickcart_customer_token"\)/.test(app) &&
  /headers:customerToken\?\{Authorization:"Bearer "\+customerToken\}:\{\}/.test(app) &&
  /payload\?\.role==='customer'/.test(api) &&
  /String\(payload\?\.email\|\|''\)\.trim\(\)\.toLowerCase\(\)===String\(order\.customerEmail\|\|''\)\.trim\(\)\.toLowerCase\(\)/.test(api));
check("Startup no longer deletes saved customer order confirmation tokens",
  /localStorage\.setItem\("qc_order_reset_v1","done"\)/.test(app) &&
  !/localStorage\.removeItem\(key\)[^\n]*qc_customer_orders|key\.startsWith\("qc_order_token:"\)[^\n]*removeItem/.test(app));
check("Order-edit controls validate successful server responses, show action-specific loading states, and prevent duplicate requests",
  /if\(busy===order\.id\)return/.test(app) &&
  /setMsg\(e\.message\|\|"Could not update this order/.test(app) &&
  app.includes('finally{setBusy("");setBusyAction("")}') &&
  /if\(!order\|\|busy\|\|orderEditBusy\)return/.test(app) &&
  /if\(!result\?\.order\?\.id\)throw new Error/.test(app) &&
  /busyAction==="update"\?"Updating…":"Confirming…"/.test(app) &&
  /editableOrderLines\.filter\(item=>String\(item\.id\)===String\(x\.id\)\)/.test(app));
check("Cart and order tracking appear automatically only for the active store's actual data",
  !/public-cart-tracking-toggle|panelsExpanded|panelsPreferenceStore|setPanelsExpanded/.test(app) &&
  /const hasCheckoutItems=items\.length>0/.test(app) &&
  /\(hasCheckoutItems\|\|customerOrders\.length>0\)&&<div className="public-cart-tracking-stack">/.test(app) &&
  /hasCheckoutItems&&\(<section id="public-checkout" className="panel public-checkout">/.test(app) &&
  /customerOrders\.length>0&&<div className="customer-tracking-wrap">/.test(app) &&
  /setCustomerOrders\(\[\]\);[\s\S]*?setCustomerOrdersHydrated\(false\)/.test(app) &&
  /saved\.filter\(o=>String\(o\.storeId\|\|storeId\)===String\(storeId\)\)/.test(app) &&
  /\.public-cart-tracking-stack \.customer-tracking-wrap\{[\s\S]*?grid-column:1 \/ -1/.test(css));
check("Customer order quantities use plus and minus controls and are updated by the backend",
  /action:"increase"/.test(app) && /action:"reduce"/.test(app) &&
  /!\['reduce','increase'\]\.includes\(action\)/.test(api) && /action==='increase'/.test(api) && /stock:\{\$gt:0\}/.test(api) &&
  /Each item must stay at quantity 1 or more/.test(api));

check("Service worker refreshes cached shell and fetches JS/CSS assets network-first",
  /const CACHE = 'quickcart-shell-v5'/.test(serviceWorker) &&
  serviceWorker.includes("const isAsset = /\\.(?:js|css)(?:$|\\?)/i") &&
  serviceWorker.includes("fetch(request, { cache: 'no-store' })"));

console.log(`QuickCart project checks passed: ${checks.length}/${checks.length}`);
for (const label of checks) console.log(`✓ ${label}`);
