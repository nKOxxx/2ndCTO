// 2ndCTO Chrome Extension - Content Script
// Injects analyze button on GitHub repository pages

const API_BASE = 'http://localhost:3001';

function init() {
    // Check if we're on a repo page
    const repoHeader = document.querySelector('[data-testid="repo-title"]') || 
                       document.querySelector('h1 strong a');
    
    if (!repoHeader) return;
    
    // Don't inject if already present
    if (document.getElementById('second-cto-btn')) return;
    
    // Create button
    const btn = document.createElement('a');
    btn.id = 'second-cto-btn';
    btn.className = 'btn btn-sm btn-secondary second-cto-btn';
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: text-bottom;">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        Analyze with 2ndCTO
    `;
    
    // Find insertion point - try multiple selectors
    const targetSelectors = [
        '.repository-content .BorderGrid-cell',
        '.file-navigation',
        '[data-testid="file-mode-container"]',
        '.repo-actions'
    ];
    
    let inserted = false;
    for (const selector of targetSelectors) {
        const target = document.querySelector(selector);
        if (target) {
            target.appendChild(btn);
            inserted = true;
            break;
        }
    }
    
    if (!inserted) {
        // Fallback: add to page header area
        const header = document.querySelector('h1');
        if (header) {
            header.parentElement.appendChild(btn);
        }
    }
    
    // Handle click
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        btn.classList.add('loading');
        btn.innerHTML = 'Analyzing...';
        
        const repoInfo = parseRepoFromPage();
        if (repoInfo) {
            await analyzeRepo(repoInfo, btn);
        }
    });
}

function parseRepoFromPage() {
    const pathMatch = window.location.pathname.match(/\/([^\/]+)\/([^\/]+)/);
    if (pathMatch) {
        return {
            owner: pathMatch[1],
            repo: pathMatch[2]
        };
    }
    return null;
}

async function analyzeRepo(repoInfo, btn) {
    try {
        const response = await fetch(`${API_BASE}/api/repos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(repoInfo)
        });
        
        const data = await response.json();
        
        if (data.success) {
            btn.innerHTML = '✓ Analysis Started';
            btn.classList.remove('loading');
            btn.classList.add('success');
            
            // Open progress page
            window.open(`${API_BASE}/progress.html?id=${data.repo.id}&name=${encodeURIComponent(repoInfo.owner + '/' + repoInfo.repo)}`, '_blank');
            
            setTimeout(() => {
                btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: text-bottom;">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                    </svg>
                    Analyze with 2ndCTO
                `;
                btn.classList.remove('success');
            }, 3000);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        btn.innerHTML = '✗ Error';
        btn.classList.remove('loading');
        btn.classList.add('error');
        console.error('2ndCTO Error:', error);
        
        setTimeout(() => {
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: text-bottom;">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                Analyze with 2ndCTO
            `;
            btn.classList.remove('error');
        }, 3000);
    }
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Re-run on URL changes (GitHub SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(init, 1000);
    }
}).observe(document, { subtree: true, childList: true });
