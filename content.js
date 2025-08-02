// Content script for Tab Grouper Extension
// This script handles the desktop right-click functionality

class TabGrouperContent {
    constructor() {
        this.init();
    }

    init() {
        this.setupMessageHandlers();
    }

    setupMessageHandlers() {
        // Listen for messages from background script
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep the message channel open for async response
        });
    }

    async handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'promptGroupName':
                const groupName = await this.promptForGroupName();
                sendResponse({ groupName });
                break;

            case 'showNotification':
                this.showInPageNotification(message.text, message.type);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    async promptForGroupName() {
        return new Promise((resolve) => {
            // Create a custom modal dialog
            const modal = this.createGroupNameModal();
            document.body.appendChild(modal);

            const input = modal.querySelector('.group-name-input');
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');

            // Focus the input
            setTimeout(() => input.focus(), 100);

            // Handle confirm
            const handleConfirm = () => {
                const groupName = input.value.trim();
                if (groupName) {
                    document.body.removeChild(modal);
                    resolve(groupName);
                } else {
                    input.style.borderColor = '#ef4444';
                    input.focus();
                }
            };

            // Handle cancel
            const handleCancel = () => {
                document.body.removeChild(modal);
                resolve(null);
            };

            // Event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            });

            // Click outside to cancel
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            });
        });
    }

    createGroupNameModal() {
        const modal = document.createElement('div');
        modal.className = 'tab-grouper-modal';

        modal.innerHTML = `
            <div class="tab-grouper-modal-content">
                <div class="tab-grouper-modal-header">
                    <h3>Create New Group</h3>
                    <svg class="tab-grouper-modal-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="3" rx="1" fill="currentColor"/>
                        <rect x="3" y="9" width="12" height="3" rx="1" fill="currentColor"/>
                        <rect x="3" y="14" width="15" height="3" rx="1" fill="currentColor"/>
                    </svg>
                </div>
                <div class="tab-grouper-modal-body">
                    <label for="groupNameInput">Group Name:</label>
                    <input type="text" class="group-name-input" placeholder="Enter group name..." maxlength="30">
                </div>
                <div class="tab-grouper-modal-footer">
                    <button class="cancel-btn">Cancel</button>
                    <button class="confirm-btn">Create Group</button>
                </div>
            </div>
        `;

        // Add styles
        const style = `
            .tab-grouper-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.7) !important;
                backdrop-filter: blur(10px) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 999999 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }

            .tab-grouper-modal-content {
                background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(30, 30, 45, 0.95)) !important;
                backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 16px !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
                padding: 24px !important;
                min-width: 400px !important;
                max-width: 90vw !important;
                color: #ffffff !important;
            }

            .tab-grouper-modal-header {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                margin-bottom: 20px !important;
                padding-bottom: 16px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            }

            .tab-grouper-modal-header h3 {
                margin: 0 !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                color: #ffffff !important;
            }

            .tab-grouper-modal-icon {
                color: #6366f1 !important;
            }

            .tab-grouper-modal-body {
                margin-bottom: 24px !important;
            }

            .tab-grouper-modal-body label {
                display: block !important;
                margin-bottom: 8px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                color: #e5e7eb !important;
            }

            .group-name-input {
                width: 100% !important;
                padding: 12px 16px !important;
                background: rgba(255, 255, 255, 0.05) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 10px !important;
                color: #ffffff !important;
                font-size: 14px !important;
                backdrop-filter: blur(10px) !important;
                transition: all 0.3s ease !important;
                box-sizing: border-box !important;
            }

            .group-name-input:focus {
                outline: none !important;
                border-color: #6366f1 !important;
                background: rgba(255, 255, 255, 0.08) !important;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
            }

            .group-name-input::placeholder {
                color: rgba(255, 255, 255, 0.4) !important;
            }

            .tab-grouper-modal-footer {
                display: flex !important;
                gap: 12px !important;
                justify-content: flex-end !important;
            }

            .tab-grouper-modal-footer button {
                padding: 10px 20px !important;
                border: none !important;
                border-radius: 8px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
            }

            .cancel-btn {
                background: rgba(255, 255, 255, 0.05) !important;
                color: #e5e7eb !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }

            .cancel-btn:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                border-color: rgba(255, 255, 255, 0.2) !important;
            }

            .confirm-btn {
                background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
                color: #ffffff !important;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
            }

            .confirm-btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
            }

            .confirm-btn:active {
                transform: translateY(0) !important;
            }
        `;

        // Add styles to the page
        const styleSheet = document.createElement('style');
        styleSheet.textContent = style;
        document.head.appendChild(styleSheet);

        return modal;
    }

    showInPageNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'tab-grouper-notification';

        const backgrounds = {
            success: 'rgba(34, 197, 94, 0.9)',
            error: 'rgba(239, 68, 68, 0.9)',
            warning: 'rgba(245, 158, 11, 0.9)',
            info: 'rgba(99, 102, 241, 0.9)'
        };

        notification.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            padding: 12px 16px !important;
            border-radius: 8px !important;
            color: #fff !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            z-index: 999998 !important;
            backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            transform: translateX(100%) !important;
            transition: transform 0.3s ease !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            background: ${backgrounds[type] || backgrounds.info} !important;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0) !important';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%) !important';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize content script
new TabGrouperContent();