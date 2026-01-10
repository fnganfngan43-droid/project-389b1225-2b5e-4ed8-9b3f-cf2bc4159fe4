import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Source code content for bundling
const sourceFiles: Record<string, () => Promise<string>> = {};

// Function to dynamically import and get module content
async function getModuleContent(path: string): Promise<string> {
  try {
    const modules = import.meta.glob('/src/**/*.{ts,tsx,css}', { as: 'raw', eager: false });
    const loader = modules[path];
    if (loader) {
      return await loader() as string;
    }
    return '';
  } catch {
    return '';
  }
}

export async function downloadProjectAsZip(): Promise<void> {
  const zip = new JSZip();
  
  // Get all source files using Vite's glob import
  const modules = import.meta.glob('/src/**/*.{ts,tsx,css}', { as: 'raw', eager: true });
  
  // Add source files to zip
  for (const [path, content] of Object.entries(modules)) {
    // Remove leading slash and add to zip
    const relativePath = path.startsWith('/') ? path.slice(1) : path;
    zip.file(relativePath, content as string);
  }

  // Add index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>رفيق المحاسب</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  zip.file('index.html', indexHtml);

  // Add package.json
  const packageJson = {
    name: "rafiq-almohassib",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "react-router-dom": "^6.30.1",
      "@tanstack/react-query": "^5.83.0",
      "lucide-react": "^0.462.0",
      "date-fns": "^3.6.0",
      "recharts": "^2.15.4",
      "xlsx": "^0.18.5",
      "sonner": "^1.7.4",
      "tailwind-merge": "^2.6.0",
      "tailwindcss-animate": "^1.0.7",
      "class-variance-authority": "^0.7.1",
      "clsx": "^2.1.1",
      "@radix-ui/react-dialog": "^1.1.14",
      "@radix-ui/react-select": "^2.2.5",
      "@radix-ui/react-tabs": "^1.1.12",
      "@radix-ui/react-tooltip": "^1.2.7",
      "@radix-ui/react-label": "^2.1.7",
      "@radix-ui/react-slot": "^1.2.3"
    },
    devDependencies: {
      "@types/react": "^18.3.0",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react-swc": "^3.7.0",
      "autoprefixer": "^10.4.20",
      "postcss": "^8.4.47",
      "tailwindcss": "^3.4.11",
      "typescript": "^5.6.2",
      "vite": "^5.4.4"
    }
  };
  zip.file('package.json', JSON.stringify(packageJson, null, 2));

  // Add README
  const readme = `# رفيق المحاسب

برنامج محاسبي متكامل لإدارة حساباتك بسهولة واحترافية

## التثبيت

\`\`\`bash
npm install
\`\`\`

## التشغيل

\`\`\`bash
npm run dev
\`\`\`

## البناء

\`\`\`bash
npm run build
\`\`\`
`;
  zip.file('README.md', readme);

  // Add vite.config.ts
  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
`;
  zip.file('vite.config.ts', viteConfig);

  // Add tailwind.config.ts
  const tailwindConfig = `import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
`;
  zip.file('tailwind.config.ts', tailwindConfig);

  // Add tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      baseUrl: ".",
      paths: {
        "@/*": ["./src/*"]
      }
    },
    include: ["src"]
  };
  zip.file('tsconfig.json', JSON.stringify(tsConfig, null, 2));

  // Add postcss.config.js
  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
  zip.file('postcss.config.js', postcssConfig);

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  saveAs(blob, `rafiq-almohassib-${dateStr}.zip`);
}
