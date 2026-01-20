// Workday platform detector and handler

class WorkdayPlatform {
  static detect() {
    return window.location.href.includes('myworkdayjobs.com') ||
           window.location.href.includes('workday.com') ||
           document.querySelector('[data-automation-id*="workday"]') !== null;
  }

  static getName() {
    return 'Workday';
  }

  static getFields() {
    const fields = [];

    // Workday uses data-automation-id attributes
    const inputs = document.querySelectorAll('input[data-automation-id], textarea[data-automation-id], select[data-automation-id]');

    inputs.forEach(input => {
      const automationId = input.getAttribute('data-automation-id');
      const label = this.findLabel(input);

      if (this.isVisibleAndEditable(input)) {
        const classification = this.categorizeField(label, automationId, input);
        fields.push({
          element: input,
          type: input.tagName.toLowerCase(),
          inputType: input.type || 'text',
          id: input.id || automationId,
          name: input.name || automationId,
          label: label,
          automationId: automationId,
          placeholder: input.placeholder,
          required: input.hasAttribute('required') || input.getAttribute('aria-required') === 'true',
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
    const labelFor = document.querySelector(`label[for="${input.id}"]`);
    if (labelFor) return labelFor.textContent.trim();

    // Try aria-label
    if (input.getAttribute('aria-label')) {
      return input.getAttribute('aria-label');
    }

    // Try parent label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();

    // Try previous sibling
    const prevSibling = input.previousElementSibling;
    if (prevSibling && prevSibling.tagName === 'LABEL') {
      return prevSibling.textContent.trim();
    }

    // Try data-automation-label
    const automatedLabel = input.closest('[data-automation-id]')?.querySelector('[data-automation-id*="label"]');
    if (automatedLabel) return automatedLabel.textContent.trim();

    return '';
  }

  static categorizeField(label, automationId, input) {
    // Use FieldMapper if available for consistent classification
    if (window.FieldMapper && typeof window.FieldMapper.classifyElement === 'function') {
      return window.FieldMapper.classifyElement(input, label);
    }

    const text = `${label} ${automationId} ${input.name}`.toLowerCase();

    if (text.includes('first') && text.includes('name')) return { type: 'firstName', confidence: 0.9 };
    if (text.includes('last') && text.includes('name')) return { type: 'lastName', confidence: 0.9 };
    if (text.includes('email')) return { type: 'email', confidence: 0.9 };
    if (text.includes('phone')) return { type: 'phone', confidence: 0.9 };
    if (text.includes('address')) return { type: 'address', confidence: 0.85 };
    if (text.includes('city')) return { type: 'city', confidence: 0.9 };
    if (text.includes('state')) return { type: 'state', confidence: 0.9 };
    if (text.includes('zip') || text.includes('postal')) return { type: 'zipCode', confidence: 0.9 };
    if (text.includes('country')) return { type: 'country', confidence: 0.9 };
    if (text.includes('linkedin')) return { type: 'linkedIn', confidence: 0.95 };
    if (text.includes('portfolio') || text.includes('website')) return { type: 'website', confidence: 0.85 };
    if (text.includes('cover') && text.includes('letter')) return { type: 'coverLetter', confidence: 0.9 };
    if (text.includes('why') || text.includes('interested')) return { type: 'whyInterested', confidence: 0.85 };
    if (text.includes('experience') || text.includes('describe')) return { type: 'experience', confidence: 0.8 };
    if (text.includes('salary')) return { type: 'salary', confidence: 0.9 };
    if (text.includes('available') || text.includes('start')) return { type: 'availability', confidence: 0.85 };
    if (text.includes('visa') || text.includes('sponsor')) return { type: 'visa', confidence: 0.9 };
    if (text.includes('relocate')) return { type: 'relocation', confidence: 0.9 };
    if (text.includes('reference')) return { type: 'reference', confidence: 0.9 };

    return { type: 'other', confidence: 0.5 };
  }

  static isVisibleAndEditable(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           !element.disabled &&
           !element.readOnly;
  }

  static fillField(field, value) {
    field.element.value = value;
    field.element.dispatchEvent(new Event('input', { bubbles: true }));
    field.element.dispatchEvent(new Event('change', { bubbles: true }));
    field.element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  static getJobDescription() {
    // Try to find job description on Workday
    const descriptionSelectors = [
      '[data-automation-id="jobPostingDescription"]',
      '.job-description',
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
      '[data-automation-id="jobPostingHeader"]',
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
window.WorkdayPlatform = WorkdayPlatform;
