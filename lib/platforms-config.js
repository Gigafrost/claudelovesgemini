// Platform configuration for account wall detection

class PlatformsConfig {
  constructor() {
    // Known platforms that require account creation
    this.accountWallPlatforms = [
      {
        name: 'Workday',
        domains: ['myworkdayjobs.com', 'workday.com'],
        indicators: ['sign in', 'create account', 'register', 'login'],
        requiresAccount: true
      },
      {
        name: 'Taleo (Oracle)',
        domains: ['taleo.net', 'oraclecloud.com/careers'],
        indicators: ['sign in', 'create profile', 'returning user'],
        requiresAccount: true
      },
      {
        name: 'iCIMS',
        domains: ['icims.com'],
        indicators: ['sign in', 'create account', 'login'],
        requiresAccount: true
      },
      {
        name: 'SuccessFactors (SAP)',
        domains: ['successfactors.com', 'sap.com/careers'],
        indicators: ['sign in', 'create account'],
        requiresAccount: true
      },
      {
        name: 'BrassRing',
        domains: ['brassring.com'],
        indicators: ['sign in', 'create profile'],
        requiresAccount: true
      },
      {
        name: 'Greenhouse',
        domains: ['greenhouse.io'],
        indicators: [],
        requiresAccount: false  // Usually no account needed
      },
      {
        name: 'Lever',
        domains: ['lever.co'],
        indicators: [],
        requiresAccount: false  // Usually no account needed
      }
    ];
  }

  /**
   * Detect if current page requires account creation
   */
  detectAccountWall() {
    const url = window.location.href.toLowerCase();
    const pageText = document.body.innerText.toLowerCase();

    // Check if URL matches known account-wall platforms
    for (const platform of this.accountWallPlatforms) {
      if (!platform.requiresAccount) continue;

      const matchesDomain = platform.domains.some(domain => url.includes(domain));

      if (matchesDomain) {
        // Look for account-related indicators on the page
        const hasIndicators = platform.indicators.some(indicator =>
          pageText.includes(indicator)
        );

        if (hasIndicators || this.detectAccountCreationForm()) {
          return {
            detected: true,
            platform: platform.name,
            confidence: hasIndicators ? 0.95 : 0.7
          };
        }
      }
    }

    // Generic account wall detection
    if (this.detectAccountCreationForm()) {
      return {
        detected: true,
        platform: 'Unknown',
        confidence: 0.6
      };
    }

    return {
      detected: false,
      platform: null,
      confidence: 0
    };
  }

  /**
   * Detect account creation form elements
   */
  detectAccountCreationForm() {
    // Look for common account creation patterns
    const indicators = [
      'create account',
      'sign up',
      'register',
      'create profile',
      'new user',
      'returning user',
      'forgot password'
    ];

    // Check buttons and headings
    const buttons = Array.from(document.querySelectorAll('button, a, h1, h2, h3'));
    const buttonTexts = buttons.map(b => b.textContent.toLowerCase());

    const matchCount = indicators.filter(indicator =>
      buttonTexts.some(text => text.includes(indicator))
    ).length;

    // If we find 2+ account-related elements, likely an account wall
    return matchCount >= 2;
  }

  /**
   * Check if user preference is to skip account walls
   */
  async shouldSkipAccountWalls() {
    try {
      const prefs = await chrome.storage.local.get('preferences');
      return prefs.preferences?.skipAccountWalls || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get platform info by URL
   */
  getPlatformInfo(url) {
    const lowerUrl = url.toLowerCase();

    for (const platform of this.accountWallPlatforms) {
      const matchesDomain = platform.domains.some(domain => lowerUrl.includes(domain));

      if (matchesDomain) {
        return platform;
      }
    }

    return null;
  }
}

// Make available globally
window.PlatformsConfig = new PlatformsConfig();
