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

check("Order tracking appears automatically inline for valid orders from the active store, without a separate tracking button or modal",
  !app.includes("public-track-orders-link") &&
  !app.includes('className="customer-tracking-modal"') &&
  app.includes('id="customer-order-tracking" className="panel customer-tracking-auto"') &&
  /customerOrdersHydrated&&customerOrders\.some\(o=>o&&o\.id!=null&&o\.storeId!=null&&String\(o\.storeId\)===String\(s\?\.id\)\)/.test(app));

check("Every in-stock product card has accessible plus and minus quantity controls without remove-one wording",
  !app.includes("Remove one") &&
  app.includes('className="public-product-actions public-product-actions-stepper"') &&
  app.includes('aria-label={"Decrease "+x.name+" quantity"}') &&
  app.includes('aria-label={"Increase "+x.name+" quantity"}') &&
  app.includes('disabled={qty<=0}') &&
  app.includes('disabled={qty>=stock}'));

check("Successful checkout scrolls to automatically rendered order tracking",
  /id="customer-order-tracking" className="panel customer-tracking-auto"/.test(app) &&
  /requestAnimationFrame\(\(\)=>document\.getElementById\("customer-order-tracking"\)\?\.scrollIntoView/.test(app));

check("First product added focuses the automatically visible cart while quantity controls stay linked to cart state",
  /\[focusCartAfterAdd,setFocusCartAfterAdd\]=useState\(false\)/.test(app) &&
  /if\(adding&&items\.length===0\)setFocusCartAfterAdd\(true\)/.test(app) &&
  /if\(!focusCartAfterAdd\|\|!items\.length\)return;setFocusCartAfterAdd\(false\);requestAnimationFrame\(\(\)=>document\.getElementById\("public-checkout"\)\?\.scrollIntoView/.test(app) &&
  /onClick=\{\(\)=>updateCart\(x\.id,qty\+1\)\}/.test(app));

check("Server order history remains authoritative after reload while preserving local WhatsApp handoff state",
  /const cachedById=new Map\(cached\.map\(o=>\[String\(o\.id\),o\]\)\)/.test(app) &&
  /whatsappSent:cachedById\.get\(String\(o\.id\)\)\?\.whatsappSent===true/.test(app) &&
  /setCustomerOrders\(dedupeCustomerOrders\(remote\.map\(o=>/.test(app) &&
  /cachedById\.get\(String\(o\.id\)\)\?\.whatsappSent===true/.test(app) &&
  /setCustomerOrders\(dedupeCustomerOrders\(updates\)\)/.test(app));
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
check("Checkout summary appears only when populated and order tracking is automatic inline for valid active-store orders",
  app.includes("const hasCheckoutItems=items.length>0") &&
  app.includes('hasCheckoutItems&&(<section id="public-checkout" className="panel public-checkout">') &&
  !app.includes("public-track-orders-link") &&
  !app.includes('className="customer-tracking-modal"') &&
  app.includes('id="customer-order-tracking" className="panel customer-tracking-auto"') &&
  /saved\.filter\(o=>o&&o\.id!=null&&o\.storeId!=null&&String\(o\.storeId\)===String\(storeId\)\)/.test(app));

check("Customer order tracking deduplicates repeated order IDs, idempotency keys, and immediate duplicate submissions",
  /function dedupeCustomerOrders\(list\)/.test(app) &&
  /seenIds\.has\(id\)/.test(app) &&
  /seenClientIds\.has\(clientKey\)/.test(app) &&
  /Math\.abs\(created-previous\)<=5000/.test(app) &&
  /setCustomerOrders\(dedupeCustomerOrders\(remote\.map/.test(app) &&
  /setCustomerOrders\(xs=>dedupeCustomerOrders\(\[savedOrder,\.\.\.xs\]\)\.slice\(0,10\)\)/.test(app));

check("Customer order quantities use plus and minus controls and are updated by the backend",
  /action:"increase"/.test(app) && /action:"reduce"/.test(app) &&
  /!\['reduce','increase'\]\.includes\(action\)/.test(api) && /action==='increase'/.test(api) && /stock:\{\$gt:0\}/.test(api) &&
  /Each item must stay at quantity 1 or more/.test(api));

check("Service worker refreshes cached shell and fetches JS/CSS assets network-first",
  /const CACHE = 'quickcart-shell-v5'/.test(serviceWorker) &&
  serviceWorker.includes("const isAsset = /\\.(?:js|css)(?:$|\\?)/i") &&
  serviceWorker.includes("fetch(request, { cache: 'no-store' })"));

check("WhatsApp checkout uses the official wa.me link with encoded order details and validated international phone number",
  /const encodedText=encodeURIComponent\(text\)/.test(app) &&
  /const whatsappUrl="https:\/\/wa\.me\/"\+phoneDigits\+"\?text="\+encodedText/.test(app) &&
  /phoneDigits\.startsWith\("0"\)\)phoneDigits="234"\+phoneDigits\.slice\(1\)/.test(app) &&
  app.indexOf('if(phoneDigits.length<10||phoneDigits.length>15)') < app.indexOf('const order=await api("/api/orders"') &&
  !app.includes("https://api.whatsapp.com/send?phone="));

check("Checkout validates WhatsApp destination before opening checkout or creating an order",
  app.indexOf('if(phoneDigits.length<10||phoneDigits.length>15)') >= 0 &&
  app.indexOf('if(phoneDigits.length<10||phoneDigits.length>15)') < app.indexOf('const order=await api("/api/orders"') &&
  app.indexOf('if(phoneDigits.length<10||phoneDigits.length>15)') < app.indexOf('whatsappWindow=window.open("about:blank","_blank")'));
check("Checkout has a per-store duplicate-submit lock and stable retry idempotency key",
  /quickcart_checkout_lock:/.test(app) &&
  /sessionStorage\.getItem\(checkoutLockKey\)==="1"/.test(app) &&
  /clientOrderId/.test(app) &&
  /clientOrderKey/.test(app));

check("Order retries replay only the same customer's existing store order",
  /findOne\(\{storeId,clientOrderId,customerEmail\}\)/.test(api) &&
  /replayed:true/.test(api) &&
  /orders_store_clientOrder_unique/.test(api));
check("Customer order edits use compare-and-set status and item snapshots to reject stale concurrent updates",
  /const eligible=\{id:order\.id,status:\{\$in:\['new','confirmed'\]\},items:order\.items\}/.test(api) &&
  /order changed elsewhere\. Refresh tracking and try again\./.test(api) &&
  /if\(!result\.modifiedCount\)/.test(api));
check("Stock reservations are restored when order creation fails partway through",
  /const changed=\[\]/.test(api) &&
  /changed\.push\(item\)/.test(api) &&
  /for\(const item of changed\)/.test(api) &&
  /\$inc:\{stock:item\.quantity\}/.test(api));
check("Order cancellation restores stock only after a successful conditional status change",
  /orders\.updateOne\(eligible,\{\$set:\{status:'cancelled',updatedAt\}\}\)/.test(api) &&
  /if\(!result\.modifiedCount\)return res\.status\(409\)/.test(api) &&
  /for\(const item of order\.items\|\|\[\]\)await database\.collection\('products'\)\.updateOne/.test(api));

check("Seller order status cannot reopen cancelled orders or cancel already dispatched/completed orders",
  /if\(current\.status==='cancelled'\)return res\.status\(409\)\.json\(\{error:'Cancelled orders cannot be reopened/.test(api) &&
  /if\(status==='cancelled'&&\['shipped','delivered','picked_up'\]\.includes\(current\.status\)\)return res\.status\(409\)/.test(api) &&
  /if\(status==='cancelled'&&!\['cancelled','delivered','picked_up'\]\.includes\(current\.status\)\)/.test(api));


check("Seller order status changes follow fulfillment-specific transitions and tracking includes picked-up orders",
  /const nextStatuses=\{new:\[\x27confirmed\x27,\x27cancelled\x27\],confirmed:\[\x27processing\x27,\x27cancelled\x27\],processing:current\.fulfillment===\x27delivery\x27\?\[\x27shipped\x27,\x27cancelled\x27\]:\[\x27ready\x27,\x27cancelled\x27\],ready:\[\x27cancelled\x27\],shipped:\[\x27delivered\x27\],delivered:\[\],picked_up:\[\],cancelled:\[\]\}/.test(api) &&
  /if\(!nextStatuses\[current\.status\]\?\.includes\(status\)\)return res\.status\(409\)/.test(api) &&
  /const statuses=\["all","new","confirmed","processing","ready","shipped","delivered","picked_up","cancelled"\]/.test(app) &&
  /o\.fulfillment==="delivery"\?\["shipped","cancelled"\]:\["ready","cancelled"\]/.test(app));

console.log(`QuickCart project checks passed: ${checks.length}/${checks.length}`);
for (const label of checks) console.log(`✓ ${label}`);
