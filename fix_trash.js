const fs = require('fs');

let content = fs.readFileSync('apps/web/app/AdminSide/AdminAccounts.tsx', 'utf8');

content = content.replace(/<Trash2 size=\{20\} \/>/g, "<Ban size={20} />");
content = content.replace(/openDeleteModal\(/g, "openSuspendModal(");
content = content.replace(/title="Delete Account"/g, 'title="Suspend Account"');
content = content.replace(/text-red-500 hover:text-red-700/g, 'text-orange-500 hover:text-orange-700');
content = content.replace(/hover:bg-red-50/g, 'hover:bg-orange-50');

fs.writeFileSync('apps/web/app/AdminSide/AdminAccounts.tsx', content);
console.log('Fixed Trash2!');
