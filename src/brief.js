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

export function validateBriefInput(data) {
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const idea = String(data.get('idea') || '').trim();

  if (!name) {
    return { valid: false, field: 'name', message: 'Please enter your name.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, field: 'email', message: 'Please enter a valid email address.' };
  }
  if (!idea || idea.length < 10) {
    return { valid: false, field: 'idea', message: 'Please provide at least 10 characters describing your project or idea.' };
  }
  return { valid: true, name, email, idea };
}

export function isContactEmail(value) {
  return typeof value === 'string' && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value);
}

export function makeEmailLink(email, brief) {
  if (!isContactEmail(email)) return null;
  return `mailto:${email}?subject=${encodeURIComponent('EG TECH project brief | Let’s discuss your project')}&body=${encodeURIComponent(brief)}`;
}
