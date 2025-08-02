// Background script for Tab Grouper Extension

class TabGrouperBackground {
    constructor() {
        this.groups = {};
        this.init();
    }

    init() {
        this.loadGroups();
        this.setupContextMenus();
        this.setupMessageHandlers();
    }

    async loadGroups() {
        try {
            const result = await browser.storage.local.get('tabGroups');
            this.groups = result.tabGroups || {};
            this.updateContextMenus();
        } catch (error) {
            console.error('Error loading groups in background:', error);
        }
    }

    async saveGroups() {
        try {
            await browser.storage.local.set({ tabGroups: this.groups });
        } catch (error) {
            console.error('Error saving groups in background:', error);
        }
    }

    setupContextMenus() {
        browser.contextMenus.removeAll(() => {
            this.createContextMenus();
        });
    }

    createContextMenus() {
        // Main context menu item
        browser.contextMenus.create({
            id: 'tabGrouper',
            title: 'Add to Tab Group',
            contexts: ['page', 'tab']
        });

        this.updateContextMenus();
    }

    updateContextMenus() {
        browser.contextMenus.removeAll(() => {
            // Recreate main menu
            browser.contextMenus.create({
                id: 'tabGrouper',
                title: 'Add to Tab Group',
                contexts: ['page', 'tab']
            });

            const groupNames = Object.keys(this.groups);

            if (groupNames.length === 0) {
                browser.contextMenus.create({
                    id: 'createGroup',
                    parentId: 'tabGrouper',
                    title: 'Create New Group...',
                    contexts: ['page', 'tab']
                });
            } else {
                // Add existing groups
                groupNames.forEach(groupName => {
                    const group = this.groups[groupName];

                    // Create parent menu item for the group
                    browser.contextMenus.create({
                        id: `group_${groupName}`,
                        parentId: 'tabGrouper',
                        title: `📁 ${groupName} (${group.tabs.length})`,
                        contexts: ['page', 'tab']
                    });

                    // Add "Open All" option
                    browser.contextMenus.create({
                        id: `group_open_${groupName}`,
                        parentId: `group_${groupName}`,
                        title: 'Open All Tabs',
                        contexts: ['page', 'tab']
                    });

                    // Add "Add to Group" option
                    browser.contextMenus.create({
                        id: `group_add_${groupName}`,
                        parentId: `group_${groupName}`,
                        title: 'Add Current Tab',
                        contexts: ['page', 'tab']
                    });
                });

                // Add separator and create new group option
                browser.contextMenus.create({
                    id: 'separator',
                    parentId: 'tabGrouper',
                    type: 'separator',
                    contexts: ['page', 'tab']
                });

                browser.contextMenus.create({
                    id: 'createGroup',
                    parentId: 'tabGrouper',
                    title: '➕ Create New Group...',
                    contexts: ['page', 'tab']
                });
            }
        });
    }

    setupMessageHandlers() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

        browser.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });

        browser.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.tabGroups) {
                this.groups = changes.tabGroups.newValue || {};
                this.updateContextMenus();
            }
        });
    }

    async handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'getGroups':
                await this.loadGroups();
                sendResponse({ groups: this.groups });
                break;

            case 'addTabToGroup':
                await this.addTabToGroup(message.groupName, message.tabData);
                sendResponse({ success: true });
                break;

            case 'createGroup':
                await this.createGroup(message.groupName);
                sendResponse({ success: true });
                break;

            case 'openAllTabs':
                await this.openAllTabsInGroup(message.groupName);
                sendResponse({ success: true });
                break;

            case 'updateContextMenus':
                await this.loadGroups();
                this.updateContextMenus();
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    async handleContextMenuClick(info, tab) {
        if (info.menuItemId === 'createGroup') {
            const groupName = await this.promptForGroupName();
            if (groupName) {
                await this.createGroup(groupName);
                await this.addTabToGroup(groupName, {
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                    favIconUrl: tab.favIconUrl,
                    added: Date.now()
                });
                this.showNotification(`Tab added to new group "${groupName}"`);
            }
        }
        else if (info.menuItemId.startsWith('group_open_')) {
            const groupName = info.menuItemId.replace('group_open_', '');
            await this.openAllTabsInGroup(groupName);
        }
        else if (info.menuItemId.startsWith('group_add_')) {
            const groupName = info.menuItemId.replace('group_add_', '');
            await this.addTabToGroup(groupName, {
                id: tab.id,
                title: tab.title,
                url: tab.url,
                favIconUrl: tab.favIconUrl,
                added: Date.now()
            });
            this.showNotification(`Tab added to "${groupName}"`);
        }
    }

    async promptForGroupName() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const response = await browser.tabs.sendMessage(tabs[0].id, {
                    action: 'promptGroupName'
                });
                return response ? response.groupName : null;
            }
        } catch (error) {
            console.error('Error prompting for group name:', error);
            browser.browserAction.openPopup();
        }
        return null;
    }

    async createGroup(groupName) {
        if (!groupName || this.groups[groupName]) {
            return false;
        }

        this.groups[groupName] = {
            name: groupName,
            tabs: [],
            created: Date.now(),
            color: this.getRandomColor()
        };

        await this.saveGroups();
        this.updateContextMenus();
        return true;
    }

    async addTabToGroup(groupName, tabData) {
        if (!this.groups[groupName]) {
            return false;
        }

        const existingTab = this.groups[groupName].tabs.find(tab => tab.url === tabData.url);
        if (existingTab) {
            return false;
        }

        this.groups[groupName].tabs.push(tabData);
        await this.saveGroups();
        this.updateContextMenus();
        return true;
    }

    async openAllTabsInGroup(groupName) {
        if (!this.groups[groupName]) {
            this.showNotification('Group not found');
            return;
        }

        const group = this.groups[groupName];
        if (group.tabs.length === 0) {
            this.showNotification('No tabs in this group');
            return;
        }

        try {
            // Check if we're on mobile
            const browserInfo = await browser.runtime.getBrowserInfo?.();
            const isMobile = browserInfo?.name.includes("Firefox") ||
                browserInfo?.name.includes("Chrome") &&
                (await browser.windows.getCurrent()).type === "normal";

            if (isMobile) {
                // Open tabs one by one in current window
                for (const tab of group.tabs) {
                    await browser.tabs.create({ url: tab.url, active: false });
                }
                // Focus the last tab
                if (group.tabs.length > 0) {
                    const tabs = await browser.tabs.query({});
                    if (tabs.length > 0) {
                        await browser.tabs.update(tabs[tabs.length - 1].id, { active: true });
                    }
                }
            } else {
                // Desktop - open in new window
                await browser.windows.create({
                    url: group.tabs.map(tab => tab.url),
                    focused: true
                });
            }

            this.showNotification(`Opened ${group.tabs.length} tabs from "${groupName}"`);
        } catch (error) {
            console.error('Error opening tabs:', error);
            this.showNotification('Failed to open tabs');
        }
    }

    getRandomColor() {
        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
            '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    showNotification(message) {
        if (browser.notifications) {
            browser.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon-48.png',
                title: 'Tab Grouper',
                message: message
            });
        }
    }
}

// Initialize background script
const tabGrouperBg = new TabGrouperBackground();