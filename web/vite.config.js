/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { compileString, Logger } from 'sass';
import { pathToFileURL } from 'url';
import { defineConfig, transformWithEsbuild } from 'vite';

const require = createRequire(import.meta.url);

const transformPath = (filePath) =>
  process.platform === 'win32' ? filePath.replace(/[\\]+/g, '/') : filePath;

const convertMapToString = (map) =>
  Object.keys(map).reduce((prev, curr) => `${prev}${curr}: ${map[curr]};\n`, '');

const resolveSemiNodeModulesRoot = (filePath) => {
  const marker = '/node_modules/';
  const normalizedPath = transformPath(filePath);
  const markerIndex = normalizedPath.lastIndexOf(marker);

  if (markerIndex === -1) {
    return '';
  }

  return normalizedPath.slice(0, markerIndex + marker.length);
};

const semiThemeLoader = (source, options = {}) => {
  const {
    name = '@douyinfe/semi-theme-default',
    cssLayer,
    variables,
    prefixCls = 'semi',
    include,
  } = options;
  const scssVarStr = `@import "~${name}/scss/index.scss";\n`;
  const cssVarStr = `@import "~${name}/scss/global.scss";\n`;
  const animationFile = `${name}/scss/animation.scss`;
  const prefixClsStr = `$prefix: '${prefixCls}';\n`;
  const shouldInject = source.includes('semi-base');

  let animationStr = '';
  try {
    require.resolve(animationFile);
    animationStr = `@import "~${animationFile}";\n`;
  } catch {
    animationStr = '';
  }

  if (include || variables) {
    let localImport = '';
    if (include) {
      localImport += `\n@import "${transformPath(include)}";`;
    }
    if (variables) {
      localImport += `\n${variables}`;
    }

    const regex = /(@import '.\/variables.scss';?|@import ".\/variables.scss";?)/g;
    const fileSplit = source.split(regex).filter(Boolean);
    if (fileSplit.length > 1) {
      fileSplit.splice(fileSplit.length - 1, 0, localImport);
      source = fileSplit.join('');
    }
  }

  let finalCSSStr = shouldInject
    ? `${animationStr}${cssVarStr}${scssVarStr}${prefixClsStr}${source}`
    : `${scssVarStr}${prefixClsStr}${source}`;

  if (cssLayer) {
    finalCSSStr = `@layer semi{${finalCSSStr}}`;
  }

  return finalCSSStr;
};

const vitePluginSemiCompat = (options = {}) => ({
  name: 'vite-plugin-semi-compat',
  load(id) {
    const filePath = transformPath(id);
    const normalizedInclude = options.include
      ? transformPath(options.include)
      : undefined;

    if (!/@douyinfe\/semi-(ui|icons|foundation)\/lib\/.+\.css$/.test(filePath)) {
      return null;
    }

    const scssFilePath = filePath.replace(/\.css$/, '.scss');
    const nodeModulesRoot = resolveSemiNodeModulesRoot(scssFilePath);
    const semiLoaderOptions = {
      name: typeof options.theme === 'string' ? options.theme : options.theme?.name,
      cssLayer: options.cssLayer,
      include: normalizedInclude,
      prefixCls: options.prefixCls,
      variables: convertMapToString(options.variables || {}),
    };
    const originalScssRaw = fs.readFileSync(scssFilePath, 'utf-8');
    const newScssRaw = semiThemeLoader(originalScssRaw, semiLoaderOptions);

    return compileString(newScssRaw, {
      importers: [
        {
          findFileUrl(url) {
            if (url.startsWith('~')) {
              const targetPath = path.resolve(nodeModulesRoot, url.substring(1));
              return pathToFileURL(targetPath);
            }

            const resolvedPath = path.resolve(path.dirname(scssFilePath), url);
            if (fs.existsSync(resolvedPath)) {
              return pathToFileURL(resolvedPath);
            }

            return null;
          },
        },
      ],
      logger: Logger.silent,
    }).css;
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    codeInspectorPlugin({
      bundler: 'vite',
    }),
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!/src\/.*\.js$/.test(id)) {
          return null;
        }

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
    // Upstream vite-plugin-semi uses a `\S*\/node_modules\/` regex internally.
    // The current workspace path contains a space (`F:\newapi code\...`), which
    // makes Sass `~@douyinfe/...` imports fail during build/dev. Keep the same
    // behavior locally, but resolve node_modules robustly for space-containing paths.
    vitePluginSemiCompat({
      cssLayer: true,
    }),
  ],
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.json': 'json',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          'semi-ui': ['@douyinfe/semi-icons', '@douyinfe/semi-ui'],
          tools: ['axios', 'history', 'marked'],
          'react-components': [
            'react-dropzone',
            'react-fireworks',
            'react-telegram-login',
            'react-toastify',
            'react-turnstile',
          ],
          i18n: [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
          ],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/mj': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pg': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
