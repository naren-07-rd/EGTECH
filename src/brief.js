export function createBrief(data) {
  const services = data.getAll('service').filter(Boolean);
  const pkg = String(data.get('package') || '').trim();
  const lines = [
    'EG TECH | PROJECT BRIEF',
    'IDEAS TODAY | IMPACT TOMORROW',
    '',
    `Name: ${String(data.get('name') || '').trim()}`,
    `Email: ${String(data.get('email') || '').trim()}`,
    `Company: ${String(data.get('company') || '').trim() || 'Not specified'}`,
  ];
  if (pkg) {
    lines.push(`Website package: ${pkg}`);
  }
  lines.push(
    `Interested in: ${services.length ? services.join(', ') : 'Let’s explore together'}`,
    `Project scale: ${data.get('budget') || 'Let’s discuss'}`,
    `Timeline: ${data.get('timeline') || 'Flexible / exploring'}`,
    '', 'THE IDEA', String(data.get('idea') || '').trim(),
  );
  return lines.join('\n');
}

export function validateBriefInput(data) {
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const idea = String(data.get('idea') || '').trim();

  if (!name) {
    return { valid: false, field: 'name', message: 'Please enter your name.' };
  }
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!email || !EMAIL_REGEX.test(email)) {
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

export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjygzedl';

/**
 * Prepares a FormData object for Formspree submission, collecting all selected
 * service choices, ensuring a descriptive email subject, and appending a formatted brief.
 */
export function prepareFormData(form) {
  const formData = new FormData(form);

  // Collect all selected services so none are dropped or overwritten
  const services = formData.getAll('service').filter(Boolean);
  const servicesJoined = services.length > 0 ? services.join(', ') : 'Let’s explore together';
  formData.delete('service');
  formData.append('services', servicesJoined);
  formData.append('service', servicesJoined);

  // Subject line for Formspree notification email
  if (!formData.get('_subject')) {
    formData.set('_subject', 'New EG TECH Project Enquiry');
  }

  // Include formatted brief summary for readability in notification email
  const briefSummary = createBrief(formData);
  formData.set('project_brief', briefSummary);

  return formData;
}

/**
 * Submits the enquiry to Formspree using fetch with Accept: application/json.
 * Does not set Content-Type so browser sets boundary for multipart/form-data.
 */
export async function submitEnquiry(formData, endpoint = FORMSPREE_ENDPOINT) {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred while submitting your enquiry. Please try again or email us directly at narenthiranath703@gmail.com.';
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        if (errorData && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map(err => err.message || err.error || 'Invalid input').join('. ');
        } else if (errorData && (errorData.error || errorData.message)) {
          errorMessage = errorData.error || errorData.message;
        }
      } else {
        const text = await response.text();
        if (text && text.length < 200 && !text.includes('<html')) {
          errorMessage = text;
        } else if (response.status === 429) {
          errorMessage = 'Submission limit reached. Please email us directly at narenthiranath703@gmail.com.';
        } else if (response.status >= 500) {
          errorMessage = 'Server is temporarily unavailable. Please try again later or email us directly.';
        }
      }
    } catch {
      if (response.status === 429) {
        errorMessage = 'Submission limit reached. Please email us directly at narenthiranath703@gmail.com.';
      } else if (response.status >= 500) {
        errorMessage = 'Server is temporarily unavailable. Please try again later or email us directly.';
      }
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return await response.json().catch(() => ({ ok: true }));
}

