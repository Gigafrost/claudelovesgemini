// UI injection for job application assistant

class UIInjector {
  constructor() {
    this.mainPanel = null;
    this.fieldCards = new Map();
  }

  /**
   * Inject main control panel
   */
  injectMainPanel() {
    if (this.mainPanel) return;

    const panel = document.createElement('div');
    panel.id = 'job-assistant-panel';
    panel.className = 'job-assistant-panel';
    panel.innerHTML = `
      <div class="job-assistant-header">
        <h3>🤖 AI Job Assistant</h3>
        <button class="job-assistant-close" id="job-assistant-close">×</button>
      </div>
      <div class="job-assistant-body">
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
        </div>

        <div class="job-assistant-actions">
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
    `;

    document.body.appendChild(panel);
    this.mainPanel = panel;

    // Add event listeners
    this.attachEventListeners();

    // Add floating button to open panel
    this.injectFloatingButton();
  }

  /**
   * Inject floating button
   */
  injectFloatingButton() {
    const button = document.createElement('button');
    button.id = 'job-assistant-float-btn';
    button.className = 'job-assistant-float-btn';
    button.innerHTML = '🤖';
    button.title = 'AI Job Assistant';

    button.addEventListener('click', () => {
      this.togglePanel();
    });

    document.body.appendChild(button);
  }

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    if (this.mainPanel) {
      this.mainPanel.classList.toggle('visible');
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = document.getElementById('job-assistant-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.togglePanel());
    }

    // Action buttons
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
   * Add pending field card
   */
  addPendingField(fieldData) {
    const container = document.getElementById('pending-fields');
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'field-card';
    card.id = `field-card-${fieldData.field.id || fieldData.field.name}`;

    card.innerHTML = `
      <div class="field-card-header">
        <strong>${fieldData.field.label || 'Question'}</strong>
        <span class="winner-badge">${fieldData.winner}</span>
      </div>
      <div class="field-card-body">
        <textarea class="field-response" readonly>${fieldData.value}</textarea>
      </div>
      <div class="field-card-actions">
        <button class="btn-check" data-field-id="${fieldData.field.id || fieldData.field.name}">
          ✓ Use This
        </button>
        <button class="btn-regenerate" data-field-id="${fieldData.field.id || fieldData.field.name}">
          🔄 Regenerate
        </button>
        <button class="btn-show-all" data-field-id="${fieldData.field.id || fieldData.field.name}">
          👁 Show All Versions
        </button>
      </div>
      <div class="field-all-versions" style="display: none;">
        <h5>All Versions:</h5>
        ${Object.entries(fieldData.allResponses).map(([agent, response]) => `
          <div class="version-item">
            <strong>${agent}:</strong>
            <p>${response}</p>
          </div>
        `).join('')}
      </div>
    `;

    // Add event listeners
    card.querySelector('.btn-check').addEventListener('click', (e) => {
      const fieldId = e.target.dataset.fieldId;
      window.dispatchEvent(new CustomEvent('jobAssistant:confirmField', {
        detail: { fieldId }
      }));
      card.remove();
    });

    card.querySelector('.btn-regenerate').addEventListener('click', (e) => {
      const fieldId = e.target.dataset.fieldId;
      window.dispatchEvent(new CustomEvent('jobAssistant:regenerateField', {
        detail: { fieldId }
      }));
      card.remove();
    });

    card.querySelector('.btn-show-all').addEventListener('click', (e) => {
      const versionsEl = card.querySelector('.field-all-versions');
      if (versionsEl) {
        versionsEl.style.display = versionsEl.style.display === 'none' ? 'block' : 'none';
      }
    });

    container.appendChild(card);
    this.fieldCards.set(fieldData.field.id || fieldData.field.name, card);
  }

  /**
   * Remove pending field card
   */
  removePendingField(fieldId) {
    const card = this.fieldCards.get(fieldId);
    if (card) {
      card.remove();
      this.fieldCards.delete(fieldId);
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
