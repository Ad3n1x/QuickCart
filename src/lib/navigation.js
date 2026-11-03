// Shared browser navigation helpers. BASE keeps GitHub Pages and Vercel paths compatible.
const BASE=(import.meta.env.BASE_URL||"/").replace(/\/$/,"")||(typeof window!=="undefined"&&window.location.hostname==="ad3n1x.github.io"?"/QuickCart":"");

export function go(path,replace=false){const target=String(path||"/");const safePath=target.startsWith("/")?target:"/"+target;const url=(BASE||"")+safePath;(replace?history.replaceState:history.pushState).call(history,{},"",url);window.dispatchEvent(new Event("popstate"));if(!safePath.includes("#"))window.scrollTo({top:0,behavior:"auto"})}

export { BASE };
