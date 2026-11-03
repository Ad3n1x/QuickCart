import React,{useEffect,useState} from "react";
import { PHONE_COUNTRIES,splitPhone,joinPhone } from "../../lib/phone.js";

function PhoneField({label="Phone",value,onChange,required=false}){
  const initial=splitPhone(value),[code,setCode]=useState(initial.code),[number,setNumber]=useState(initial.number);
  useEffect(()=>{const next=splitPhone(value);setCode(next.code);setNumber(next.number)},[value]);
  const update=(nextCode,nextNumber)=>{setCode(nextCode);setNumber(nextNumber);onChange?.(joinPhone(nextCode,nextNumber));};
  return <div className="phone-field"><span>{label}</span><div className="phone-input"><select aria-label="Country code" value={code} onChange={e=>update(e.target.value,number)}>{PHONE_COUNTRIES.map(([iso,name,c])=><option key={iso} value={c}>{iso} {c} · {name}</option>)}</select><input type="tel" inputMode="tel" autoComplete="tel" required={required} value={number} onChange={e=>update(code,e.target.value)} placeholder="8012345678"/></div></div>
}

export default PhoneField;
