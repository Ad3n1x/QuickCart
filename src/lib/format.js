// Shared display formatting.
export const fmt=n=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(n)||0);
