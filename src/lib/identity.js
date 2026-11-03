// Normalized identity helpers shared across the client.
export const slugify=v=>String(v||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48);
export const emailOf=v=>String(v||"").trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,"");
