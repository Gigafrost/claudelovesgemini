// Main content script - orchestrates all functionality

(async function() {
  console.log('[Job Assistant] Content script loaded');

  // Initialize components
  const detector = new FormDetector();
  const filler = new FormFiller(detector);
  const ui = new UIInjector();

  let userProfile = null;
  let jobInfo = null;
  let isInitialized = false;

  /**
   * Initialize the extension UI and detection
   */
  async function initialize() {
    if (isInitialized) return;

    // Check if this is a job application page
    if (!detector.isJobApplicationPage()) {
      return;
    }

    console.log('[Job Assistant] Job application page detected');
    isInitialized = true;

    // Load user profile
    try {
      userProfile = await StorageManager.getUserProfile();
      if (!userProfile.resume && !userProfile.linkedIn) {
        ui.injectMainPanel();
        ui.showNotification('Please set up your profile in settings', 'warning');
        return;
      }
    } catch (error) {
      console.error('[Job Assistant] Error loading user profile:', error);
      return;
    }

    // Inject UI
    ui.injectMainPanel();

    // Detect platform
    const platform = detector.detectPlatform();
    const fields = detector.getFormFields();
    jobInfo = detector.getJobInfo();

    ui.updateStatus(platform?.getName(), fields.length, 0);

    // Monitoring for changes (e.g., next page in multi-step form)
    detector.monitorFormChanges((newFields) => {
      ui.updateStatus(platform?.getName(), newFields.length, filler.filledFields.size);
    });

    ui.showNotification('AI Job Assistant ready!', 'success');
  }

  /**
   * MutationObserver to handle dynamic page changes in SPAs
   */
  function setupPersistenceObserver() {
    const observer = new MutationObserver(() => {
      const btn = document.getElementById('job-assistant-float-btn');
      if (!btn) {
        // Assistant button missing, re-attempt injection
        isInitialized = false;
        initialize();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- Actions ---

  async function autoFill() {
    if (!userProfile || !jobInfo) return;
    ui.showLoading('btn-auto-fill');
    try {
      const result = await filler.autoFill(userProfile, true);
      ui.updateStatus(detector.platform?.getName(), detector.fields.length, filler.filledFields.size);
      ui.showNotification(`Filled ${result.filled} fields. Review pending items.`, 'success');
    } catch (error) {
      ui.showNotification('Error filling form.', 'error');
    } finally {
      ui.hideLoading('btn-auto-fill');
    }
  }

  // Event listeners for UI actions
  window.addEventListener('jobAssistant:autoFill', autoFill);
  window.addEventListener('jobAssistant:analyzeMatch', async () => {
    ui.showLoading('btn-analyze-match');
    try {
      const analysis = await JobMatcher.analyzeMatch(jobInfo.description, jobInfo.title, userProfile);
      ui.showMatchResults(analysis);
    } finally { ui.hideLoading('btn-analyze-match'); }
  });

  window.addEventListener('jobAssistant:confirmField', (e) => {
    filler.confirmField(e.detail.fieldId);
    ui.removePendingField(e.detail.fieldId);
    ui.updateStatus(detector.platform?.getName(), detector.fields.length, filler.filledFields.size);
  });

  // Start initialization and observer
  initialize();
  setupPersistenceObserver();
})();