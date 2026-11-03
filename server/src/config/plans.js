// Launch mode: all seller capabilities are free while QuickCart validates product-market fit.
// Original paid tiers are preserved below for a later, deliberate reactivation.
export const PLAN_CONFIG={
  Free:{price:0,storeLimit:null,features:['Branded storefront','Products and orders','WhatsApp checkout','Basic and advanced analytics','Discounts and promotions','Multiple storefronts','Business analytics','Priority support']},
  /*
  Premium:{price:4999,storeLimit:5,features:['Everything in Free','Advanced analytics','Discounts and promotions','Up to 5 storefronts']},
  Business:{price:9999,storeLimit:null,features:['Everything in Premium','Unlimited storefronts','Business analytics','Priority support']}
  */
};
export function planFor(_user){return 'Free';}
export function planStoreLimit(_plan){return null;}
