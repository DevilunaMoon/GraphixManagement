import fs from 'fs';
import path from 'path';

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf-8');
      let changed = false;

      if (content.includes("import { useNavigate } from 'react-router-dom';")) {
        content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useRouter } from 'next/navigation';");
        changed = true;
      }

      if (content.includes("const navigate = useNavigate();")) {
        content = content.replace("const navigate = useNavigate();", "const router = useRouter();\n  const navigate = router.push;");
        changed = true;
      }
      
      // Sometimes it might have different spacing
      if (content.includes("  const navigate = useNavigate();")) {
        content = content.replace("  const navigate = useNavigate();", "  const router = useRouter();\n  const navigate = router.push;");
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

replaceInDir(path.join(process.cwd(), 'app'));
