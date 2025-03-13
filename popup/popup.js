// popup/popup.js

// Initialize popup state when opened
document.addEventListener('DOMContentLoaded', function() {
    const toggleElement = document.getElementById('enabledToggle');
    const toggleStatusElement = document.getElementById('toggleStatus');
    const removedCountElement = document.getElementById('removedCount');
    const resetButton = document.getElementById('resetStats');
    
    // Load saved state
    browser.storage.local.get(['enabled', 'removedCount']).then((result) => {
      // Set toggle state (default to enabled if not set)
      const enabled = result.enabled !== undefined ? result.enabled : true;
      toggleElement.checked = enabled;
      toggleStatusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      
      // Set counter
      const count = result.removedCount || 0;
      removedCountElement.textContent = count;
    }).catch(error => {
      console.error('Error loading storage:', error);
    });
    
    // Toggle event listener
    toggleElement.addEventListener('change', function() {
      const enabled = this.checked;
      toggleStatusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      
      // Save state
      browser.storage.local.set({ enabled });
      
      // Notify content scripts
      browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, { action: 'toggleState', enabled })
            .catch(error => console.log('No content script on this page, or error:', error));
        }
      });
    });
    
    // Reset button event listener
    resetButton.addEventListener('click', function() {
      browser.storage.local.set({ removedCount: 0 }).then(() => {
        removedCountElement.textContent = '0';
        
        // Notify content scripts
        browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
          if (tabs[0]) {
            browser.tabs.sendMessage(tabs[0].id, { action: 'resetCounter' })
              .catch(error => console.log('No content script on this page, or error:', error));
          }
        });
      });
    });
  });