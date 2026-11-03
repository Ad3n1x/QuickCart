// Phone-number parsing and formatting shared by account and checkout forms.
export const PHONE_COUNTRIES=[
  ["NG","Nigeria","+234"],["GH","Ghana","+233"],["KE","Kenya","+254"],["ZA","South Africa","+27"],["US","United States","+1"],["CA","Canada","+1"],["GB","United Kingdom","+44"],["AE","UAE","+971"],["IN","India","+91"],["DE","Germany","+49"],["FR","France","+33"],["AU","Australia","+61"]
];
export function splitPhone(value){
  const raw=String(value||"").trim();
  const match=PHONE_COUNTRIES.find(([,label,code])=>raw.startsWith(code));
  if(match)return {code:match[2],number:raw.slice(match[2].length).replace(/\D/g,"")};
  if(raw.startsWith("0"))return {code:"+234",number:raw.slice(1).replace(/\D/g,"")};
  return {code:"+234",number:raw.replace(/\D/g,"")};
}
export function joinPhone(code,number){
  return String(code||"+234")+String(number||"").replace(/\D/g,"").replace(/^0+/,"");
}
