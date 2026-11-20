import { existsSync, readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

const WEB_SRC = 'apps/web/src';
const FEATURES_DIR = `${WEB_SRC}/features`;

/** Feature folders in the web app (see "Code organisation" in CLAUDE.md). */
const features = existsSync(FEATURES_DIR)
  ? readdirSync(FEATURES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

const crossFeatureMessage =
  'Features may import only from shared/ and their own folder. Move shared code to shared/ (see CLAUDE.md).';

/** A feature may not import another feature, or climb out of its folder with relative paths. */
const featureBoundaries = features.map((feature) => ({
  files: [`${FEATURES_DIR}/${feature}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*', `!@/features/${feature}`, `!@/features/${feature}/**`],
            message: crossFeatureMessage,
          },
          // From components/<group>/ the feature root is ../../, so ../../../ leaves the feature.
          { group: ['../../../*'], message: 'Use the "@/" alias for imports from outside this feature.' },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', 'data/**'] },
  ...tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    rules: {
      // npm hoists to the root, so undeclared imports can silently work. Each
      // package must declare what it imports; the rule checks the nearest package.json.
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: ['**/test/**', '**/*.test.ts', '**/*.config.{ts,js}'] },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // shared/ is the bottom layer: it never depends on features or the app shell.
  {
    files: [`${WEB_SRC}/shared/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/app/*'],
              message: 'shared/ must not import from features/ or app/ (see CLAUDE.md).',
            },
          ],
        },
      ],
    },
  },
  ...featureBoundaries,
);
