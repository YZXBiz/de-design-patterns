import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Part I: Data Pipeline Foundations',
      collapsible: true,
      collapsed: false,
      items: [
        'chapter1',
        'chapter2',
        'chapter3',
      ],
    },
    {
      type: 'category',
      label: 'Part II: Data Reliability',
      collapsible: true,
      collapsed: false,
      items: [
        'chapter4',
        'chapter5',
      ],
    },
    {
      type: 'category',
      label: 'Part III: Pipeline Architecture',
      collapsible: true,
      collapsed: false,
      items: [
        'chapter6',
        'chapter7',
      ],
    },
    {
      type: 'category',
      label: 'Part IV: Optimization & Quality',
      collapsible: true,
      collapsed: false,
      items: [
        'chapter8',
        'chapter9',
        'chapter10',
      ],
    },
  ],
};

export default sidebars;
