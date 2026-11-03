import { randomInt } from "node:crypto";

export const createOtp = () => String(randomInt(100000, 1000000));
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const now = () => new Date().toISOString();
export const slugify = value => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
