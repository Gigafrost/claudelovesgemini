// Options page script

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  setupPasswordToggles();
});

// Tab switching logic
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

/**
 * Setup password visibility toggles
 */
function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.target;
      const input = document.getElementById(inputId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });
}

async function loadAllData() {
  const data = await chrome.storage.local.get(null);
  if (data.userResume) document.getElementById('resume-text').value = data.userResume.raw || '';
  
  const apiKeys = data.apiKeys || {};
  document.getElementById('api-openai').value = apiKeys.openai || '';
  document.getElementById('api-gemini').value = apiKeys.gemini || '';
  document.getElementById('api-anthropic').value = apiKeys.anthropic || '';

  const prefs = data.preferences || {};
  document.getElementById('pref-auto-fill').checked = prefs.autoFill || false;
}

document.getElementById('save-api-keys').addEventListener('click', async () => {
  const apiKeys = {
    openai: document.getElementById('api-openai').value.trim(),
    gemini: document.getElementById('api-gemini').value.trim(),
    anthropic: document.getElementById('api-anthropic').value.trim()
  };
  await chrome.storage.local.set({ apiKeys });
  showToast('API keys saved!', 'success');
});

document.getElementById('save-profile').addEventListener('click', async () => {
  const resumeText = document.getElementById('resume-text').value;
  const parsedResume = { raw: resumeText }; // Simplified for now
  await chrome.storage.local.set({ userResume: parsedResume });
  showToast('Profile saved!', 'success');
});

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}