import { defineConfig } from 'vite';

export default defineConfig(({ command, mode, isPreview }) => ({
  base: './',
  build: { target: 'es2022' },
  // A build must disable this even when --mode development or NODE_ENV=development is used.
  define: { __DEV_TEST_MODE__: JSON.stringify(command === 'serve' && !isPreview && mode === 'development') },
  plugins: [{
    name: 'exclude-development-tools',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        const includesModule = Object.keys(output.modules).some((id) =>
          id.replaceAll('\\', '/').split('?')[0].endsWith('/src/game/development-tools.js'));
        const includesEntry = ['grantDevelopmentTools', 'development-settings-title', 'idle-farm-development']
          .some((marker) => output.code.includes(marker));
        if (includesModule || includesEntry) this.error('正式构建不能包含开发测试入口或奖励模块。');
      }
    },
  }],
}));
