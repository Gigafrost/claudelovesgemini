// Lever platform detector and handler

class LeverPlatform {
  static detect() {
    return window.location.href.includes('lever.co') ||
           window.location.href.includes('jobs.lever.co') ||
           document.querySelector('.application-form') !== null ||
           document.querySelector('[class*="lever"]') !== null;
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
    const text = `${label} ${input.name} ${input.id}`.toLowerCase();

    if (text.includes('first') && text.includes('name')) return 'firstName';
    if (text.includes('last') && text.includes('name')) return 'lastName';
    if (text.includes('email')) return 'email';
    if (text.includes('phone')) return 'phone';
    if (text.includes('resume')) return 'resume';
    if (text.includes('cover') && text.includes('letter')) return 'coverLetter';
    if (text.includes('linkedin')) return 'linkedIn';
    if (text.includes('website') || text.includes('portfolio')) return 'website';
    if (text.includes('github')) return 'github';
    if (text.includes('additional') && text.includes('information')) return 'additionalInfo';
    if (text.includes('why')) return 'whyInterested';
    if (text.includes('experience')) return 'experience';

    return 'other';
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
