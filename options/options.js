// Options page script

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
});

// Load all data
async function loadAllData() {
  try {
    const data = await chrome.storage.local.get(null);

    // Load profile
    if (data.userResume) {
      document.getElementById('resume-text').value = data.userResume.raw || '';
    }

    if (data.linkedInProfile) {
      document.getElementById('linkedin-json').value = JSON.stringify(data.linkedInProfile, null, 2);
      document.getElementById('linkedin-url').value = data.linkedInProfile.profileUrl || '';
    }

    // Load API keys
    const apiKeys = data.apiKeys || {};
    document.getElementById('api-openai').value = apiKeys.openai || '';
    document.getElementById('api-gemini').value = apiKeys.gemini || '';
    document.getElementById('api-anthropic').value = apiKeys.anthropic || '';

    // Load preferences
    const prefs = data.preferences || {};
    document.getElementById('pref-auto-fill').checked = prefs.autoFill || false;
    document.getElementById('pref-save-applications').checked = prefs.saveApplications !== false;
    document.getElementById('pref-learn-responses').checked = prefs.learnFromFeedback !== false;

    // Load history
    loadHistory(data.applications || []);

    // Load learning stats
    const learningData = data.learningData || { responses: [], patterns: [] };
    document.getElementById('stat-responses').textContent = learningData.responses.length;
    document.getElementById('stat-patterns').textContent = learningData.patterns.length;
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Error loading settings', 'error');
  }
}

// Save profile
document.getElementById('save-profile').addEventListener('click', async () => {
  try {
    const resumeText = document.getElementById('resume-text').value;

    if (!resumeText.trim()) {
      showToast('Please enter your resume text', 'warning');
      return;
    }

    // Parse resume (simple version - in production you'd use a proper parser)
    const parsedResume = {
      raw: resumeText,
      contact: extractContact(resumeText),
      skills: extractSkills(resumeText)
    };

    // LinkedIn data
    const linkedInJSON = document.getElementById('linkedin-json').value;
    let linkedInProfile = null;

    if (linkedInJSON.trim()) {
      try {
        linkedInProfile = JSON.parse(linkedInJSON);
        linkedInProfile.profileUrl = document.getElementById('linkedin-url').value;
      } catch (e) {
        showToast('Invalid LinkedIn JSON format', 'error');
        return;
      }
    }

    // Save to storage
    await chrome.storage.local.set({
      userResume: parsedResume,
      linkedInProfile: linkedInProfile
    });

    showToast('Profile saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    showToast('Error saving profile', 'error');
  }
});

// Resume file upload
document.getElementById('resume-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    document.getElementById('resume-text').value = text;
    showToast('Resume file loaded', 'success');
  } catch (error) {
    console.error('Error reading file:', error);
    showToast('Error reading file', 'error');
  }
});

// Save API keys
document.getElementById('save-api-keys').addEventListener('click', async () => {
  try {
    const apiKeys = {
      openai: document.getElementById('api-openai').value.trim(),
      gemini: document.getElementById('api-gemini').value.trim(),
      anthropic: document.getElementById('api-anthropic').value.trim()
    };
    // Note: API keys are optional now. Grok (via Puter) can work without keys,
    // but adding OpenAI/Gemini/Claude keys improves redundancy and quality.

    await chrome.storage.local.set({ apiKeys });
    showToast('API keys saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving API keys:', error);
    showToast('Error saving API keys', 'error');
  }
});

// Save preferences
document.getElementById('save-preferences').addEventListener('click', async () => {
  try {
    const preferences = {
      autoFill: document.getElementById('pref-auto-fill').checked,
      saveApplications: document.getElementById('pref-save-applications').checked,
      learnFromFeedback: document.getElementById('pref-learn-responses').checked
    };

    await chrome.storage.local.set({ preferences });
    showToast('Preferences saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving preferences:', error);
    showToast('Error saving preferences', 'error');
  }
});

// Load history
function loadHistory(applications) {
  const listEl = document.getElementById('history-list');

  if (applications.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No applications yet</p>';
    return;
  }

  listEl.innerHTML = applications.map((app, index) => `
    <div class="history-item">
      <div class="history-header">
        <strong>${app.jobInfo?.title || 'Unknown Position'}</strong>
        <span class="history-date">${formatDate(app.timestamp)}</span>
      </div>
      <div class="history-details">
        <span>${app.jobInfo?.company || 'Unknown Company'}</span>
        <span>•</span>
        <span>${app.platform || 'Unknown Platform'}</span>
        <span>•</span>
        <span>${app.fields?.length || 0} fields filled</span>
      </div>
    </div>
  `).join('');
}

// Clear history
document.getElementById('clear-history').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all application history?')) {
    try {
      await chrome.storage.local.set({ applications: [] });
      loadHistory([]);
      showToast('History cleared', 'success');
    } catch (error) {
      console.error('Error clearing history:', error);
      showToast('Error clearing history', 'error');
    }
  }
});

// Clear learning data
document.getElementById('clear-learning').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all learning data? This cannot be undone.')) {
    try {
      await chrome.storage.local.set({
        learningData: {
          responses: [],
          patterns: []
        }
      });

      document.getElementById('stat-responses').textContent = '0';
      document.getElementById('stat-patterns').textContent = '0';
      showToast('Learning data cleared', 'success');
    } catch (error) {
      console.error('Error clearing learning data:', error);
      showToast('Error clearing learning data', 'error');
    }
  }
});

// Export settings
document.getElementById('btn-export').addEventListener('click', async () => {
  try {
    // Get all data from storage
    const allData = await chrome.storage.local.get(null);

    // Create export object with timestamp
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {
        userResume: allData.userResume || null,
        linkedInProfile: allData.linkedInProfile || null,
        apiKeys: allData.apiKeys || {},
        preferences: allData.preferences || {},
        applications: allData.applications || [],
        learningData: allData.learningData || { responses: [], patterns: [] }
      }
    };

    // Convert to JSON
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-assistant-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Settings exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting settings:', error);
    showToast('Error exporting settings', 'error');
  }
});

// Import settings
document.getElementById('btn-import').addEventListener('click', async () => {
  const fileInput = document.getElementById('import-file');
  const file = fileInput.files[0];

  if (!file) {
    showToast('Please select a file to import', 'warning');
    return;
  }

  try {
    const fileContent = await readFileAsText(file);
    const importData = JSON.parse(fileContent);

    // Validate import data
    if (!importData.version || !importData.data) {
      showToast('Invalid settings file format', 'error');
      return;
    }

    // Confirm before overwriting
    if (!confirm('This will overwrite your current settings. Are you sure you want to continue?')) {
      return;
    }

    // Import all data
    await chrome.storage.local.set({
      userResume: importData.data.userResume,
      linkedInProfile: importData.data.linkedInProfile,
      apiKeys: importData.data.apiKeys,
      preferences: importData.data.preferences,
      applications: importData.data.applications,
      learningData: importData.data.learningData,
      initialized: true
    });

    showToast('Settings imported successfully! Reloading page...', 'success');

    // Reload the page to show imported data
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('Error importing settings:', error);
    showToast('Error importing settings. Please check the file format.', 'error');
  }
});

// Helper functions
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function extractContact(text) {
  const contact = {};

  // Email
  const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  if (emailMatch) contact.email = emailMatch[0];

  // Phone
  const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) contact.phone = phoneMatch[0];

  return contact;
}

function extractSkills(text) {
  // Very basic skill extraction
  const skillsSection = text.match(/skills[:\s]+([\s\S]+?)(?=\n\n|\nexperience|education|$)/i);
  if (!skillsSection) return [];

  return skillsSection[1]
    .split(/[,;\n•·]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 50);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
