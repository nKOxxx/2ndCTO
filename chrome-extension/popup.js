// 2ndCTO Chrome Extension - Popup Script

const API_BASE = 'http://localhost:3001';

// Get current tab and detect repo
document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const repoInfo = parseGitHubUrl(tab.url);
    const analyzeBtn = document.getElementById('analyzeBtn');
    const repoNameEl = document.getElementById('repoName');
    const repoMetaEl = document.getElementById('repoMeta');
    
    if (repoInfo) {
        repoNameEl.textContent = `${repoInfo.owner}/${repoInfo.repo}`;
        repoMetaEl.textContent = 'Ready to analyze';
        analyzeBtn.disabled = false;
        analyzeBtn.onclick = () => analyzeRepo(repoInfo);
        
        // Check if already analyzed
        checkExistingAnalysis(repoInfo);
    } else {
        repoNameEl.textContent = 'No repository detected';
        repoMetaEl.textContent = 'Navigate to a GitHub repository';
        analyzeBtn.disabled = true;
    }
});

function parseGitHubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
        return {
            owner: match[1],
            repo: match[2].replace(/\.git$/, '')
        };
    }
    return null;
}

async function checkExistingAnalysis(repoInfo) {
    try {
        const response = await fetch(`${API_BASE}/api/repos`);
        const data = await response.json();
        
        const existing = data.repos?.find(r => 
            r.owner === repoInfo.owner && r.name === repoInfo.repo
        );
        
        if (existing && existing.risk_score !== null) {
            showRiskScore(existing.risk_score);
            document.getElementById('analyzeBtn').textContent = '🔄 Re-analyze';
        }
    } catch (error) {
        console.error('Failed to check existing analysis:', error);
    }
}

async function analyzeRepo(repoInfo) {
    const btn = document.getElementById('analyzeBtn');
    const status = document.getElementById('status');
    
    btn.disabled = true;
    status.className = 'status loading show';
    status.textContent = 'Adding repository...';
    
    try {
        // Add repo to 2ndCTO
        const addResponse = await fetch(`${API_BASE}/api/repos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner: repoInfo.owner,
                name: repoInfo.repo
            })
        });
        
        const addData = await addResponse.json();
        
        if (!addData.success) {
            throw new Error(addData.error || 'Failed to add repository');
        }
        
        const repoId = addData.repo.id;
        
        status.textContent = 'Analysis queued! Opening progress page...';
        status.className = 'status success show';
        
        // Open progress page
        setTimeout(() => {
            chrome.tabs.create({
                url: `${API_BASE}/progress.html?id=${repoId}&name=${encodeURIComponent(repoInfo.owner + '/' + repoInfo.repo)}`
            });
        }, 1000);
        
    } catch (error) {
        status.textContent = 'Error: ' + error.message;
        status.className = 'status error show';
        btn.disabled = false;
    }
}

function showRiskScore(score) {
    const riskScoreEl = document.getElementById('riskScore');
    const badgeEl = document.getElementById('scoreBadge');
    const valueEl = document.getElementById('scoreValue');
    
    riskScoreEl.style.display = 'flex';
    badgeEl.textContent = score;
    valueEl.textContent = score >= 70 ? 'Critical' : score >= 40 ? 'Moderate' : 'Low';
    
    badgeEl.className = 'score-badge ' + (score >= 70 ? 'critical' : score >= 40 ? 'warning' : 'good');
}
