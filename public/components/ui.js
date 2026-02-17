/**
 * UI Components
 * Reusable loading and empty state components
 */

// Skeleton card component
function createSkeletonCard(type = 'default') {
  const templates = {
    default: `
      <div class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line" style="width: 60%"></div>
            <div class="skeleton-line" style="width: 40%"></div>
          </div>
        </div>
        <div class="skeleton-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line" style="width: 80%"></div>
          <div class="skeleton-line" style="width: 60%"></div>
        </div>
      </div>
    `,
    stat: `
      <div class="skeleton-stat">
        <div class="skeleton-label"></div>
        <div class="skeleton-value"></div>
      </div>
    `,
    table: `
      <div class="skeleton-table">
        <div class="skeleton-row header">
          <div class="skeleton-cell" style="width: 30%"></div>
          <div class="skeleton-cell" style="width: 20%"></div>
          <div class="skeleton-cell" style="width: 20%"></div>
          <div class="skeleton-cell" style="width: 30%"></div>
        </div>
        ${Array(5).fill(`
          <div class="skeleton-row">
            <div class="skeleton-cell" style="width: 30%"></div>
            <div class="skeleton-cell" style="width: 20%"></div>
            <div class="skeleton-cell" style="width: 20%"></div>
            <div class="skeleton-cell" style="width: 30%"></div>
          </div>
        `).join('')}
      </div>
    `,
    finding: `
      <div class="skeleton-finding">
        <div class="skeleton-severity"></div>
        <div class="skeleton-content">
          <div class="skeleton-line" style="width: 70%"></div>
          <div class="skeleton-line" style="width: 50%"></div>
          <div class="skeleton-evidence"></div>
        </div>
      </div>
    `
  };
  
  return templates[type] || templates.default;
}

// Empty state component
function createEmptyState({
  icon = '📭',
  title = 'No data found',
  message = 'There is nothing to display here yet.',
  actionText = null,
  actionHref = null,
  secondaryAction = null
}) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3 class="empty-state-title">${title}</h3>
      <p class="empty-state-message">${message}</p>
      ${actionText ? `
        <div class="empty-state-actions">
          <a href="${actionHref || '#'}" class="btn btn-primary">${actionText}</a>
          ${secondaryAction ? `
            <a href="${secondaryAction.href}" class="btn btn-secondary">${secondaryAction.text}</a>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// Error state component  
function createErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error while processing your request.',
  error = null,
  retryAction = null,
  docsLink = null
}) {
  const errorCode = error?.code || 'UNKNOWN_ERROR';
  
  return `
    <div class="error-state">
      <div class="error-state-icon">⚠️</div>
      <h3 class="error-state-title">${title}</h3>
      <p class="error-state-message">${message}</p>
      ${error ? `
        <div class="error-state-details">
          <code>${errorCode}</code>
          ${process.env.NODE_ENV !== 'production' ? `<pre>${error.message || error}</pre>` : ''}
        </div>
      ` : ''}
      <div class="error-state-actions">
        ${retryAction ? `<button class="btn btn-primary" onclick="${retryAction}">Try Again</button>` : ''}
        ${docsLink ? `<a href="${docsLink}" target="_blank" class="btn btn-secondary">View Documentation</a>` : ''}
      </div>
    </div>
  `;
}

// Toast notification
function showToast({
  type = 'info', // info, success, warning, error
  title,
  message,
  duration = 5000,
  action = null
}) {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
      ${action ? `<button class="toast-action" onclick="${action.onClick}">${action.text}</button>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  document.getElementById('toast-container')?.appendChild(toast);
  
  // Auto-remove
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createSkeletonCard, createEmptyState, createErrorState, showToast };
}
