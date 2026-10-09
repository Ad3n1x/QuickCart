const API=import.meta.env.VITE_API_URL||"https://quickcart-api-f7x7.onrender.com";

async function api(path,options={}){
  const method=String(options.method||"GET").toUpperCase();
  // Render can take a while to wake the free API after inactivity. Keep auth/session
  // requests alive long enough for the cold start instead of aborting at 15 seconds.
  const isAuthRequest=/^\/api\/auth\//.test(path)||path==="/api/me";
  const timeoutMs=isAuthRequest?60000:(path.startsWith("/api/storefront/")?20000:45000);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    // Public storefront requests must stay completely separate from seller-session state.
    // This prevents a customer opening a store link from inheriting seller credentials.
    const isPublicStorefront=path.startsWith("/api/storefront/");
    const token=isPublicStorefront?null:localStorage.getItem("quickcart_token");
    const storeId=isPublicStorefront?null:localStorage.getItem("quickcart_store_id");
    const r=await fetch(API+path,{...options,signal:controller.signal,headers:{Accept:"application/json","Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(storeId?{"X-Store-Id":storeId}:{}),...(options.headers||{})}});
    const raw=await r.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{}
    if(!r.ok){const e=new Error(data.error||"Request failed.");e.status=r.status;e.code=data.code;e.retryAfterSeconds=data.retryAfterSeconds;throw e}
    return data
  }catch(e){
    if(!e?.status&&method==="GET"&&path.startsWith("/api/storefront/")){try{const c=JSON.parse(localStorage.getItem("qc_public_"+path)||"null");if(c?.data)return c.data}catch{}}
    if(e?.name==="AbortError"){
      const timeoutError=new Error(isAuthRequest
        ?"The server is taking longer than usual to wake up. Please try signing in again in a moment."
        :"The request took too long to complete. Please try again.");
      timeoutError.code="REQUEST_TIMEOUT";
      throw timeoutError;
    }
    throw e
  }finally{clearTimeout(timer)}
}

export { api };
