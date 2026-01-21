// Main content script - orchestrates all functionality

(async function() {
  console.log('[Job Assistant] Content script loaded on:', window.location.href);

  // Early check - make sure required globals exist
  const requiredGlobals = ['FormDetector', 'FormFiller', 'UIInjector', 'StorageManager'];
  const missingGlobals = requiredGlobals.filter(g => !window[g]);
  if (missingGlobals.length > 0) {
    console.error('[Job Assistant] Missing required globals:', missingGlobals);
    return;
  }

  // Initialize components
  console.log('[Job Assistant] Initializing components...');
  const detector = new FormDetector();
  const filler = new FormFiller(detector);
  const ui = new UIInjector();
  console.log('[Job Assistant] Components initialized');

  let userProfile = null;
  let jobInfo = null;
  let isInitialized = false;

  /**
   * Initialize the extension
   */
  async function initialize() {
    if (isInitialized) return;

    console.log('[Job Assistant] Starting initialization...');

    // Check if this is a job application page
    console.log('[Job Assistant] Checking if job application page...');
    let isJobPage = false;
    try {
      isJobPage = detector.isJobApplicationPage();
    } catch (e) {
      console.error('[Job Assistant] Error checking job page:', e);
    }

    if (!isJobPage) {
      console.log('[Job Assistant] Not a job application page, exiting');
      return;
    }

    console.log('[Job Assistant] Job application page detected');
    isInitialized = true;

    // Load user profile
    console.log('[Job Assistant] Loading user profile...');
    try {
      userProfile = await StorageManager.getUserProfile();
      console.log('[Job Assistant] User profile loaded:', !!userProfile?.resume, !!userProfile?.linkedIn);

      if (!userProfile.resume && !userProfile.linkedIn) {
        ui.injectMainPanel();
        ui.showNotification('Please set up your resume and LinkedIn profile in the extension options', 'warning');
        return;
      }
    } catch (error) {
      console.error('[Job Assistant] Error loading user profile:', error);
      return;
    }

    // Inject UI first so user sees something
    console.log('[Job Assistant] Injecting UI panel...');
    ui.injectMainPanel();

    // Detect platform and get fields
    console.log('[Job Assistant] Detecting platform...');
    const platform = detector.detectPlatform();

    console.log('[Job Assistant] Getting form fields...');
    const fields = detector.getFormFields();

    console.log('[Job Assistant] Getting job info...');
    jobInfo = detector.getJobInfo();

    // Update UI status
    console.log('[Job Assistant] Updating UI status...');
    ui.updateStatus(platform?.getName(), fields.length, 0);

    // Log job info
    console.log('[Job Assistant] Job Info:', jobInfo);
    console.log('[Job Assistant] Found fields:', fields.length);

    // Monitor for form changes
    detector.monitorFormChanges((newFields) => {
      console.log('[Job Assistant] Form changed, new fields:', newFields.length);
      ui.updateStatus(platform?.getName(), newFields.length, filler.filledFields.size);
    });

    // Show ready notification
    ui.showNotification('AI Job Assistant ready! Click the robot button to start.', 'success');
    console.log('[Job Assistant] Initialization complete!');
  }

  /**
   * Analyze job match
   */
  async function analyzeMatch() {
    if (!userProfile || !jobInfo) return;

    ui.showLoading('btn-analyze-match');

    try {
      const analysis = await JobMatcher.analyzeMatch(
        jobInfo.description,
        jobInfo.title,
        userProfile
      );

      console.log('[Job Assistant] Match analysis:', analysis);

      ui.showMatchResults(analysis);
      ui.showNotification(`Match Score: ${analysis.overallScore}% - ${analysis.recommendation}`, 'info');
    } catch (error) {
      console.error('[Job Assistant] Error analyzing match:', error);
      ui.showNotification('Error analyzing job match. Please check your API keys.', 'error');
    } finally {
      ui.hideLoading('btn-analyze-match');
    }
  }

  /**
   * Auto-fill application
   */
  async function autoFill() {
    if (!userProfile || !jobInfo) return;
    // Check if at least one AI agent is configured
    const apiKeys = await StorageManager.getAPIKeys();
    const hasAgent = !!(apiKeys.openai || apiKeys.gemini || apiKeys.anthropic);
    if (!hasAgent) {
      ui.showNotification('Please add an API key in settings. Gemini is free at ai.google.dev', 'error');
      return;
    }

    ui.showLoading('btn-auto-fill');
    ui.showNotification('Generating responses...', 'info');

    try {
      const result = await filler.autoFill(userProfile, true);

      console.log('[Job Assistant] Auto-fill result:', result);

      ui.updateStatus(
        detector.platform?.getName(),
        detector.fields.length,
        filler.filledFields.size
      );

      ui.showNotification(`Filled ${result.filled} fields. Review pending responses below.`, 'success');
    } catch (error) {
      console.error('[Job Assistant] Error auto-filling:', error);
      ui.showNotification('Error filling form. Check console for details.', 'error');
    } finally {
      ui.hideLoading('btn-auto-fill');
    }
  }

  /**
   * Generate cover letter
   */
  async function generateCoverLetter() {
    if (!userProfile || !jobInfo) return;

    ui.showLoading('btn-generate-cover-letter');

    try {
      const result = await CoverLetterGenerator.generate(
        jobInfo.description,
        jobInfo.title,
        jobInfo.company,
        userProfile
      );

      console.log('[Job Assistant] Cover letter generated:', result);

      // Format the cover letter
      const formatted = CoverLetterGenerator.formatCoverLetter(
        result.coverLetter,
        userProfile,
        jobInfo.company
      );

      // Show in modal
      ui.showModal(
        'Generated Cover Letter',
        `<textarea class="cover-letter-text" readonly>${formatted}</textarea>`,
        [
          {
            id: 'copy',
            label: '📋 Copy to Clipboard',
            type: 'primary',
            callback: () => {
              navigator.clipboard.writeText(formatted);
              ui.showNotification('Cover letter copied to clipboard!', 'success');
            }
          },
          {
            id: 'fill',
            label: '✓ Fill in Form',
            type: 'primary',
            callback: () => {
              // Find cover letter field and fill it
              const coverLetterField = detector.fields.find(f => f.fieldType === 'coverLetter');
              if (coverLetterField) {
                filler.fillField(coverLetterField, formatted);
                ui.showNotification('Cover letter filled in form!', 'success');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('[Job Assistant] Error generating cover letter:', error);
      ui.showNotification('Error generating cover letter. Please check your API keys.', 'error');
    } finally {
      ui.hideLoading('btn-generate-cover-letter');
    }
  }

  /**
   * Tailor resume
   */
  async function tailorResume() {
    if (!userProfile || !jobInfo) return;

    ui.showLoading('btn-tailor-resume');

    try {
      const result = await ResumeTailor.generateTailoredResume(
        jobInfo.description,
        jobInfo.title,
        userProfile
      );

      console.log('[Job Assistant] Tailored resume:', result);

      // Show in modal
      const tips = ResumeTailor.getATSTips(result.atsScore);
      const tipsHtml = tips.length > 0 ? `
        <div class="ats-tips">
          <h4>ATS Optimization Tips:</h4>
          <ul>
            ${tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      ui.showModal(
        `Tailored Resume (ATS Score: ${result.atsScore}/100)`,
        `
          ${tipsHtml}
          <textarea class="resume-text" readonly>${result.formatted}</textarea>
        `,
        [
          {
            id: 'copy',
            label: '📋 Copy to Clipboard',
            type: 'primary',
            callback: () => {
              navigator.clipboard.writeText(result.formatted);
              ui.showNotification('Resume copied to clipboard!', 'success');
            }
          },
          {
            id: 'download',
            label: '💾 Download as TXT',
            type: 'secondary',
            callback: () => {
              const blob = new Blob([result.formatted], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Resume_${jobInfo.company}_${jobInfo.title}.txt`;
              a.click();
              URL.revokeObjectURL(url);
              ui.showNotification('Resume downloaded!', 'success');
            }
          }
        ]
      );
    } catch (error) {
      console.error('[Job Assistant] Error tailoring resume:', error);
      ui.showNotification('Error tailoring resume. Please check your API keys.', 'error');
    } finally {
      ui.hideLoading('btn-tailor-resume');
    }
  }

  /**
   * Confirm a field
   */
  function confirmField(fieldId) {
    filler.confirmField(fieldId);
    ui.removePendingField(fieldId);
    ui.updateStatus(
      detector.platform?.getName(),
      detector.fields.length,
      filler.filledFields.size
    );
    ui.showNotification('Field confirmed and filled!', 'success');
  }

  /**
   * Regenerate a field
   */
  async function regenerateField(fieldId) {
    ui.showNotification('Regenerating response...', 'info');
    await filler.regenerateField(fieldId, userProfile, jobInfo);
  }


  /**
   * MutationObserver to handle dynamic page changes in SPAs
   */
  function setupPersistenceObserver() {
    const observer = new MutationObserver(() => {
      const panel = document.getElementById('job-assistant-panel');
      if (!panel) {
        isInitialized = false;
        initialize();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Event listeners
  window.addEventListener('jobAssistant:analyzeMatch', analyzeMatch);
  window.addEventListener('jobAssistant:autoFill', autoFill);
  window.addEventListener('jobAssistant:generateCoverLetter', generateCoverLetter);
  window.addEventListener('jobAssistant:tailorResume', tailorResume);

  // Debug scan (field detection)
  window.addEventListener('jobAssistant:debugScan', () => {
    try {
      const report = detector.debugScan();
      ui.showDebugReport(report);
    } catch (e) {
      console.error('[Job Assistant] Debug scan failed:', e);
      ui.showNotification('Debug scan failed. Check console for details.', 'error');
    }
  });

  window.addEventListener('jobAssistant:confirmField', (e) => {
    confirmField(e.detail.fieldId);
  });

  window.addEventListener('jobAssistant:regenerateField', (e) => {
    regenerateField(e.detail.fieldId);
  });

  window.addEventListener('jobAssistant:fieldReady', (e) => {
    ui.addPendingField(e.detail);
  });

  window.addEventListener('jobAssistant:fieldError', (e) => {
    ui.showNotification(`Error: ${e.detail.error}`, 'error');
  });

  // Log application on page unload
  window.addEventListener('beforeunload', () => {
    if (filler.filledFields.size > 0) {
      const data = filler.exportFilledData();
      StorageManager.logApplication(data);
    }
  });

  // Initialize
  initialize();
  setupPersistenceObserver();
})();
