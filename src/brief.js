export function createBrief(data) {
  const services = data.getAll('service').filter(Boolean);
  return [
    'EG TECH | PROJECT BRIEF',
    'IDEAS TODAY | IMPACT TOMORROW',
    '',
    `Name: ${String(data.get('name') || '').trim()}`,
    `Email: ${String(data.get('email') || '').trim()}`,
    `Company: ${String(data.get('company') || '').trim() || 'Not specified'}`,
    `Interested in: ${services.length ? services.join(', ') : 'Let’s explore together'}`,
    `Project scale: ${data.get('budget') || 'Let’s discuss'}`,
    `Timeline: ${data.get('timeline') || 'Flexible / exploring'}`,
    '', 'THE IDEA', String(data.get('idea') || '').trim(),
  ].join('\n');
}

export function isContactEmail(value) {
  return typeof value === 'string' && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value);
}

export function makeEmailLink(email, brief) {
  if (!isContactEmail(email)) return null;
  return `mailto:${email}?subject=${encodeURIComponent('Let’s build what’s next | EG TECH project brief')}&body=${encodeURIComponent(brief)}`;
}
