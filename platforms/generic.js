// Generic platform handler for unknown job application sites

class GenericPlatform {
  static detect() {
    // Always returns true as fallback
    return true;
  }

  static getName() {
    return 'Generic';
  }

  static getFields() {
    const fields = [];

    // Find all form inputs on the page
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
      const label = this.findLabel(input);

      if (this.isVisibleAndEditable(input) && this.isLikelyFormField(input)) {
        fields.push({
          element: input,
          type: input.tagName.toLowerCase(),
          inputType: input.type || 'text',
          id: input.id,
          name: input.name,
          label: label,
          placeholder: input.placeholder,
          required: input.hasAttribute('required'),
          fieldType: this.categorizeField(label, input)
        });
      }
    });

    return fields;
  }

  static findLabel(input) {
    // Try multiple methods to find label
    if (input.id) {
      const labelFor = document.querySelector(`label[for="${input.id}"]`);
      if (labelFor) return labelFor.textContent.trim();
    }

    const parentLabel = input.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      clone.querySelector('input, textarea, select')?.remove();
      return clone.textContent.trim();
    }

    // Try aria-label
    if (input.getAttribute('aria-label')) {
      return input.getAttribute('aria-label');
    }

    // Try previous sibling
    let prevElement = input.previousElementSibling;
    while (prevElement) {
      if (prevElement.tagName === 'LABEL' || prevElement.classList.contains('label')) {
        return prevElement.textContent.trim();
      }
      prevElement = prevElement.previousElementSibling;
    }

    // Try parent's previous sibling
    const parent = input.parentElement;
    if (parent) {
      prevElement = parent.previousElementSibling;
      while (prevElement) {
        if (prevElement.tagName === 'LABEL' || prevElement.classList.contains('label')) {
          return prevElement.textContent.trim();
        }
        prevElement = prevElement.previousElementSibling;
      }
    }

    return input.placeholder || input.name || '';
  }

  static categorizeField(label, input) {
    const text = `${label} ${input.name} ${input.id} ${input.placeholder}`.toLowerCase();

    // Name fields
    if ((text.includes('first') && text.includes('name')) || text === 'firstname') return 'firstName';
    if ((text.includes('last') && text.includes('name')) || text === 'lastname') return 'lastName';
    if (text.includes('full') && text.includes('name')) return 'fullName';

    // Contact fields
    if (text.includes('email')) return 'email';
    if (text.includes('phone') || text.includes('mobile')) return 'phone';

    // Location fields
    if (text.includes('address') && !text.includes('email')) return 'address';
    if (text.includes('city')) return 'city';
    if (text.includes('state') || text.includes('province')) return 'state';
    if (text.includes('zip') || text.includes('postal')) return 'zipCode';
    if (text.includes('country')) return 'country';

    // Professional links
    if (text.includes('linkedin')) return 'linkedIn';
    if (text.includes('github')) return 'github';
    if (text.includes('portfolio') || text.includes('website')) return 'website';

    // Documents
    if (text.includes('resume') || text.includes('cv')) return 'resume';
    if (text.includes('cover') && text.includes('letter')) return 'coverLetter';

    // Application questions
    if (text.includes('why') && (text.includes('interested') || text.includes('apply') || text.includes('join'))) return 'whyInterested';
    if (text.includes('tell') && text.includes('about')) return 'aboutYourself';
    if (text.includes('experience') || text.includes('describe')) return 'experience';
    if (text.includes('qualification')) return 'qualifications';
    if (text.includes('strength')) return 'strengths';
    if (text.includes('weakness')) return 'weaknesses';
    if (text.includes('challenge')) return 'challenges';

    // Logistics
    if (text.includes('salary') || text.includes('compensation')) return 'salary';
    if (text.includes('available') || text.includes('start')) return 'availability';
    if (text.includes('notice') && text.includes('period')) return 'noticePeriod';
    if (text.includes('sponsor') || text.includes('visa') || text.includes('authorization')) return 'visa';
    if (text.includes('relocate') || text.includes('willing to move')) return 'relocation';

    // References
    if (text.includes('reference')) return 'reference';

    // Additional info
    if (text.includes('additional') || text.includes('anything else') || text.includes('comments')) return 'additionalInfo';

    return 'other';
  }

  static isLikelyFormField(element) {
    // Filter out search boxes, filters, etc.
    const excludeTypes = ['search', 'hidden', 'button', 'submit', 'reset', 'image'];
    if (excludeTypes.includes(element.type)) return false;

    // Filter out common non-application fields
    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    const excludeNames = ['search', 'query', 'filter', 'sort', 'password'];

    if (excludeNames.some(ex => name.includes(ex) || id.includes(ex))) {
      // Exception: don't exclude password if it's likely part of account creation
      if (name.includes('password') || id.includes('password')) {
        const label = this.findLabel(element).toLowerCase();
        if (label.includes('create') || label.includes('account')) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  static isVisibleAndEditable(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           !element.disabled &&
           !element.readOnly &&
           rect.width > 0 &&
           rect.height > 0;
  }

  static fillField(field, value) {
    field.element.value = value;

    // Trigger various events that frameworks might listen to
    field.element.dispatchEvent(new Event('input', { bubbles: true }));
    field.element.dispatchEvent(new Event('change', { bubbles: true }));
    field.element.dispatchEvent(new Event('blur', { bubbles: true }));

    // For React and other frameworks
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(field.element, value);
      field.element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  static getJobDescription() {
    // Try to find job description using common patterns
    const selectors = [
      '[class*="job-description"]',
      '[class*="description"]',
      '[id*="job-description"]',
      '[id*="description"]',
      'main article',
      'main section',
      '.content',
      '#content'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.length > 200) {
        return element.textContent.trim();
      }
    }

    // Fallback: get main content
    const main = document.querySelector('main') || document.body;
    return main.textContent.trim();
  }

  static getJobTitle() {
    // Try to find job title
    const selectors = [
      'h1',
      '[class*="job-title"]',
      '[class*="position"]',
      '[class*="title"]',
      'h2'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return document.title;
  }
}

// Make available globally
window.GenericPlatform = GenericPlatform;
