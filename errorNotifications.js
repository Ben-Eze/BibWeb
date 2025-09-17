// Simple error notification system that shows red popups for console errors
// Automatically displays notifications when console.error() is called

let notificationCount = 0;

// Override console.error to catch and display errors
const originalConsoleError = console.error;
console.error = function(...args) {
  // Call the original console.error first
  originalConsoleError.apply(console, args);
  
  // Create notification for the error
  const errorMessage = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  showErrorNotification(errorMessage);
};

// Also catch uncaught errors
window.addEventListener('error', (event) => {
  showErrorNotification(`Error: ${event.message} at ${event.filename}:${event.lineno}`);
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  showErrorNotification(`Unhandled Promise Rejection: ${event.reason}`);
});

function showErrorNotification(message) {
  console.log('Showing error notification:', message); // Debug log
  notificationCount++;
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.textContent = message;
  
  // Add unique id for stacking
  notification.style.top = `${20 + (notificationCount - 1) * 70}px`;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after 7 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        notificationCount = Math.max(0, notificationCount - 1);
        // Restack remaining notifications
        restackNotifications();
      }, 300); // Wait for fade animation
    }
  }, 7000);
}

function restackNotifications() {
  const notifications = document.querySelectorAll('.error-notification:not(.fade-out)');
  notifications.forEach((notification, index) => {
    notification.style.top = `${20 + index * 70}px`;
  });
}

// Add CSS styles
function addErrorNotificationStyles() {
  if (document.getElementById('error-notification-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'error-notification-styles';
  style.textContent = `
    .error-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #dc3545;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 400px;
      word-wrap: break-word;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      border: 1px solid #b02a37;
      transition: all 0.3s ease;
      transform: translateX(0);
      opacity: 1;
    }
    
    .error-notification.fade-out {
      opacity: 0;
      transform: translateX(100%);
    }
    
    .error-notification:hover {
      background-color: #c82333;
    }
  `;
  
  document.head.appendChild(style);
}

// Test function - you can call this in the console to test
function testErrorNotification() {
  showErrorNotification('Test error notification - this should appear as a red box!');
}

// Make test function available globally
window.testErrorNotification = testErrorNotification;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addErrorNotificationStyles);
} else {
  addErrorNotificationStyles();
}

// Log that the system is loaded
console.log('Error notification system loaded. Try: testErrorNotification() or console.error("test")');

export { showErrorNotification, testErrorNotification };
