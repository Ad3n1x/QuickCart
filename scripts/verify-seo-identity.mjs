import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => {
  assert.ok(existsSync(path), "Missing generated SEO artifact: " + path);
  return readFileSync(path, "utf8");
};
const checks = [];
const check = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
};
const site = "https://ad3n1x.github.io/QuickCart";
const root = read("dist/index.html");
const marketplace = read("dist/marketplace/index.html");
const faq = read("dist/faq.html");
const llms = read("dist/llms.txt");
const sitemap = read("dist/sitemap.xml");
const robots = read("dist/robots.txt");

function canonical(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] || "";
}
function title(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "";
}
function jsonLd(html) {
  return [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}
const rootGraph = jsonLd(root).flatMap((item) => item["@graph"] || [item]);
const marketGraph = jsonLd(marketplace).flatMap((item) => item["@graph"] || [item]);
const rootWebsite = rootGraph.find((item) => item["@type"] === "WebSite");
const rootSoftware = rootGraph.find((item) => item["@type"] === "SoftwareApplication");
const rootOrganization = rootGraph.find((item) => item["@type"] === "Organization");
const marketPage = marketGraph.find((item) => item["@type"] === "CollectionPage");

check("Homepage canonical is the sole official GitHub Pages URL", canonical(root) === site + "/");
check("Marketplace canonical points to the official marketplace route", canonical(marketplace) === site + "/marketplace/");
check("FAQ canonical points to the official FAQ route", canonical(faq) === site + "/faq.html");
check("Homepage title clearly identifies QuickCart by AD3N1X", /QuickCart by AD3N1X/.test(title(root)));
check("Marketplace title clearly identifies QuickCart by AD3N1X", /QuickCart.*AD3N1X/i.test(title(marketplace)));
check("Homepage visibly identifies the project as independent and distinct from quickcart.ng", /independent/i.test(root) && /quickcart\.ng/i.test(root));
check("FAQ visibly answers the direct quickcart.ng identity question", /same as quickcart\.ng/i.test(faq) && /separate project/i.test(faq));
check("AI-readable reference names the creator, canonical URL and repository", /QuickCart by AD3N1X/.test(llms) && /https:\/\/ad3n1x\.github\.io\/QuickCart\//.test(llms) && /github\.com\/Ad3n1x\/QuickCart/.test(llms));
check("AI-readable reference explicitly prevents ownership and product conflation", /separate project/i.test(llms) && /quickcart\.ng/i.test(llms) && /Do not attribute/i.test(llms));
check("WebSite structured data uses the exact official site name and URL", rootWebsite?.name === "QuickCart by AD3N1X" && rootWebsite?.url === site + "/");
check("SoftwareApplication structured data names the creator and repository", rootSoftware?.name === "QuickCart by AD3N1X" && rootSoftware?.codeRepository === "https://github.com/Ad3n1x/QuickCart");
check("Organization structured data contains an explicit disambiguating description", /quickcart\.ng/i.test(rootOrganization?.disambiguatingDescription || ""));
check("Marketplace structured data belongs to the same official WebSite entity", marketPage?.isPartOf?.["@id"] === site + "/#website");
check("Sitemap is valid XML and lists only official QuickCart URLs", sitemap.includes("<urlset") && sitemap.includes(site + "/") && !/https?:\/\/(?!ad3n1x\.github\.io)/i.test(sitemap));
check("Generated robots file points to the official sitemap", robots.includes("Sitemap: " + site + "/sitemap.xml"));
check("Canonical public pages do not advertise the retired Vercel frontend as the live app", !/quick-cart-three-chi\.vercel\.app/i.test(root + marketplace + faq + llms));
check("Build output documents that project-level robots.txt cannot control host-level crawler policy", /cannot control the host-level/i.test(robots));

console.log("QuickCart SEO identity verification passed:", checks.length, "checks");
for (const item of checks) console.log("PASS:", item);
