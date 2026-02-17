# 2ndCTO Chrome Extension

Analyze any GitHub repository with one click directly from GitHub.com.

## Features

- 🔍 **One-Click Analysis** - Analyze any repo from the GitHub page
- 📊 **Risk Score Display** - See risk score directly in the popup
- ⚡ **Instant Results** - Quick access to full reports
- 🎯 **Context-Aware** - Auto-detects repository from current page

## Installation

### Developer Mode (Current)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this repo
5. The extension icon will appear in your toolbar

### From Chrome Web Store (Coming Soon)

Search for "2ndCTO" in the Chrome Web Store and click "Add to Chrome".

## Usage

### Method 1: Extension Popup
1. Navigate to any GitHub repository
2. Click the 2ndCTO extension icon in your toolbar
3. Click "Analyze Repository"
4. View progress and results

### Method 2: Inline Button
1. Visit any GitHub repository page
2. Look for the "Analyze with 2ndCTO" button near the repo header
3. Click to start analysis
4. Results open in a new tab

## Configuration

Click the extension icon and modify:
- **Server URL** - Your 2ndCTO instance (default: http://localhost:3001)

## Permissions

The extension requires:
- `activeTab` - To detect the current GitHub repository
- `storage` - To save your server URL preference
- `https://github.com/*` - To inject the analyze button

No data is collected or sent to third parties.

## Development

To modify the extension:

1. Edit files in `chrome-extension/` folder
2. Go to `chrome://extensions/`
3. Click refresh icon on 2ndCTO extension
4. Test your changes

## Troubleshooting

**Extension not showing on GitHub?**
- Refresh the GitHub page
- Check that you're on a repository page (github.com/owner/repo)
- Verify extension is enabled in chrome://extensions/

**"Failed to connect" error?**
- Ensure 2ndCTO server is running (http://localhost:3001)
- Check the Server URL in extension settings
- Verify no firewall blocking the connection

**Analysis not starting?**
- Check browser console for errors (F12 → Console)
- Verify the repository is public (or you're authenticated)
- Try analyzing from the dashboard instead

## Support

- GitHub Issues: https://github.com/nKOxxx/2ndCTO/issues
- Dashboard: http://localhost:3001
