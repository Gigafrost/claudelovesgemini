// Ashby platform handler (jobs.ashbyhq.com and custom Ashby-hosted pages)

class AshbyPlatform extends GenericPlatform {
  static detect() {
    const host = (window.location.hostname || '').toLowerCase();
    if (host.includes('ashbyhq.com')) return true;

    // Some Ashby installs are on custom domains but expose "Powered by Ashby".
    const bodyText = (document.body && document.body.innerText) ? document.body.innerText : '';
    if (/powered by\s+ashby/i.test(bodyText)) return true;

    // Ashby apps often include /application in the path.
    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('/application') && (document.querySelector('a[href*="ashbyhq.com"], img[alt*="Ashby"], [data-ashby], [data-testid*="ashby"]'))) {
      return true;
    }

    return false;
  }

  static getName() {
    return 'Ashby';
  }
}

window.AshbyPlatform = AshbyPlatform;
