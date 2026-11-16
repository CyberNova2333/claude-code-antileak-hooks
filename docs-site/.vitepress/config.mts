import { defineConfig } from 'vitepress'
import { guideLinks } from './guide-links.mts'

const guideRoutes = {
  'README.md': 'docs/architecture',
  'walkthroughs/one-real-run.md': 'docs/architecture',
  'code-map.md': 'docs/code-map',
  'modules/policy-engine.md': 'docs/contracts',
  'modules/hook-wrappers.md': 'docs/contracts',
  'modules/private-list-sync.md': 'docs/configuration',
  'modules/deployment-and-checks.md': 'docs/configuration',
  'references/source-evidence.md': 'docs/code-map',
  'references/quality-review.md': 'docs/code-map',
  'glossary.md': 'docs/contracts',
  'change-log.md': 'docs/changelog',
}

export default defineConfig({
  cleanUrls: true,
  markdown: {
    config: guideLinks(guideRoutes),
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Claude Code Antileak Hooks 文档',
      description: '面向 Claude Code 会话与 Git 工作流的多层敏感凭证、私有仓名与 SSH 签名防泄漏护栏。',
      themeConfig: {
        siteTitle: '代码防泄漏钩子',
        nav: [
          { text: '首页', link: '/' },
          { text: '起步与部署', link: '/docs/' },
          { text: '规则与契约', link: '/docs/contracts' },
          { text: '架构导览', link: '/docs/architecture' },
          { text: 'API 与组件', link: '/api-reference/' },
        ],
        sidebar: [
          {
            text: '起步与配置部署',
            items: [
              { text: '概览、边界与多环境部署', link: '/docs/' },
              { text: '配置矩阵、私有种子与排错 FAQ', link: '/docs/configuration' },
            ],
          },
          {
            text: '接口与扩展契约',
            items: [
              { text: '钩子协议、R1–R7 规则与扩展 FAQ', link: '/docs/contracts' },
              { text: 'API 与组件参考（Apifox 视图）', link: '/api-reference/' },
            ],
          },
          {
            text: '原理与源码导览',
            items: [
              { text: '架构全景与主流程走读', link: '/docs/architecture' },
              { text: '代码地图与维护守卫区分', link: '/docs/code-map' },
              { text: '版本变更与迁移记录', link: '/docs/changelog' },
            ],
          },
        ],
        outline: { level: [2, 3], label: '本页目录' },
        docFooter: { prev: '上一页', next: '下一页' },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Claude Code Antileak Hooks Docs',
      description: 'Multi-layer leak prevention hooks for Claude Code tool calls and Git commit/push pipelines.',
      themeConfig: {
        siteTitle: 'Antileak Hooks',
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Setup & Config', link: '/en/docs/' },
          { text: 'Contracts & Rules', link: '/en/docs/contracts' },
          { text: 'Architecture', link: '/en/docs/architecture' },
          { text: 'API & Components', link: '/en/api-reference/' },
        ],
        sidebar: [
          {
            text: 'Setup & Configuration',
            items: [
              { text: 'Overview, Scope & Deployment', link: '/en/docs/' },
              { text: 'Config Matrix, Seeds & Troubleshooting FAQ', link: '/en/docs/configuration' },
            ],
          },
          {
            text: 'Contracts & Extensions',
            items: [
              { text: 'Hook Protocols, R1–R7 & Extension FAQ', link: '/en/docs/contracts' },
              { text: 'API & Component Reference', link: '/en/api-reference/' },
            ],
          },
          {
            text: 'Architecture, Code & Migration',
            items: [
              { text: 'Architecture & Real-Run Walkthrough', link: '/en/docs/architecture' },
              { text: 'Code Map & Repo Guard Separation', link: '/en/docs/code-map' },
              { text: 'Changelog & Migration Guide', link: '/en/docs/changelog' },
            ],
          },
        ],
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous page', next: 'Next page' },
      },
    },
  },
  themeConfig: {
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/CyberNova2333/claude-code-antileak-hooks' }],
  },
})
