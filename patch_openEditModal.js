const fs = require('fs');
let file = 'apps/web/app/CashierSide/CashierDevices.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `    setEditVariationGroups(device.variations ? Object.values(device.variations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = { section: v.type, variations: [] };
      acc[v.type].variations.push({ name: v.name, price: v.price?.toString() || '0', cost: v.cost?.toString() || '0', stock: v.stock?.toString() || '0' });
      return acc;
    }, {})) : []);
    setEditModalOpen(true);`;

content = content.replace("    setEditModalOpen(true);", injection);

fs.writeFileSync(file, content);
console.log('Fixed openEditModal');
