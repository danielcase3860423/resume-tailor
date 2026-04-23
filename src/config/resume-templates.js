export const RESUME_TEMPLATE_OPTIONS = [
  {
    value: 'template1',
    label: 'Template 1',
    description: 'Classic centered header with skills table and balanced ATS-friendly spacing.'
  },
  {
    value: 'template2',
    label: 'Template 2',
    description: 'Editorial Bitter type with bold section dividers and strong experience focus.'
  },
  {
    value: 'template3',
    label: 'Template 3',
    description: 'Modern split-column layout with sidebar contact and grouped skills.'
  },
  {
    value: 'template4',
    label: 'Template 4',
    description: 'Minimal executive layout with clean rules, compact summary, and wide margins.'
  },
  {
    value: 'template5',
    label: 'Template 5',
    description: 'Accent banner header with stacked sections for visually bold applications.'
  },
  {
    value: 'template6',
    label: 'Template 6',
    description: 'Soft two-column layout with highlighted summary and compact skill pills.'
  },
  {
    value: 'template7',
    label: 'Template 7',
    description: 'Dense recruiter-friendly format optimized for fast scanning of experience depth.'
  },
  {
    value: 'template8',
    label: 'Template 8',
    description: 'Monospaced technical dossier with italic role title and high-contrast section bands.'
  },
  {
    value: 'template9',
    label: 'Template 9',
    description: 'Polished sidebar layout with italic headline role and compact recruiter-focused hierarchy.'
  },
  {
    value: 'template10',
    label: 'Template 10',
    description: 'Elegant serif presentation with italic role styling and refined accent rules.'
  }
];

export function getResumeTemplateLabel(templateValue) {
  return RESUME_TEMPLATE_OPTIONS.find((option) => option.value === templateValue)?.label || 'Template 1';
}
