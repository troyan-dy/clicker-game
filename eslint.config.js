import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import ts from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist', 'dist-gym', 'node_modules', '.studioigor', 'tools'] },
  js.configs.recommended,
  ts.configs.recommended,
);
