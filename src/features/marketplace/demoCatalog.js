const stores=[
 {id:"demo-store-1",storeName:"Noma Fashion House",slug:"demo-noma-fashion",tagline:"Everyday fashion and accessories",productCount:2,deliveryEnabled:true},
 {id:"demo-store-2",storeName:"Gadget District",slug:"demo-gadget-district",tagline:"Useful tech and electronics",productCount:2,deliveryEnabled:true},
 {id:"demo-store-3",storeName:"The Home Edit NG",slug:"demo-home-edit",tagline:"Thoughtful home essentials",productCount:2,deliveryEnabled:false},
 {id:"demo-store-4",storeName:"Glow Pantry",slug:"demo-glow-pantry",tagline:"Beauty and personal care",productCount:2,deliveryEnabled:true},
 {id:"demo-store-5",storeName:"The Daily Grind",slug:"demo-daily-grind",tagline:"Coffee and treats",productCount:2,deliveryEnabled:false},
 {id:"demo-store-6",storeName:"Made Local Studio",slug:"demo-made-local",tagline:"Locally made everyday goods",productCount:2,deliveryEnabled:true}
];
const entries=[
 ["Classic Leather Crossbody Bag","Noma Fashion House","Fashion",38500,"Everyday carry with a clean, versatile finish.","https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=82",8],
 ["Minimal Wristwatch","Noma Fashion House","Fashion",27500,"A simple everyday accessory.","https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=700&q=82",5],
 ["Wireless Headphones","Gadget District","Electronics",68500,"Wireless listening for work and everyday use.","https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=82",12],
 ["Portable Bluetooth Speaker","Gadget District","Electronics",42000,"Compact sound for your space.","https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=82",7],
 ["Ceramic Table Vase","The Home Edit NG","Home",18500,"A considered accent for shelves and tables.","https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=700&q=82",9],
 ["Textured Cushion Cover","The Home Edit NG","Home",12500,"Soft texture for a more comfortable home.","https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=700&q=82",14],
 ["Daily Skincare Essentials","Glow Pantry","Beauty",29500,"A simple set for your daily routine.","https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=82",6],
 ["Botanical Body Oil","Glow Pantry","Beauty",14500,"Lightweight body care for everyday use.","https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=700&q=82",10],
 ["Artisan Coffee Blend","The Daily Grind","Food",9800,"Freshly roasted coffee for slow mornings.","https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=700&q=82",20],
 ["Chocolate Gift Box","The Daily Grind","Food",16500,"A thoughtful treat or gift.","https://images.unsplash.com/photo-1548907040-4d42a5f4f5c1?auto=format&fit=crop&w=700&q=82",11],
 ["Everyday Canvas Tote","Made Local Studio","Fashion",11500,"A practical tote for daily errands.","https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=700&q=82",16],
 ["Desk Organiser Set","Made Local Studio","Home",22000,"Keep your workspace neat and focused.","https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=82",4]
];
const products=entries.map(([name,storeName,category,price,description,imageUrl,stock],index)=>{
 const store=stores.find(item=>item.storeName===storeName);
 return {id:"demo-product-"+(index+1),name,store,category,price,description,imageUrl,stock,createdAt:new Date(Date.now()-index*86400000).toISOString()};
});
export const demoCatalog={stores,products};
