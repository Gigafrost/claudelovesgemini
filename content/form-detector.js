// Form detection across different platforms

class FormDetector {
  constructor() {
    this.platform = null;
    this.fields = [];
    this.jobInfo = {
      title: '',
      description: '',
      company: ''
    };
  }

  /**
   * Detect the platform and initialize
   */
  detectPlatform() {
    // Check platforms in order of specificity
    const platforms = [
      window.WorkdayPlatform,
      window.AshbyPlatform,
      window.GreenhousePlatform,
      window.LeverPlatform,
      window.GenericPlatform // Always last as fallback
    ];

    for (const PlatformClass of platforms) {
      if (PlatformClass.detect()) {
        this.platform = PlatformClass;
        console.log(`[Job Assistant] Detected platform: ${PlatformClass.getName()}`);
        return PlatformClass;
      }
    }

    return null;
  }

  /**
   * Get all form fields from the current platform
   */
  getFormFields() {
    if (!this.platform) {
      this.detectPlatform();
    }

    if (this.platform) {
      let fields = this.platform.getFields();

      // If a platform-specific adapter under-detects, supplement with the Generic scanner.
      try {
        const isGeneric = (this.platform === window.GenericPlatform) || (this.platform?.getName?.() === 'Generic');
        if (!isGeneric && Array.isArray(fields) && fields.length < 6 && window.GenericPlatform?.getFieldScanReport) {
          const genericReport = window.GenericPlatform.getFieldScanReport();
          const genericFields = Array.isArray(genericReport?.fields) ? genericReport.fields : [];

          const seenEls = new Set(fields.map(f => f.element).filter(Boolean));
          const additions = genericFields.filter(f => f.element && !seenEls.has(f.element) && (f.confidence ?? 0) >= 0.6);
          if (additions.length) {
            fields = fields.concat(additions);
          }
        }
      } catch (e) {
        // ignore supplement failures
      }

      this.fields = fields;
      return this.fields;
    }

    return [];
  }

  /**
   * Run a detection scan and return a debug-friendly report.
   * Platforms can optionally implement getFieldScanReport().
   */
  debugScan() {
    if (!this.platform) {
      this.detectPlatform();
    }

    if (this.platform && typeof this.platform.getFieldScanReport === 'function') {
      const report = this.platform.getFieldScanReport();
      // Keep fields in sync with the latest scan
      this.fields = report.fields || this.fields;
      return report;
    }

    // Fallback: synthesize a minimal report
    const fields = this.getFormFields();
    return {
      platform: this.platform?.getName?.() || 'Unknown',
      url: window.location.href,
      scanned: fields.length,
      included: fields.length,
      skipped: 0,
      fields,
      skippedCandidates: []
    };
  }

  /**
   * Get job information
   */
  getJobInfo() {
    if (!this.platform) {
      this.detectPlatform();
    }

    if (this.platform) {
      this.jobInfo = {
        title: this.platform.getJobTitle(),
        description: this.platform.getJobDescription(),
        company: this.extractCompanyName()
      };
    }

    return this.jobInfo;
  }

  /**
   * Extract company name from URL or page
   */
  extractCompanyName() {
    // Try from URL
    const url = window.location.href;

    // Workday pattern
    const workdayMatch = url.match(/https?:\/\/([^.]+)\.myworkdayjobs\.com/);
    if (workdayMatch) {
      return this.formatCompanyName(workdayMatch[1]);
    }

    // Try from page title
    const title = document.title;
    const titleMatch = title.match(/(.+?)\s*[-|]|(.+)/);
    if (titleMatch) {
      return titleMatch[1] || titleMatch[2];
    }

    // Try from metadata
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName) {
      return ogSiteName.content;
    }

    return 'Company';
  }

  /**
   * Format company name
   */
  formatCompanyName(name) {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if current page is likely a job application
   */
  isJobApplicationPage() {
    const url = window.location.href.toLowerCase();
    const keywords = ['apply', 'application', 'job', 'career', 'position', 'opening'];

    // Check URL
    if (keywords.some(keyword => url.includes(keyword))) {
      return true;
    }

    // Check if there are form fields that look like application fields
    const fields = this.getFormFields();
    const applicationFieldTypes = ['firstName', 'lastName', 'email', 'phone', 'resume', 'coverLetter'];

    const hasApplicationFields = fields.some(field =>
      applicationFieldTypes.includes(field.fieldType)
    );

    return hasApplicationFields && fields.length >= 3;
  }

  /**
   * Detect if page has account wall
   */
  detectAccountWall() {
    if (window.PlatformsConfig) {
      return window.PlatformsConfig.detectAccountWall();
    }
    return { detected: false, platform: null, confidence: 0 };
  }

  /**
   * Monitor for form changes (for multi-page applications)
   */
  monitorFormChanges(callback) {
    const observer = new MutationObserver((mutations) => {
      // Check if new form fields appeared
      const newFields = this.getFormFields();
      if (newFields.length !== this.fields.length) {
        this.fields = newFields;
        callback(newFields);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /**
   * Group fields by category
   */
  groupFields() {
    const grouped = {
      personal: [],
      contact: [],
      professional: [],
      documents: [],
      questions: [],
      other: []
    };

    this.fields.forEach(field => {
      switch (field.fieldType) {
        case 'firstName':
        case 'lastName':
        case 'fullName':
          grouped.personal.push(field);
          break;

        case 'email':
        case 'phone':
        case 'address':
        case 'city':
        case 'state':
        case 'zipCode':
        case 'country':
          grouped.contact.push(field);
          break;

        case 'linkedIn':
        case 'website':
        case 'github':
        case 'portfolio':
          grouped.professional.push(field);
          break;

        case 'resume':
        case 'coverLetter':
          grouped.documents.push(field);
          break;

        case 'whyInterested':
        case 'experience':
        case 'aboutYourself':
        case 'qualifications':
        case 'strengths':
        case 'weaknesses':
        case 'challenges':
          grouped.questions.push(field);
          break;

        default:
          grouped.other.push(field);
      }
    });

    return grouped;
  }

  /**
   * Get fillable fields (exclude file uploads for now)
   */
  getFillableFields() {
    return this.fields.filter(field =>
      field.type !== 'file' &&
      field.inputType !== 'file' &&
      field.inputType !== 'button' &&
      field.inputType !== 'submit'
    );
  }
}

// Make available globally
window.FormDetector = FormDetector;
