/**
 * Onboarding Tour
 * Interactive guided tour for first-time users
 */

class OnboardingTour {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.isActive = false;
    this.overlay = null;
    this.tooltip = null;
  }

  /**
   * Start the tour
   */
  start() {
    if (this.isActive) return;
    
    // Check if user has completed tour
    if (localStorage.getItem('2ndcto-tour-completed')) {
      return;
    }
    
    this.isActive = true;
    this.currentStep = 0;
    this.createOverlay();
    this.showStep(0);
    
    // Mark as started
    localStorage.setItem('2ndcto-tour-started', Date.now());
  }

  /**
   * Create overlay element
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    this.overlay.innerHTML = `
      <div class="tour-backdrop"></div>
      <div class="tour-spotlight"></div>
    `;
    document.body.appendChild(this.overlay);
  }

  /**
   * Create tooltip element
   */
  createTooltip() {
    if (this.tooltip) this.tooltip.remove();
    
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tour-tooltip';
    document.body.appendChild(this.tooltip);
  }

  /**
   * Show specific step
   */
  showStep(index) {
    if (index >= this.steps.length) {
      this.complete();
      return;
    }

    this.currentStep = index;
    const step = this.steps[index];
    
    // Find target element
    const target = document.querySelector(step.target);
    if (!target) {
      console.warn('Tour target not found:', step.target);
      this.next();
      return;
    }

    // Create tooltip
    this.createTooltip();
    
    // Position spotlight on target
    this.positionSpotlight(target);
    
    // Position tooltip
    this.positionTooltip(target, step.position || 'bottom');
    
    // Update tooltip content
    this.tooltip.innerHTML = `
      <div class="tour-header">
        <span class="tour-step">Step ${index + 1} of ${this.steps.length}</span>
        <button class="tour-close" onclick="tour.skip()">×</button>
      </div>
      <div class="tour-content">
        ${step.icon ? `<div class="tour-icon">${step.icon}</div>` : ''}
        <h3 class="tour-title">${step.title}</h3>
        <p class="tour-text">${step.text}</p>
        ${step.highlight ? `<div class="tour-highlight">${step.highlight}</div>` : ''}
      </div>
      <div class="tour-actions">
        ${index > 0 ? `<button class="tour-btn tour-btn-secondary" onclick="tour.prev()">← Back</button>` : '<span></span>'}
        <div class="tour-progress">
          ${this.steps.map((_, i) => `
            <span class="tour-dot ${i === index ? 'active' : ''}"></span>
          `).join('')}
        </div>
        <button class="tour-btn tour-btn-primary" onclick="tour.next()">
          ${index === this.steps.length - 1 ? 'Finish ✓' : 'Next →'}
        </button>
      </div>
    `;
    
    // Add click handler to target if specified
    if (step.clickTarget) {
      const clickHandler = () => {
        target.removeEventListener('click', clickHandler);
        this.next();
      };
      target.addEventListener('click', clickHandler);
      target.style.cursor = 'pointer';
    }
  }

  /**
   * Position spotlight on element
   */
  positionSpotlight(element) {
    const rect = element.getBoundingClientRect();
    const padding = 8;
    
    const spotlight = this.overlay.querySelector('.tour-spotlight');
    spotlight.style.cssText = `
      position: absolute;
      top: ${rect.top - padding}px;
      left: ${rect.left - padding}px;
      width: ${rect.width + (padding * 2)}px;
      height: ${rect.height + (padding * 2)}px;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8);
      transition: all 0.3s ease;
      z-index: 10001;
    `;
  }

  /**
   * Position tooltip relative to element
   */
  positionTooltip(target, position) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const margin = 16;
    
    let top, left;
    
    switch (position) {
      case 'top':
        top = rect.top - tooltipRect.height - margin;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = rect.bottom + margin;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.left - tooltipRect.width - margin;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.right + margin;
        break;
      default:
        top = rect.bottom + margin;
        left = rect.left;
    }
    
    // Keep in viewport
    const maxLeft = window.innerWidth - tooltipRect.width - margin;
    const maxTop = window.innerHeight - tooltipRect.height - margin;
    
    left = Math.max(margin, Math.min(left, maxLeft));
    top = Math.max(margin, Math.min(top, maxTop));
    
    this.tooltip.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      z-index: 10002;
    `;
  }

  /**
   * Go to next step
   */
  next() {
    this.showStep(this.currentStep + 1);
  }

  /**
   * Go to previous step
   */
  prev() {
    this.showStep(this.currentStep - 1);
  }

  /**
   * Skip tour
   */
  skip() {
    localStorage.setItem('2ndcto-tour-skipped', Date.now());
    this.destroy();
  }

  /**
   * Complete tour
   */
  complete() {
    localStorage.setItem('2ndcto-tour-completed', Date.now());
    
    // Show completion toast
    if (typeof showToast === 'function') {
      showToast({
        type: 'success',
        title: 'Tour Completed! 🎉',
        message: 'You\'re ready to analyze repositories.',
        duration: 5000
      });
    }
    
    this.destroy();
  }

  /**
   * Destroy tour elements
   */
  destroy() {
    this.isActive = false;
    if (this.overlay) this.overlay.remove();
    if (this.tooltip) this.tooltip.remove();
    this.overlay = null;
    this.tooltip = null;
  }

  /**
   * Reset tour (for testing)
   */
  reset() {
    localStorage.removeItem('2ndcto-tour-completed');
    localStorage.removeItem('2ndcto-tour-skipped');
    localStorage.removeItem('2ndcto-tour-started');
    this.start();
  }
}

// Dashboard tour steps
const dashboardTourSteps = [
  {
    target: 'h1',
    icon: '👋',
    title: 'Welcome to 2ndCTO',
    text: 'Your AI-powered codebase risk analyzer. Let\'s show you around.',
    position: 'bottom',
    highlight: 'Track bus factor, security issues, and technical debt.'
  },
  {
    target: '.search-container',
    icon: '🔍',
    title: 'Search Everything',
    text: 'Find security findings, files, or repositories instantly. Try pressing Cmd+K anytime.',
    position: 'bottom',
    highlight: 'Pro tip: Use filters to narrow by severity.'
  },
  {
    target: '.stats-grid',
    icon: '📊',
    title: 'Your Dashboard',
    text: 'See key metrics at a glance: repos analyzed, average risk score, and critical issues.',
    position: 'bottom',
    highlight: 'Red numbers mean urgent attention needed.'
  },
  {
    target: '.refresh-btn',
    icon: '🔄',
    title: 'Stay Updated',
    text: 'Dashboard auto-refreshes every 60 seconds, or click here to refresh manually.',
    position: 'bottom'
  },
  {
    target: 'table tbody tr:first-child',
    icon: '📁',
    title: 'Repository Analysis',
    text: 'Click any repository to see detailed security findings, bus factor, and AI recommendations.',
    position: 'right',
    clickTarget: true
  },
  {
    target: 'h1',
    icon: '🚀',
    title: 'Ready to Start!',
    text: 'Add your first repository to see 2ndCTO in action. Click "Refresh Data" to load your repos.',
    position: 'bottom',
    highlight: 'Need help? Check the documentation link in the footer.'
  }
];

// Initialize tour when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure page is rendered
  setTimeout(() => {
    window.tour = new OnboardingTour(dashboardTourSteps);
    
    // Auto-start for new users
    if (!localStorage.getItem('2ndcto-tour-completed') && 
        !localStorage.getItem('2ndcto-tour-skipped')) {
      window.tour.start();
    }
  }, 1000);
});

// Export for use in other pages
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnboardingTour;
}
