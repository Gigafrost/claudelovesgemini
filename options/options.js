// Options page script

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  setupPasswordToggles();
  setupImportExport();
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

/**
 * Setup Import/Export functionality
 */
function setupImportExport() {
  // Export Data
  document.getElementById('export-data').addEventListener('click', async () => {
    const data = await chrome.storage.local.get(null);
    // Remove sensitive keys if needed, though usually users want to backup keys too
    // delete data.apiKeys; 
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully!', 'success');
  });

  // Import Button (Trigger File Input)
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  // Handle File Selection
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // Basic validation
        if (typeof importedData !== 'object') throw new Error('Invalid JSON format');

        await chrome.storage.local.set(importedData);
        await loadAllData(); // Refresh UI
        showToast('Data imported successfully!', 'success');
      } catch (error) {
        console.error('Import error:', error);
        showToast('Error importing data: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  });
  
  // Clear History
  document.getElementById('clear-history').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your application history? This cannot be undone.')) {
      await chrome.storage.local.set({ applications: [] });
      loadHistory([]); 
      showToast('History cleared!', 'success');
    }
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
  
  loadHistory(data.applications || []);
}

function loadHistory(applications) {
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (applications.length === 0) {
    list.innerHTML = '<div class="empty-state">No applications recorded yet.</div>';
    return;
  }

  // Show most recent first
  const sorted = [...applications].reverse();

  sorted.forEach(app => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    const date = new Date(app.timestamp).toLocaleDateString();
    const time = new Date(app.timestamp).toLocaleTimeString();
    
    item.innerHTML = `
      <div class="history-header">
        <strong>${app.jobInfo?.company || 'Unknown Company'} - ${app.jobInfo?.title || 'Unknown Role'}</strong>
        <span class="history-date">${date} ${time}</span>
      </div>
      <div class="history-details">
        <span>Platform: ${app.platform || 'Unknown'}</span> | 
        <span>Fields Filled: ${app.fields ? app.fields.length : 0}</span>
      </div>
    `;
    list.appendChild(item);
  });
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
  // Ideally call ResumeParser here if accessible, or just save raw text
  await chrome.storage.local.set({ userResume: parsedResume });
  showToast('Profile saved!', 'success');
});

document.getElementById('save-preferences').addEventListener('click', async () => {
  const prefs = {
    autoFill: document.getElementById('pref-auto-fill').checked
  };
  await chrome.storage.local.set({ preferences: prefs });
  showToast('Preferences saved!', 'success');
});

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}