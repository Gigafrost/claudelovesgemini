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
          fieldType: this.categorizeField(label, automationId, input)
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
    const text = `${label} ${automationId} ${input.name}`.toLowerCase();

    if (text.includes('first') && text.includes('name')) return 'firstName';
    if (text.includes('last') && text.includes('name')) return 'lastName';
    if (text.includes('email')) return 'email';
    if (text.includes('phone')) return 'phone';
    if (text.includes('address')) return 'address';
    if (text.includes('city')) return 'city';
    if (text.includes('state')) return 'state';
    if (text.includes('zip') || text.includes('postal')) return 'zipCode';
    if (text.includes('country')) return 'country';
    if (text.includes('linkedin')) return 'linkedIn';
    if (text.includes('portfolio') || text.includes('website')) return 'website';
    if (text.includes('cover') && text.includes('letter')) return 'coverLetter';
    if (text.includes('why') || text.includes('interested')) return 'whyInterested';
    if (text.includes('experience') || text.includes('describe')) return 'experience';
    if (text.includes('salary')) return 'salary';
    if (text.includes('available') || text.includes('start')) return 'availability';
    if (text.includes('visa') || text.includes('sponsor')) return 'visa';
    if (text.includes('relocate')) return 'relocation';
    if (text.includes('reference')) return 'reference';

    return 'other';
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
