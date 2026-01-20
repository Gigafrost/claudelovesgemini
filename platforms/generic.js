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
    const report = this.getFieldScanReport();
    return report.fields;
  }

  /**
   * Scan the page for form fields and return a debug-friendly report.
   * This is the workhorse for detection across unknown sites.
   */
  static getFieldScanReport() {
    const fields = [];
    const skipped = [];

    const candidates = (window.DomUtils && window.DomUtils.collectFormControls)
      ? window.DomUtils.collectFormControls()
      : this.getAllInputs().map(el => ({ element: el, context: { kind: 'document' } }));

    for (const c of candidates) {
      const el = c.element;
      const ctx = c.context || { kind: 'document' };

      const skipReason = this.getSkipReason(el);
      if (skipReason) {
        skipped.push(this.debugCandidate(el, ctx, skipReason));
        continue;
      }

      const labelInfo = (window.DomUtils && window.DomUtils.inferLabel)
        ? window.DomUtils.inferLabel(el)
        : { label: this.findLabel(el), sources: ['legacy'] };

      const fieldClassification = this.categorizeField(labelInfo.label, el);

      const tag = el.tagName.toLowerCase();
      const inputType = (el.type || '').toLowerCase() || 'text';
      const autocomplete = (el.getAttribute?.('autocomplete') || '').toLowerCase();

      // Detect radio groups as a single logical field
      if (tag === 'input' && inputType === 'radio') {
        const groupName = el.name || el.id || 'radio';
        const existing = fields.find(f => f.fieldType === 'radioGroup' && f.name === groupName);
        if (existing) {
          // Add option
          existing.options.push(this.getOptionInfo(el));
          continue;
        }

        fields.push({
          element: el,
          type: 'input',
          inputType,
          id: el.id,
          name: groupName,
          label: labelInfo.label,
          labelSources: labelInfo.sources || [],
          placeholder: el.placeholder,
          required: el.hasAttribute('required'),
          fieldType: 'radioGroup',
          confidence: Math.max(fieldClassification.confidence || 0, 0.6),
          isLongForm: false,
          autocomplete,
          options: [this.getOptionInfo(el)]
        });
        continue;
      }

      // Normal fields
      fields.push({
        element: el,
        type: tag,
        inputType,
        id: el.id,
        name: el.name,
        label: labelInfo.label,
        labelSources: labelInfo.sources || [],
        placeholder: el.placeholder,
        required: el.hasAttribute('required'),
        fieldType: fieldClassification.type,
        confidence: fieldClassification.confidence,
        classificationReasons: fieldClassification.reasons || [],
        isLongForm: tag === 'textarea' || (inputType === 'text' && (el.maxLength > 500 || (el.value || '').length > 250)),
        autocomplete,
        context: ctx
      });
    }

    // Store last report for debugging
    this._lastReport = {
      platform: this.getName(),
      url: window.location.href,
      scanned: candidates.length,
      included: fields.length,
      skipped: skipped.length,
      fields,
      skippedCandidates: skipped.slice(0, 250) // cap to avoid huge UI
    };

    return this._lastReport;
  }

  /**
   * Get all inputs including those in Shadow DOM
   */
  static getAllInputs() {
    const inputs = [];

    // Regular DOM inputs
    inputs.push(...document.querySelectorAll('input, textarea, select'));

    // Shadow DOM inputs
    const elementsWithShadowRoot = document.querySelectorAll('*');
    elementsWithShadowRoot.forEach(element => {
      if (element.shadowRoot) {
        inputs.push(...element.shadowRoot.querySelectorAll('input, textarea, select'));
      }
    });

    return inputs;
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
    // Use FieldMapper for element-aware classification if available
    if (window.FieldMapper) {
      if (typeof window.FieldMapper.classifyElement === 'function') {
        return window.FieldMapper.classifyElement(input, label);
      }
      return window.FieldMapper.classifyField(
        label,
        input.name || '',
        input.id || '',
        input.placeholder || ''
      );
    }

    // Fallback to basic classification
    const text = `${label} ${input.name} ${input.id} ${input.placeholder}`.toLowerCase();

    // Basic pattern matching as fallback
    if (text.includes('email')) return { type: 'email', confidence: 0.9 };
    if (text.includes('phone')) return { type: 'phone', confidence: 0.9 };
    if (text.includes('first') && text.includes('name')) return { type: 'firstName', confidence: 0.9 };
    if (text.includes('last') && text.includes('name')) return { type: 'lastName', confidence: 0.9 };

    return { type: 'other', confidence: 0.5 };
  }

  static getSkipReason(element) {
    if (!element) return 'no-element';

    // Filter out search boxes, filters, etc.
    const excludeTypes = ['search', 'hidden', 'button', 'submit', 'reset', 'image'];
    const t = (element.type || '').toLowerCase();
    if (excludeTypes.includes(t)) return `excludeType:${t}`;

    // Exclude non-editable elements
    if (element.disabled) return 'disabled';
    if (element.readOnly) return 'readonly';

    // Not visible
    if (window.DomUtils && window.DomUtils.isVisible) {
      if (!window.DomUtils.isVisible(element)) return 'not-visible';
    } else {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden') return 'not-visible';
      if (rect.width === 0 || rect.height === 0) return 'not-visible';
    }

    // Filter out common non-application fields
    const name = (element.name || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    const excludeNames = ['search', 'query', 'filter', 'sort'];
    if (excludeNames.some(ex => name.includes(ex) || id.includes(ex))) return 'looks-like-search';

    return null;
  }

  static debugCandidate(element, context, reason) {
    const labelInfo = (window.DomUtils && window.DomUtils.inferLabel)
      ? window.DomUtils.inferLabel(element)
      : { label: this.findLabel(element), sources: ['legacy'] };

    const tag = (element.tagName || '').toLowerCase();
    const inputType = (element.type || '').toLowerCase();
    const autocomplete = (element.getAttribute?.('autocomplete') || '').toLowerCase();

    return {
      reason,
      tag,
      inputType,
      id: element.id || '',
      name: element.name || '',
      autocomplete,
      label: labelInfo.label,
      labelSources: labelInfo.sources || [],
      context
    };
  }

  static getOptionInfo(inputEl) {
    // For radios/checkboxes, option label can be nearby text or wrapping label.
    let optionLabel = '';
    const parentLabel = inputEl.closest && inputEl.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      clone.querySelectorAll('input').forEach(n => n.remove());
      optionLabel = (clone.textContent || '').trim();
    }
    return {
      value: inputEl.value,
      label: optionLabel || inputEl.value
    };
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
