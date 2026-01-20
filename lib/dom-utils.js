// DOM utilities for robust form field detection across:
// - normal DOM
// - shadow DOM (open)
// - same-origin iframes

class DomUtils {
  /**
   * Collect candidate form controls (inputs, textareas, selects) across
   * document, open shadow roots, and same-origin iframes.
   *
   * Returns: Array<{ element: Element, context: { kind: 'document'|'shadow'|'iframe', hostTag?: string, frameSrc?: string } }>
   */
  static collectFormControls() {
    const results = [];
    const seen = new Set();
    const queue = [{ root: document, kind: 'document', hostTag: null, frameSrc: null }];

    while (queue.length) {
      const item = queue.shift();
      const root = item.root;

      // Collect controls in this root
      let nodeList = [];
      try {
        nodeList = root.querySelectorAll('input, textarea, select');
      } catch (e) {
        // Some roots might not support querySelectorAll
        nodeList = [];
      }

      nodeList.forEach(el => {
        if (!el || seen.has(el)) return;
        seen.add(el);
        results.push({
          element: el,
          context: {
            kind: item.kind,
            hostTag: item.hostTag || undefined,
            frameSrc: item.frameSrc || undefined
          }
        });
      });

      // Discover open shadow roots
      let allEls = [];
      try {
        allEls = root.querySelectorAll('*');
      } catch (e) {
        allEls = [];
      }

      allEls.forEach(el => {
        if (el && el.shadowRoot) {
          queue.push({ root: el.shadowRoot, kind: 'shadow', hostTag: el.tagName.toLowerCase(), frameSrc: item.frameSrc });
        }

        // Discover same-origin iframes
        if (el && el.tagName === 'IFRAME') {
          try {
            const doc = el.contentDocument;
            if (doc) {
              queue.push({ root: doc, kind: 'iframe', hostTag: item.hostTag, frameSrc: el.src || null });
            }
          } catch (e) {
            // Cross-origin iframes are inaccessible
          }
        }
      });
    }

    return results;
  }

  /**
   * Best-effort label inference for a control.
   * Returns { label: string, sources: string[] } where sources are debug hints.
   */
  static inferLabel(control) {
    const sources = [];
    if (!control) return { label: '', sources };

    // 1) Native label associations
    try {
      if (control.labels && control.labels.length) {
        const txt = Array.from(control.labels)
          .map(l => (l.textContent || '').trim())
          .filter(Boolean)
          .join(' / ');
        if (txt) return { label: txt, sources: ['labels[]'] };
      }
    } catch (e) {}

    // 2) <label for="id">
    if (control.id) {
      const forLabel = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
      if (forLabel && (forLabel.textContent || '').trim()) {
        return { label: forLabel.textContent.trim(), sources: ['label[for=id]'] };
      }
    }

    // 3) closest label wrapper
    const parentLabel = control.closest && control.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true);
      clone.querySelectorAll('input, textarea, select').forEach(n => n.remove());
      const txt = (clone.textContent || '').trim();
      if (txt) return { label: txt, sources: ['closest(label)'] };
    }

    // 4) aria-labelledby
    const ariaLabelledBy = control.getAttribute && control.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const ids = ariaLabelledBy.split(/\s+/).filter(Boolean);
      const parts = [];
      ids.forEach(id => {
        const el = document.getElementById(id) || document.querySelector(`#${CSS.escape(id)}`);
        const t = el ? (el.textContent || '').trim() : '';
        if (t) parts.push(t);
      });
      if (parts.length) return { label: parts.join(' / '), sources: ['aria-labelledby'] };
    }

    // 5) aria-label
    const ariaLabel = control.getAttribute && control.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return { label: ariaLabel.trim(), sources: ['aria-label'] };
    }

    // 6) Heuristic: look for label-ish text near the element
    const heuristic = this.inferLabelFromNearbyText(control);
    if (heuristic.label) return heuristic;

    // 7) fallback to placeholder/name/id
    const placeholder = (control.getAttribute && control.getAttribute('placeholder')) || control.placeholder;
    if (placeholder && placeholder.trim()) return { label: placeholder.trim(), sources: ['placeholder'] };

    const name = control.getAttribute && control.getAttribute('name');
    if (name && name.trim()) return { label: name.trim(), sources: ['name'] };

    if (control.id) return { label: control.id, sources: ['id'] };

    return { label: '', sources };
  }

  static inferLabelFromNearbyText(control) {
    const sources = [];
    const MAX_CHARS = 80;

    // Prefer fieldset/legend
    const fieldset = control.closest && control.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      const legendTxt = legend ? (legend.textContent || '').trim() : '';
      if (legendTxt) return { label: legendTxt.slice(0, MAX_CHARS), sources: ['fieldset>legend'] };
    }

    // Common wrapper candidates: role=group, data-testid, data-automation-id, etc.
    const wrapper = control.closest && control.closest('[role="group"], [data-testid], [data-automation-id], .field, .form-field, .application-field, .input-field');
    const container = wrapper || (control.parentElement || null);

    if (container) {
      // Gather candidate text nodes in container excluding very large blocks
      const candidates = [];
      container.querySelectorAll('label, [class*="label"], [class*="Label"], span, div, p, h1, h2, h3, h4').forEach(el => {
        if (!el) return;
        // Skip if element contains the control itself
        if (el.contains(control)) return;

        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) return;
        if (txt.length > MAX_CHARS) return;
        // Skip likely helper text
        if (/optional$/i.test(txt)) return;
        candidates.push(txt);
      });

      if (candidates.length) {
        // Pick the first “good” candidate (often the label appears before help text)
        const label = candidates[0];
        sources.push(wrapper ? 'wrapper-text' : 'parent-text');
        return { label, sources };
      }
    }

    // Previous sibling scan
    let prev = control.previousElementSibling;
    let steps = 0;
    while (prev && steps < 4) {
      const txt = (prev.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt && txt.length <= MAX_CHARS) {
        return { label: txt, sources: ['previous-sibling'] };
      }
      prev = prev.previousElementSibling;
      steps++;
    }

    return { label: '', sources };
  }

  static isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (!style) return false;
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity || '1') === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
}

// Make available globally
window.DomUtils = DomUtils;
