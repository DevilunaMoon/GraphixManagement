const fs = require('fs');
let file = 'apps/web/app/CashierSide/CashierDevices.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix interface Device
content = content.replace(
  /specs: string \| null;\r?\n}/,
  "specs: string | null;\n  variations?: any[];\n}"
);

// Fix any types
content = content.replace(
  "device.variations.reduce((acc, v) =>",
  "device.variations.reduce((acc: any, v: any) =>"
);

fs.writeFileSync(file, content);
console.log('Fixed TS errors');
