// Lever platform detector and handler

class LeverPlatform {
  static detect() {
    // Check URL for Lever domains
    const url = window.location.href.toLowerCase();
    if (url.includes('lever.co') || url.includes('jobs.lever.co')) {
      return true;
    }

    // Check for Lever-specific data attributes and elements
    if (document.querySelector('[data-qa="posting-name"]') ||
        document.querySelector('.posting-headline') ||
        document.querySelector('meta[property="og:site_name"][content="Lever"]')) {
      return true;
    }

    return false;
  }

  static getName() {
    return 'Lever';
  }

  static getFields() {
    const fields = [];

    const inputs = document.querySelectorAll('input, textarea, select');

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

    // Try closest form field
    const formField = input.closest('.application-field, .form-field');
    if (formField) {
      const label = formField.querySelector('label, .label');
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
    if (text.includes('resume')) return { type: 'resume', confidence: 0.9 };
    if (text.includes('cover') && text.includes('letter')) return { type: 'coverLetter', confidence: 0.9 };
    if (text.includes('linkedin')) return { type: 'linkedIn', confidence: 0.95 };
    if (text.includes('website') || text.includes('portfolio')) return { type: 'website', confidence: 0.85 };
    if (text.includes('github')) return { type: 'github', confidence: 0.9 };
    if (text.includes('additional') && text.includes('information')) return { type: 'additionalInfo', confidence: 0.8 };
    if (text.includes('why')) return { type: 'whyInterested', confidence: 0.85 };
    if (text.includes('experience')) return { type: 'experience', confidence: 0.8 };

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
      '.posting-description',
      '.job-description',
      '.description',
      'main'
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
      '.posting-headline h2',
      '.job-title',
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
window.LeverPlatform = LeverPlatform;
