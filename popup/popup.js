// popup/popup.js

// Initialize popup state when opened
document.addEventListener('DOMContentLoaded', function() {
    const toggleElement = document.getElementById('enabledToggle');
    const toggleStatusElement = document.getElementById('toggleStatus');
    const removedCountElement = document.getElementById('removedCount');
    const resetButton = document.getElementById('resetStats');
    
    // Debug popup initialization
    console.log('Popup initialized, loading storage data...');
    
    // Load saved state
    browser.storage.local.get(['enabled', 'removedCount']).then((result) => {
      console.log('Storage data loaded:', result);
      
      // Set toggle state (default to enabled if not set)
      const enabled = result.enabled !== undefined ? result.enabled : true;
      toggleElement.checked = enabled;
      toggleStatusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      
      // Set counter
      const count = result.removedCount || 0;
      console.log('Setting counter display to:', count);
      removedCountElement.textContent = count;
    }).catch(error => {
      console.error('Error loading storage:', error);
    });
    
    // Toggle event listener
    toggleElement.addEventListener('change', function() {
      const enabled = this.checked;
      toggleStatusElement.textContent = enabled ? 'Enabled' : 'Disabled';
      
      console.log('Toggle changed to:', enabled);
      
      // Save state
      browser.storage.local.set({ enabled }).then(() => {
        console.log('Enabled state saved successfully');
      }).catch(error => {
        console.error('Error saving enabled state:', error);
      });
      
      // Notify content scripts
      browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
        if (tabs[0]) {
          console.log('Sending toggleState message to tab', tabs[0].id, 'with enabled =', enabled);
          
          browser.tabs.sendMessage(tabs[0].id, { action: 'toggleState', enabled })
            .then(response => {
              console.log('Content script responded:', response);
            })
            .catch(error => {
              console.error('Error sending message to content script:', error);
              
              // Special handling for when we're on a page where the content script isn't loaded
              if (error.message && error.message.includes('Could not establish connection')) {
                console.log('Content script not found on this page - this is normal if not on AliExpress');
              }
            });
        } else {
          console.warn('No active tab found to send message to');
        }
      });
    });
    
    // Reset button event listener
    resetButton.addEventListener('click', function() {
      console.log('Reset button clicked');
      
      browser.storage.local.set({ removedCount: 0 }).then(() => {
        console.log('Counter reset successfully');
        removedCountElement.textContent = '0';
        
        // Notify content scripts
        browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
          if (tabs[0]) {
            browser.tabs.sendMessage(tabs[0].id, { action: 'resetCounter' })
              .catch(error => console.log('No content script on this page, or error:', error));
          }
        });
      }).catch(error => {
        console.error('Error resetting counter:', error);
      });
    });
    
    // Add a refresh mechanism to ensure counter is up-to-date
    // This helps if the popup stays open while content scripts update the counter
    const refreshCounterDisplay = () => {
      browser.storage.local.get('removedCount').then((result) => {
        const count = result.removedCount || 0;
        removedCountElement.textContent = count;
      }).catch(error => {
        console.error('Error refreshing counter:', error);
      });
    };
    
    // Refresh the counter every 2 seconds while the popup is open
    const refreshInterval = setInterval(refreshCounterDisplay, 2000);
    
    // Clear the interval when the popup is closed
    window.addEventListener('unload', () => {
      clearInterval(refreshInterval);
    });
});