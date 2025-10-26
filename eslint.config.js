import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        ignores: ['dist/**']
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            'indent': ['error', 4],
            'linebreak-style': ['error', 'unix'],
            'quotes': ['error', 'single'],
            'eqeqeq': 'error',
            'no-trailing-spaces': 'error',
            'object-curly-spacing': ['error', 'always'],
            'arrow-spacing': ['error', { before: true, after: true }],
            'no-console': 'off',
        },
    }
);
