const fs = require('fs');

let content = fs.readFileSync('apps/web/app/AdminSide/AdminAccounts.tsx', 'utf8');

content = content.replace(/openSuspendModal\(acc\.id, acc\.name\)/g, "openSuspendModal(acc.id, acc.name, acc.status, acc.suspendedUntil)");
content = content.replace(/openSuspendModal\(selectedAccount\.id, selectedAccount\.name\)/g, "openSuspendModal(selectedAccount.id, selectedAccount.name, selectedAccount.status, selectedAccount.suspendedUntil)");

fs.writeFileSync('apps/web/app/AdminSide/AdminAccounts.tsx', content);
console.log('Fixed args!');
