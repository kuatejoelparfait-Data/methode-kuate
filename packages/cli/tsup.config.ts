import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  clean: true,
  noExternal: [/@methode-kuate\/.*/],
  external: [
    'yaml',
    'js-yaml',
    'handlebars',
    'zod',
    'fs-extra',
    'glob',
    'chalk',
    'ora',
    'clipboardy',
    'update-notifier',
    '@clack/prompts',
    'commander',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
