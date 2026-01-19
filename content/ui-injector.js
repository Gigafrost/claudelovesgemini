// UI injection for job application assistant - Pull Tab Design

class UIInjector {
  constructor() {
    this.mainPanel = null;
    this.fieldCards = new Map();
    this.pendingReviews = [];
    this.reviewCenter = null;
    this.isExpanded = false;
  }

  /**
   * Inject main control panel with pull tab design
   */
  injectMainPanel() {
    if (this.mainPanel) return;

    const panel = document.createElement('div');
    panel.id = 'job-assistant-panel';
    panel.className = 'job-assistant-panel';
    panel.innerHTML = `
      <div class="job-assistant-tab" id="job-assistant-tab">
        <div class="tab-icon">🤖</div>
        <div class="tab-text">AI Assistant</div>
        <div class="tab-badges">
          <span class="pending-badge" id="tab-pending-badge" style="display: none;">0</span>
          <span class="account-badge" id="tab-account-badge" style="display: none;">⚠️</span>
        </div>
      </div>
      <div class="job-assistant-content">
        <div class="job-assistant-header">
          <h3>🤖 AI Job Assistant</h3>
          <button class="job-assistant-minimize" id="job-assistant-minimize" title="Minimize">−</button>
        </div>
        <div class="job-assistant-body">
          <div id="account-wall-banner" class="account-wall-banner" style="display: none;">
            <div class="banner-icon">⚠️</div>
            <div class="banner-content">
              <strong>Account Required</strong>
              <p id="account-wall-message"></p>
            </div>
          </div>

          <div class="job-assistant-status">
            <div class="status-item">
              <span class="status-label">Platform:</span>
              <span id="status-platform">Detecting...</span>
            </div>
            <div class="status-item">
              <span class="status-label">Fields Found:</span>
              <span id="status-fields">0</span>
            </div>
            <div class="status-item">
              <span class="status-label">Filled:</span>
              <span id="status-filled">0</span>
            </div>
            <div class="status-item" id="pending-count-container" style="display: none;">
              <span class="status-label">Pending Review:</span>
              <span id="status-pending">0</span>
            </div>
          </div>

          <div class="job-assistant-actions">
            <button class="job-assistant-btn review" id="btn-review-pending" style="display: none;">
              🔍 Review <span id="review-count">0</span> Pending Fields
            </button>
            <button class="job-assistant-btn primary" id="btn-analyze-match">
              📊 Analyze Job Match
            </button>
            <button class="job-assistant-btn primary" id="btn-auto-fill">
              ✨ Auto Fill Application
            </button>
            <button class="job-assistant-btn secondary" id="btn-generate-cover-letter">
              📝 Generate Cover Letter
            </button>
            <button class="job-assistant-btn secondary" id="btn-tailor-resume">
              📄 Tailor Resume
            </button>
          </div>

          <div id="job-match-results" class="job-match-results" style="display: none;">
            <h4>Job Match Analysis</h4>
            <div class="match-score">
              <div class="score-circle" id="match-score-circle">
                <span id="match-score">0</span>%
              </div>
              <div class="score-details">
                <div class="score-bar">
                  <label>Skills</label>
                  <div class="bar"><div class="bar-fill" id="bar-skills"></div></div>
                </div>
                <div class="score-bar">
                  <label>Experience</label>
                  <div class="bar"><div class="bar-fill" id="bar-experience"></div></div>
                </div>
                <div class="score-bar">
                  <label>Education</label>
                  <div class="bar"><div class="bar-fill" id="bar-education"></div></div>
                </div>
              </div>
            </div>
            <div class="recommendation" id="match-recommendation"></div>
          </div>

          <div id="pending-fields" class="pending-fields"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.mainPanel = panel;

    // Add event listeners
    this.attachEventListeners();

    // Initially collapsed
    this.isExpanded = false;
  }

  /**
   * Toggle panel expansion
   */
  togglePanel() {
    if (!this.mainPanel) return;

    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.mainPanel.classList.add('expanded');
    } else {
      this.mainPanel.classList.remove('expanded');
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Tab click - toggle expansion
    const tab = document.getElementById('job-assistant-tab');
    if (tab) {
      tab.addEventListener('click', () => this.togglePanel());
    }

    // Minimize button - collapse panel
    const minimizeBtn = document.getElementById('job-assistant-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePanel();
      });
    }

    // Action buttons
    document.getElementById('btn-review-pending')?.addEventListener('click', () => {
      this.showReviewCenter();
    });

    document.getElementById('btn-analyze-match')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jobAssistant:analyzeMatch'));
    });

    document.getElementById('btn-auto-fill')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jobAssistant:autoFill'));
    });

    document.getElementById('btn-generate-cover-letter')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jobAssistant:generateCoverLetter'));
    });

    document.getElementById('btn-tailor-resume')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jobAssistant:tailorResume'));
    });
  }

  /**
   * Update status display
   */
  updateStatus(platform, fieldsCount, filledCount) {
    const platformEl = document.getElementById('status-platform');
    const fieldsEl = document.getElementById('status-fields');
    const filledEl = document.getElementById('status-filled');

    if (platformEl) platformEl.textContent = platform || 'Unknown';
    if (fieldsEl) fieldsEl.textContent = fieldsCount || 0;
    if (filledEl) filledEl.textContent = filledCount || 0;
  }

  /**
   * Show account wall banner
   */
  showAccountWallBanner(accountWallInfo) {
    const banner = document.getElementById('account-wall-banner');
    const message = document.getElementById('account-wall-message');

    if (banner && message && accountWallInfo.detected) {
      message.textContent = `This site (${accountWallInfo.platform}) requires account creation before applying.`;
      banner.style.display = 'flex';

      // Add badge to tab
      const tabBadge = document.getElementById('tab-account-badge');
      if (tabBadge) {
        tabBadge.style.display = 'inline-block';
      }
    }
  }

  /**
   * Update pending review count
   */
  updatePendingCount(count) {
    const pendingCountContainer = document.getElementById('pending-count-container');
    const pendingCountEl = document.getElementById('status-pending');
    const reviewBtn = document.getElementById('btn-review-pending');
    const reviewCountEl = document.getElementById('review-count');
    const tabBadge = document.getElementById('tab-pending-badge');

    if (count > 0) {
      if (pendingCountContainer) pendingCountContainer.style.display = 'flex';
      if (pendingCountEl) pendingCountEl.textContent = count;
      if (reviewBtn) reviewBtn.style.display = 'block';
      if (reviewCountEl) reviewCountEl.textContent = count;
      if (tabBadge) {
        tabBadge.textContent = count;
        tabBadge.style.display = 'inline-block';
      }
    } else {
      if (pendingCountContainer) pendingCountContainer.style.display = 'none';
      if (reviewBtn) reviewBtn.style.display = 'none';
      if (tabBadge) tabBadge.style.display = 'none';
    }
  }

  /**
   * Show job match results
   */
  showMatchResults(analysis) {
    const resultsEl = document.getElementById('job-match-results');
    if (!resultsEl) return;

    // Update score
    const scoreEl = document.getElementById('match-score');
    const circleEl = document.getElementById('match-score-circle');
    if (scoreEl) scoreEl.textContent = analysis.overallScore;

    // Color code the circle
    if (circleEl) {
      circleEl.className = 'score-circle';
      if (analysis.overallScore >= 80) circleEl.classList.add('excellent');
      else if (analysis.overallScore >= 70) circleEl.classList.add('good');
      else if (analysis.overallScore >= 60) circleEl.classList.add('fair');
      else circleEl.classList.add('poor');
    }

    // Update bars
    this.updateScoreBar('bar-skills', analysis.scores.skills);
    this.updateScoreBar('bar-experience', analysis.scores.experience);
    this.updateScoreBar('bar-education', analysis.scores.education);

    // Update recommendation
    const recEl = document.getElementById('match-recommendation');
    if (recEl) {
      recEl.textContent = analysis.recommendation;
      recEl.className = 'recommendation';
      if (analysis.shouldApply) {
        recEl.classList.add('positive');
      } else {
        recEl.classList.add('negative');
      }
    }

    resultsEl.style.display = 'block';
  }

  /**
   * Update score bar
   */
  updateScoreBar(barId, score) {
    const barEl = document.getElementById(barId);
    if (barEl) {
      barEl.style.width = `${score}%`;
    }
  }

  /**
   * Show Review Center modal
   */
  showReviewCenter() {
    if (this.pendingReviews.length === 0) {
      this.showNotification('No fields pending review', 'info');
      return;
    }

    // Create review center modal
    const modal = document.createElement('div');
    modal.className = 'review-center-modal';
    modal.innerHTML = `
      <div class="review-center-content">
        <div class="review-center-header">
          <h3>Review Pending Fields (${this.pendingReviews.length})</h3>
          <button class="review-center-close">×</button>
        </div>
        <div class="review-center-body">
          ${this.pendingReviews.map((review, index) => `
            <div class="review-item" data-review-index="${index}">
              <div class="review-item-header">
                <strong>${index + 1}. ${review.field.label || 'Question'}</strong>
                <span class="confidence-badge ${this.getConfidenceClass(review.field.confidence)}">
                  ${Math.round(review.field.confidence * 100)}% confidence
                </span>
              </div>
              <div class="review-item-body">
                <textarea class="review-response" readonly>${review.value}</textarea>
                <div class="ai-details">
                  <span class="winner-label">Selected by: <strong>${review.winner}</strong></span>
                </div>
              </div>
              <div class="review-item-actions">
                <button class="btn-review-accept" data-index="${index}">✓ Accept & Fill</button>
                <button class="btn-review-regenerate" data-index="${index}">🔄 Regenerate</button>
                <button class="btn-review-versions" data-index="${index}">👁 View All Versions</button>
              </div>
              <div class="review-all-versions" id="versions-${index}" style="display: none;">
                ${Object.entries(review.allResponses).map(([agent, response]) => `
                  <div class="version-item">
                    <strong>${agent}:</strong>
                    <p>${response.error || response}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="review-center-footer">
          <button class="btn-accept-all">✓ Accept All</button>
          <button class="btn-cancel">Cancel</button>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector('.review-center-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());

    modal.querySelector('.btn-accept-all').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jobAssistant:acceptAllReviews'));
      modal.remove();
    });

    modal.querySelectorAll('.btn-review-accept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        window.dispatchEvent(new CustomEvent('jobAssistant:acceptReview', { detail: { index } }));
        e.target.closest('.review-item').style.opacity = '0.5';
        e.target.disabled = true;
      });
    });

    modal.querySelectorAll('.btn-review-regenerate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        window.dispatchEvent(new CustomEvent('jobAssistant:regenerateReview', { detail: { index } }));
        e.target.closest('.review-item').style.opacity = '0.5';
      });
    });

    modal.querySelectorAll('.btn-review-versions').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const versionsDiv = document.getElementById(`versions-${index}`);
        if (versionsDiv) {
          versionsDiv.style.display = versionsDiv.style.display === 'none' ? 'block' : 'none';
          e.target.textContent = versionsDiv.style.display === 'none' ? '👁 View All Versions' : '👁 Hide Versions';
        }
      });
    });

    document.body.appendChild(modal);
    this.reviewCenter = modal;
  }

  /**
   * Get confidence class for styling
   */
  getConfidenceClass(confidence) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Add field to pending reviews
   */
  addPendingReview(fieldData) {
    this.pendingReviews.push(fieldData);
    this.updatePendingCount(this.pendingReviews.length);
  }

  /**
   * Add pending field card (legacy - redirects to addPendingReview)
   */
  addPendingField(fieldData) {
    this.addPendingReview(fieldData);
  }

  /**
   * Remove pending review by index
   */
  removePendingReview(index) {
    if (index >= 0 && index < this.pendingReviews.length) {
      this.pendingReviews.splice(index, 1);
      this.updatePendingCount(this.pendingReviews.length);

      // Update review center if open
      if (this.reviewCenter) {
        this.reviewCenter.remove();
        if (this.pendingReviews.length > 0) {
          this.showReviewCenter();
        }
      }
    }
  }

  /**
   * Remove pending field (legacy - redirects to removePendingReview)
   */
  removePendingField(fieldId) {
    // Find index by field ID
    const index = this.pendingReviews.findIndex(r =>
      (r.field.id || r.field.name) === fieldId
    );
    if (index >= 0) {
      this.removePendingReview(index);
    }
  }

  /**
   * Clear all pending reviews
   */
  clearPendingReviews() {
    this.pendingReviews = [];
    this.updatePendingCount(0);
    if (this.reviewCenter) {
      this.reviewCenter.remove();
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `job-assistant-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('visible');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Show loading state
   */
  showLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.innerHTML = '<span class="spinner"></span> Loading...';
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  /**
   * Show modal with content
   */
  showModal(title, content, actions = []) {
    const modal = document.createElement('div');
    modal.className = 'job-assistant-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-actions">
          ${actions.map(action => `
            <button class="job-assistant-btn ${action.type}" data-action="${action.id}">
              ${action.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    // Action buttons
    actions.forEach(action => {
      const button = modal.querySelector(`[data-action="${action.id}"]`);
      if (button && action.callback) {
        button.addEventListener('click', () => {
          action.callback();
          modal.remove();
        });
      }
    });

    document.body.appendChild(modal);
  }
}

// Make available globally
window.UIInjector = UIInjector;
