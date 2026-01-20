// Ashby platform handler (jobs.ashbyhq.com and custom Ashby-hosted pages)

class AshbyPlatform extends GenericPlatform {
  static detect() {
    try {
      const host = (window.location.hostname || '').toLowerCase();
      if (host.includes('ashbyhq.com')) return true;

      // Check for Ashby-specific elements first (faster than innerText)
      const ashbySelectors = 'a[href*="ashbyhq.com"], img[alt*="Ashby"], [data-ashby], [data-testid*="ashby"]';
      if (document.querySelector(ashbySelectors)) return true;

      // Check for "Powered by Ashby" in footer area only (avoid scanning entire page)
      const footer = document.querySelector('footer, [class*="footer"], [id*="footer"]');
      if (footer) {
        const footerText = footer.textContent || '';
        if (/powered by\s+ashby/i.test(footerText)) return true;
      }

      // Also check for Ashby in the last few elements of the page (common placement)
      const bodyChildren = document.body ? document.body.children : [];
      const lastElements = Array.from(bodyChildren).slice(-5);
      for (const el of lastElements) {
        const text = el.textContent || '';
        if (text.length < 1000 && /powered by\s+ashby/i.test(text)) return true;
      }

      // Ashby apps often include /application in the path with specific markers
      const path = (window.location.pathname || '').toLowerCase();
      if (path.includes('/application') && document.querySelector(ashbySelectors)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Job Assistant] Error in Ashby detection:', error);
      return false;
    }
  }

  static getName() {
    return 'Ashby';
  }
}

window.AshbyPlatform = AshbyPlatform;
