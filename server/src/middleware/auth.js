import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";

export function createAuthServices(jwtSecret) {
  const hashToken = token => createHash("sha256").update(token).digest("hex");
  function tokenFor(user) { if (!jwtSecret) throw new Error('JWT_SECRET is not configured.'); return jwt.sign({ sub: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '7d' }); }
function auth(req, res, next) { try { const h=String(req.headers.authorization||''); const token=h.startsWith('Bearer ')?h.slice(7).trim():''; if(!token||!jwtSecret)return res.status(401).json({error:'Authentication required.',code:'AUTH_REQUIRED'}); const payload=jwt.verify(token,jwtSecret); if(!payload?.sub||payload.role==='customer')return res.status(401).json({error:'A seller session is required.',code:'SELLER_AUTH_REQUIRED'}); req.user=payload; next(); } catch { return res.status(401).json({error:'Invalid or expired session.',code:'INVALID_SESSION'}); } }
const hashToken = token => createHash('sha256').update(token).digest('hex');
function customerTokenFor(customer) { if (!jwtSecret) throw new Error('JWT_SECRET is not configured.'); return jwt.sign({ sub: customer.id, email: customer.email, name: customer.name, role: 'customer' }, jwtSecret, { expiresIn: '30d' }); }
function customerAuth(req, res, next) { try { const h=String(req.headers.authorization||''); const token=h.startsWith('Bearer ')?h.slice(7).trim():''; if(!token||!jwtSecret)return res.status(401).json({error:'Customer authentication required.',code:'CUSTOMER_AUTH_REQUIRED'}); const payload=jwt.verify(token,jwtSecret); if(payload?.role!=='customer'||!payload?.sub)return res.status(401).json({error:'Invalid customer session.',code:'INVALID_CUSTOMER_SESSION'}); req.customer=payload; next(); } catch { return res.status(401).json({error:'Invalid or expired customer session.',code:'INVALID_CUSTOMER_SESSION'}); } }
  return { tokenFor, auth, hashToken, customerTokenFor, customerAuth };
}
