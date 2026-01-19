// Popup script

document.addEventListener('DOMContentLoaded', async () => {
  // Load status
  loadStatus();

  // Event listeners
  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-view-history').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    // TODO: Add parameter to open history tab
  });

  document.getElementById('link-help').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/ai-job-assistant' });
  });

  document.getElementById('link-feedback').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yourusername/ai-job-assistant/issues' });
  });
});

async function loadStatus() {
  try {
    const data = await chrome.storage.local.get(null);

    // Profile status
    const hasResume = data.userResume !== null && data.userResume !== undefined;
    const hasLinkedIn = data.linkedInProfile !== null && data.linkedInProfile !== undefined;

    const profileStatus = document.getElementById('profile-status');
    if (hasResume || hasLinkedIn) {
      profileStatus.textContent = '✓ Configured';
      profileStatus.style.color = '#48bb78';
    } else {
      profileStatus.textContent = '✗ Not Set';
      profileStatus.style.color = '#f56565';
    }

    // API keys status
    const apiKeys = data.apiKeys || {};
    const configuredAPIs = Object.values(apiKeys).filter(key => key && key.trim()).length;

    const apiStatus = document.getElementById('api-status');
    if (configuredAPIs > 0) {
      apiStatus.textContent = `${configuredAPIs}/3 Configured`;
      apiStatus.style.color = '#48bb78';
    } else {
      apiStatus.textContent = 'None Configured';
      apiStatus.style.color = '#f56565';
    }

    // Applications count
    const applications = data.applications || [];
    document.getElementById('app-count').textContent = applications.length;
  } catch (error) {
    console.error('Error loading status:', error);
  }
}
