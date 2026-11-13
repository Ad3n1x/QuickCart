import fs from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve("dist");
const SITE = "https://ad3n1x.github.io/QuickCart";
const API = String(process.env.VITE_API_URL || "https://quickcart-api-f7x7.onrender.com").replace(/\/$/, "");
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const json = value => JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
const slugOk = value => /^[a-z0-9][a-z0-9_-]{0,90}$/i.test(String(value || ""));
const money = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-NG", { style:"currency", currency:"NGN", maximumFractionDigits:2 }).format(Number(value)) : "";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function fetchJsonWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { headers:{ accept:"application/json" }, signal:AbortSignal.timeout(15000) });
      if (response.ok) return await response.json();
      lastError = new Error("HTTP " + response.status + " from " + url);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts - 1) {
      const delay = 8000 * (attempt + 1);
      console.warn("AEO prerender: retrying API request", attempt + 1, "after", delay, "ms:", lastError?.message || lastError);
      await pause(delay);
    }
  }
  throw lastError || new Error("API request failed: " + url);
}

function meta(html, attr, key, value) {
  const escaped = key.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const re = new RegExp("<meta\\s+[^>]*" + attr + "=[\\\"']" + escaped + "[\\\"'][^>]*>", "i");
  const tag = '<meta ' + attr + '="' + esc(key) + '" content="' + esc(value) + '" />';
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", "  " + tag + "\n</head>");
}
function canonical(html, url) {
  const tag = '<link rel="canonical" href="' + esc(url) + '" />';
  const re = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", "  " + tag + "\n</head>");
}
function render(template, page) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + esc(page.title) + "</title>");
  html = html.replace('href="./manifest.webmanifest"', 'href="/QuickCart/manifest.webmanifest"');
  html = meta(html, "name", "description", page.description);
  html = meta(html, "name", "robots", page.indexable === false ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  html = meta(html, "name", "googlebot", page.indexable === false ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  html = meta(html, "property", "og:type", "website");
  html = meta(html, "property", "og:site_name", "QuickCart");
  html = meta(html, "property", "og:title", page.title);
  html = meta(html, "property", "og:description", page.description);
  html = meta(html, "property", "og:url", page.url);
  html = meta(html, "property", "og:locale", "en_NG");
  html = meta(html, "name", "twitter:card", "summary");
  html = meta(html, "name", "twitter:title", page.title);
  html = meta(html, "name", "twitter:description", page.description);
  html = canonical(html, page.url);
  html = html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i, '<script type="application/ld+json">' + json(page.schema) + "</script>");
  return html.replace('<div id="root"></div>', '<div id="root">' + page.content + "</div>");
}

const faqs = [
  ["What is QuickCart?", "QuickCart is a web-based commerce platform for Nigerian small businesses. Sellers can publish a shareable online storefront, manage products and orders, and handle customer handoff. Shoppers can discover products across participating stores in the marketplace."],
  ["Can I create an online store without building a website?", "Yes. A seller can create a QuickCart account, set up a storefront, add products and share the store link with customers. QuickCart provides the storefront experience; you do not need to build a separate website first."],
  ["How does checkout and payment work?", "Customers can create an order and continue the handoff with the seller on WhatsApp. Payment is arranged directly with the seller; QuickCart does not claim to hold or process the buyer’s money in this checkout flow."],
  ["Can shoppers buy from more than one seller?", "Yes. The marketplace lets shoppers browse products from different participating stores. A checkout involving multiple sellers creates a separate order for each seller."],
  ["Does QuickCart support mobile phones?", "Yes. QuickCart’s storefront and seller workspace are designed to work on mobile screens as well as desktop browsers."],
  ["Does QuickCart arrange delivery?", "Delivery and pickup options are configured by each seller. Buyers should confirm delivery availability, fees and timing with the seller before completing an order."],
  ["Can I start using QuickCart for free?", "QuickCart currently presents a free-to-start experience. Available features and any future plan terms should be checked in the product before making a purchasing decision."]
];

const template = await fs.readFile(path.join(DIST, "index.html"), "utf8");
const rootContent = [
  '<main class="seo-fallback"><header><a href="' + SITE + '/">QuickCart</a></header>',
  '<h1>QuickCart: online storefronts and multi-seller shopping in Nigeria</h1>',
  '<p>QuickCart helps Nigerian small businesses create a shareable online storefront, publish products, manage orders and connect with customers. Shoppers can discover products from participating independent stores in one marketplace.</p>',
  '<nav aria-label="QuickCart links"><a href="' + SITE + '/marketplace/">Explore the QuickCart marketplace</a></nav>',
  '<h2>For small-business sellers</h2><p>Create an account, set up a branded storefront, add products and share your store link. Manage your catalogue and orders from a mobile-friendly workspace.</p>',
  '<h2>For shoppers</h2><p>Browse products across participating stores, add items to your cart and create orders. Checkout is handed off to the seller through WhatsApp when available; payment is arranged directly with the seller.</p>',
  '<h2>How QuickCart works</h2><ol><li>Create an account and set up a store.</li><li>Add product names, descriptions, prices and stock details.</li><li>Share the storefront link so customers can browse and order.</li></ol>',
  '<h2>Frequently asked questions</h2>',
  faqs.map(x => '<section><h3>' + esc(x[0]) + '</h3><p>' + esc(x[1]) + '</p></section>').join(""),
  '</main>'
].join("");
const org = { "@type":"Organization", "@id":SITE+"/#organization", name:"QuickCart", url:SITE+"/", description:"A commerce platform connecting shoppers with online stores and helping small businesses manage products, orders and customers.", founder:{ "@type":"Person", name:"AD3N1X", url:"https://github.com/Ad3n1x" } };
const website = { "@type":"WebSite", "@id":SITE+"/#website", url:SITE+"/", name:"QuickCart", inLanguage:"en-NG", publisher:{ "@id":SITE+"/#organization" } };
const rootTitle = "QuickCart — Online stores and shopping in Nigeria";
const rootDescription = "QuickCart helps Nigerian small businesses create shareable online stores, manage products and orders, and connect with customers. Shoppers can discover products across participating stores.";
const rootSchema = { "@context":"https://schema.org", "@graph":[
  org, website,
  { "@type":"SoftwareApplication", "@id":SITE+"/#application", name:"QuickCart", url:SITE+"/", applicationCategory:"BusinessApplication", operatingSystem:"Web", description:"A web-based commerce platform where shoppers discover stores and small businesses create storefronts, manage product catalogues and orders, and connect with customers.", inLanguage:"en-NG", publisher:{ "@id":SITE+"/#organization" } },
  { "@type":"WebPage", "@id":SITE+"/#webpage", url:SITE+"/", name:rootTitle, description:rootDescription, inLanguage:"en-NG", isPartOf:{ "@id":SITE+"/#website" } },
  { "@type":"FAQPage", "@id":SITE+"/#faq", mainEntity:faqs.map(x => ({ "@type":"Question", name:x[0], acceptedAnswer:{ "@type":"Answer", text:x[1] } })) }
]};
await fs.writeFile(path.join(DIST, "index.html"), render(template, { title:rootTitle, description:rootDescription, url:SITE+"/", content:rootContent, schema:rootSchema }));

let catalog = { stores:[], products:[] };
try {
  catalog = await fetchJsonWithRetry(API + "/api/marketplace");
} catch (error) {
  console.warn("AEO prerender: live marketplace data unavailable; publishing static explanatory copy.", error?.message || error);
}
const marketUrl = SITE + "/marketplace/";
const marketTitle = "QuickCart Marketplace — Discover products from Nigerian stores";
const marketDescription = "Discover products from independent Nigerian businesses on QuickCart. Browse seller storefronts, compare products, create orders and continue checkout with sellers on WhatsApp.";
const marketStores = (catalog.stores || []).filter(s => slugOk(s.slug));
const storeLinks = marketStores.map(s => '<li><a href="' + SITE + '/store/' + encodeURIComponent(s.slug) + '/">' + esc(s.storeName || s.name || s.slug) + '</a> — ' + esc(s.tagline || "Independent seller") + '</li>').join("");
const productLinks = (catalog.products || []).filter(p => p?.name).slice(0,60).map(p => {
  const store = p.store || {};
  const url = slugOk(store.slug) ? SITE + "/store/" + encodeURIComponent(store.slug) + "/" : marketUrl;
  const price = money(p.price);
  return '<li><a href="' + url + '">' + esc(p.name) + '</a>' + (store.storeName ? " from " + esc(store.storeName) : "") + (price ? " — " + esc(price) : "") + (p.description ? "<p>" + esc(String(p.description).slice(0,220)) + "</p>" : "") + '</li>';
}).join("");
const marketContent = [
  '<main class="seo-fallback"><header><a href="' + SITE + '/">QuickCart</a> / Marketplace</header>',
  '<h1>QuickCart Marketplace — discover products from Nigerian stores</h1>',
  '<p>Browse products from participating independent Nigerian businesses. Open a seller’s storefront to view its catalogue, then create an order and continue the handoff with the seller.</p>',
  '<p>Shoppers can use guest checkout. A cart containing items from different sellers creates a separate order for each seller. Payment is arranged directly with each business.</p>',
  '<h2>Participating stores</h2><ul>' + (storeLinks || "<li>Store listings load from the live marketplace.</li>") + '</ul>',
  '<h2>Products to discover</h2><ul>' + (productLinks || "<li>Product listings load from the live marketplace.</li>") + '</ul>',
  '<h2>Shopping questions</h2><section><h3>Can I shop without an account?</h3><p>Guest checkout is available. Enter your name and WhatsApp phone number to create an order without signing in.</p></section>',
  '<section><h3>How do payments work?</h3><p>Payment is arranged directly with the seller. Confirm the seller’s payment instructions and amount before paying.</p></section>',
  '<section><h3>Who handles delivery?</h3><p>Each seller controls whether pickup or delivery is available. Confirm delivery coverage, fees and timing with the seller.</p></section></main>'
].join("");
const marketplaceFaq = [
  { "@type":"Question", name:"Can I shop without an account?", acceptedAnswer:{ "@type":"Answer", text:"Guest checkout is available. Enter your name and WhatsApp phone number to create an order without signing in." } },
  { "@type":"Question", name:"How do payments work?", acceptedAnswer:{ "@type":"Answer", text:"Payment is arranged directly with the seller. Confirm the seller’s payment instructions and amount before paying." } },
  { "@type":"Question", name:"Who handles delivery?", acceptedAnswer:{ "@type":"Answer", text:"Each seller controls whether pickup or delivery is available. Confirm delivery coverage, fees and timing with the seller." } }
];
const marketSchema = { "@context":"https://schema.org", "@graph":[
  { "@type":"CollectionPage", "@id":marketUrl+"#webpage", url:marketUrl, name:marketTitle, description:marketDescription, inLanguage:"en-NG", isPartOf:{ "@id":SITE+"/#website" }, about:{ "@type":"Thing", name:"Online shopping from independent Nigerian businesses" } },
  { "@type":"ItemList", "@id":marketUrl+"#stores", name:"Participating QuickCart stores", itemListElement:marketStores.slice(0,100).map((s,i) => ({ "@type":"ListItem", position:i+1, url:SITE+"/store/"+encodeURIComponent(s.slug)+"/", name:String(s.storeName || s.name || s.slug) })) },
  { "@type":"FAQPage", "@id":marketUrl+"#faq", "mainEntity":marketplaceFaq }
]};
const marketDir = path.join(DIST, "marketplace");
await fs.mkdir(marketDir, { recursive:true });
await fs.writeFile(path.join(marketDir, "index.html"), render(template, { title:marketTitle, description:marketDescription, url:marketUrl, content:marketContent, schema:marketSchema }));

const sitemap = [SITE+"/", marketUrl];
let generated = 0;
for (const summary of marketStores) {
  const slug = String(summary.slug);
  let data = null;
  try {
    data = await fetchJsonWithRetry(API + "/api/storefront/" + encodeURIComponent(slug), 3);
  } catch (error) { console.warn("AEO prerender: storefront fetch failed for", slug, error?.message || error); }
  const store = data?.store || data?.storefront || summary;
  const name = String(store.storeName || store.name || summary.storeName || slug).trim();
  const description = String(store.description || store.tagline || summary.tagline || ("Browse products from " + name + " on QuickCart.")).trim().slice(0,160);
  const products = Array.isArray(data?.products) ? data.products : (Array.isArray(store.products) ? store.products : []);
  const url = SITE + "/store/" + encodeURIComponent(slug) + "/";
  const productHtml = products.filter(p => p?.name).slice(0,100).map(p => {
    const price = money(p.price);
    return "<li><strong>" + esc(p.name) + "</strong>" + (p.description ? "<p>" + esc(String(p.description).slice(0,300)) + "</p>" : "") + (price ? "<p>Price: " + esc(price) + "</p>" : "") + "</li>";
  }).join("");
  const content = '<main class="seo-fallback"><header><a href="' + SITE + '/">QuickCart</a> / <a href="' + marketUrl + '">Marketplace</a> / ' + esc(name) + '</header><h1>' + esc(name) + ' — Online Store</h1><p>' + esc(description) + '</p><p>Browse this seller’s products on QuickCart. Product availability, pickup or delivery options, and payment arrangements are confirmed with the seller.</p><h2>Products from ' + esc(name) + '</h2><ul>' + (productHtml || "<li>Visit the live storefront to view current products and availability.</li>") + '</ul><p><a href="' + marketUrl + '">Discover more stores on QuickCart Marketplace</a></p></main>';
  const items = products.filter(p => p?.name).slice(0,100).map(p => {
    const item = { "@type":"Product", name:String(p.name) };
    if (p.description) item.description = String(p.description).slice(0,500);
    const price = Number(p.price);
    if (Number.isFinite(price) && price >= 0) item.offers = { "@type":"Offer", priceCurrency:"NGN", price:price, availability:Number(p.stock)>0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url:url };
    return item;
  });
  const schema = { "@context":"https://schema.org", "@graph":[
    { "@type":"OnlineStore", "@id":url+"#store", url:url, name:name, description:description, inLanguage:"en-NG", currenciesAccepted:"NGN", parentOrganization:{ "@id":SITE+"/#organization" }, ...(items.length ? { hasOfferCatalog:{ "@type":"OfferCatalog", name:name+" product catalogue", itemListElement:items } } : {}) },
    { "@type":"WebPage", "@id":url+"#webpage", url:url, name:name+" — Online Store | QuickCart", description:description, isPartOf:{ "@id":SITE+"/#website" }, inLanguage:"en-NG" }
  ]};
  const dir = path.join(DIST, "store", slug);
  await fs.mkdir(dir, { recursive:true });
  await fs.writeFile(path.join(dir, "index.html"), render(template, { title:name+" — Online Store | QuickCart", description:description, url:url, content:content, schema:schema }));
  sitemap.push(url);
  generated++;
}

await fs.writeFile(path.join(DIST, "robots.txt"), "User-agent: *\nAllow: /\n\n# Explicitly allow OpenAI search discovery for public pages.\nUser-agent: OAI-SearchBot\nAllow: /\n\n# Private app, admin and authentication routes emit route-level noindex directives.\n# Keep crawling enabled so search engines can read those directives.\n\nSitemap: " + SITE + "/sitemap.xml\n");
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemap.map(u => "  <url><loc>" + esc(u) + "</loc></url>").join("\n") + "\n</urlset>\n";
await fs.writeFile(path.join(DIST, "sitemap.xml"), xml);
const notFound = render(template, { title:"Page not found | QuickCart", description:"This QuickCart page could not be found.", url:SITE+"/", content:'<main><h1>Page not found</h1><p>The page may have moved or no longer exists.</p><p><a href="' + SITE + '/">Return to QuickCart</a></p></main>', schema:{ "@context":"https://schema.org", "@type":"WebPage", name:"Page not found" }, indexable:false }).replace(/<link rel="canonical" href="[^"]*" \/>/i, "");
await fs.writeFile(path.join(DIST, "404.html"), notFound);
await fs.writeFile(path.join(DIST, ".nojekyll"), "");
console.log("AEO prerender complete:", JSON.stringify({ publicStores:generated, sitemapUrls:sitemap.length }));
