// Greenhouse platform detector and handler

class GreenhousePlatform {
  static detect() {
    return window.location.href.includes('greenhouse.io') ||
           window.location.href.includes('boards.greenhouse.io') ||
           document.querySelector('#application_form') !== null ||
           document.querySelector('.application-form') !== null;
  }

  static getName() {
    return 'Greenhouse';
  }

  static getFields() {
    const fields = [];

    // Greenhouse typically uses standard form inputs
    const formSelectors = [
      '#application_form input',
      '#application_form textarea',
      '#application_form select',
      '.application-form input',
      '.application-form textarea',
      '.application-form select'
    ];

    const inputs = document.querySelectorAll(formSelectors.join(', '));

    inputs.forEach(input => {
      const label = this.findLabel(input);

      if (this.isVisibleAndEditable(input)) {
        const classification = this.categorizeField(label, input);
        fields.push({
          element: input,
          type: input.tagName.toLowerCase(),
          inputType: input.type || 'text',
          id: input.id,
          name: input.name,
          label: label,
          placeholder: input.placeholder,
          required: input.hasAttribute('required'),
          fieldType: classification.type,
          confidence: classification.confidence,
          isLongForm: input.tagName.toLowerCase() === 'textarea'
        });
      }
    });

    return fields;
  }

  static findLabel(input) {
    // Try label element
    if (input.id) {
      const labelFor = document.querySelector(`label[for="${input.id}"]`);
      if (labelFor) return labelFor.textContent.trim();
    }

    // Try parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      clone.querySelector('input, textarea, select')?.remove();
      return clone.textContent.trim();
    }

    // Try previous sibling label
    let prevElement = input.previousElementSibling;
    while (prevElement) {
      if (prevElement.tagName === 'LABEL') {
        return prevElement.textContent.trim();
      }
      prevElement = prevElement.previousElementSibling;
    }

    // Try closest field wrapper
    const fieldWrapper = input.closest('.field');
    if (fieldWrapper) {
      const label = fieldWrapper.querySelector('label');
      if (label) return label.textContent.trim();
    }

    return input.placeholder || input.name || '';
  }

  static categorizeField(label, input) {
    // Use FieldMapper if available for consistent classification
    if (window.FieldMapper && typeof window.FieldMapper.classifyElement === 'function') {
      return window.FieldMapper.classifyElement(input, label);
    }

    const text = `${label} ${input.name} ${input.id}`.toLowerCase();

    if (text.includes('first') && text.includes('name')) return { type: 'firstName', confidence: 0.9 };
    if (text.includes('last') && text.includes('name')) return { type: 'lastName', confidence: 0.9 };
    if (text.includes('email')) return { type: 'email', confidence: 0.9 };
    if (text.includes('phone')) return { type: 'phone', confidence: 0.9 };
    if (text.includes('resume') || text.includes('cv')) return { type: 'resume', confidence: 0.9 };
    if (text.includes('cover') && text.includes('letter')) return { type: 'coverLetter', confidence: 0.9 };
    if (text.includes('linkedin')) return { type: 'linkedIn', confidence: 0.95 };
    if (text.includes('website') || text.includes('portfolio')) return { type: 'website', confidence: 0.85 };
    if (text.includes('github')) return { type: 'github', confidence: 0.9 };
    if (text.includes('address')) return { type: 'address', confidence: 0.85 };
    if (text.includes('city')) return { type: 'city', confidence: 0.9 };
    if (text.includes('state')) return { type: 'state', confidence: 0.9 };
    if (text.includes('zip') || text.includes('postal')) return { type: 'zipCode', confidence: 0.9 };
    if (text.includes('country')) return { type: 'country', confidence: 0.9 };
    if (text.includes('why') || text.includes('interested')) return { type: 'whyInterested', confidence: 0.85 };
    if (text.includes('experience')) return { type: 'experience', confidence: 0.8 };
    if (text.includes('salary')) return { type: 'salary', confidence: 0.9 };
    if (text.includes('available') || text.includes('start')) return { type: 'availability', confidence: 0.85 };
    if (text.includes('sponsor') || text.includes('visa')) return { type: 'visa', confidence: 0.9 };
    if (text.includes('relocate')) return { type: 'relocation', confidence: 0.9 };

    return { type: 'other', confidence: 0.5 };
  }

  static isVisibleAndEditable(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           !element.disabled &&
           !element.readOnly &&
           element.type !== 'hidden';
  }

  static fillField(field, value) {
    field.element.value = value;
    field.element.dispatchEvent(new Event('input', { bubbles: true }));
    field.element.dispatchEvent(new Event('change', { bubbles: true }));
    field.element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  static getJobDescription() {
    const descriptionSelectors = [
      '#content',
      '.job-post',
      '.application-content',
      '[id*="description"]',
      '[class*="description"]'
    ];

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }

    return '';
  }

  static getJobTitle() {
    const titleSelectors = [
      '.app-title',
      '.job-title',
      'h1.application-title',
      'h1',
      'h2'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return '';
  }
}

// Make available globally
window.GreenhousePlatform = GreenhousePlatform;
