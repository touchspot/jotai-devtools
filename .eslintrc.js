module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  plugins: ['@typescript-eslint', 'react', 'prettier', 'react-hooks', 'import'],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    eqeqeq: 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    curly: ['warn', 'multi-line', 'consistent'],
    'no-console': ['error', { allow: ['warn', 'info', 'error'] }],
    'import/no-unresolved': [
      'error',
      {
        commonjs: true,
        amd: true,
      },
    ],
    'import/export': 'error',
    'import/no-duplicates': ['error'],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
        ],
        'newlines-between': 'never',
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
      },
    ],
    // Disable it until we start supporting `react-jsx` again.
    // 'react/jsx-uses-react': 'off',
    // 'react/react-in-jsx-scope': 'off',
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true,
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.js', '.jsx', '.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        paths: ['src'],
      },
      alias: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        map: [
          ['^jotai-devtools$', './src/index.ts'],
          ['jotai-devtools/utils', './src/utils'],
        ],
      },
    },
  },
  overrides: [
    {
      files: ['src'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    {
      files: ['./*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
