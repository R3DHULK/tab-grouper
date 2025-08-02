class TabGrouper {
    constructor() {
        this.groups = {};
        this.currentTab = null;
        this.init();
    }

    async init() {
        await this.loadGroups();
        await this.getCurrentTab();
        this.setupEventListeners();
        this.render();
    }

    async loadGroups() {
        try {
            const result = await browser.storage.local.get('tabGroups');
            this.groups = result.tabGroups || {};
        } catch (error) {
            console.error('Error loading groups:', error);
            this.groups = {};
        }
    }

    async saveGroups() {
        try {
            await browser.storage.local.set({ tabGroups: this.groups });
        } catch (error) {
            console.error('Error saving groups:', error);
        }
    }

    async getCurrentTab() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                this.currentTab = tabs[0];
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    setupEventListeners() {
        const createBtn = document.getElementById('createGroupBtn');
        const groupNameInput = document.getElementById('groupNameInput');

        createBtn.addEventListener('click', () => this.createGroup());
        groupNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createGroup();
            }
        });
        groupNameInput.focus();
    }

    async createGroup() {
        const input = document.getElementById('groupNameInput');
        const groupName = input.value.trim();

        if (!groupName) {
            this.showNotification('Please enter a group name', 'error');
            return;
        }

        if (this.groups[groupName]) {
            this.showNotification('Group already exists', 'error');
            return;
        }

        this.groups[groupName] = {
            name: groupName,
            tabs: [],
            created: Date.now(),
            color: this.getRandomColor()
        };

        await this.saveGroups();
        input.value = '';
        this.render();
        this.showNotification(`Group "${groupName}" created successfully`, 'success');
    }

    async addTabToGroup(groupName) {
        if (!this.currentTab) {
            this.showNotification('No active tab found', 'error');
            return;
        }

        if (!this.groups[groupName]) {
            this.showNotification('Group not found', 'error');
            return;
        }

        const tabData = {
            id: this.currentTab.id,
            title: this.currentTab.title,
            url: this.currentTab.url,
            favIconUrl: this.currentTab.favIconUrl,
            added: Date.now()
        };

        const existingTab = this.groups[groupName].tabs.find(tab => tab.url === tabData.url);
        if (existingTab) {
            this.showNotification('Tab already exists in this group', 'warning');
            return;
        }

        this.groups[groupName].tabs.push(tabData);
        await this.saveGroups();
        this.render();
        this.showNotification(`Tab added to "${groupName}"`, 'success');
    }

    async deleteGroup(groupName) {
        if (confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
            delete this.groups[groupName];
            await this.saveGroups();
            this.render();
            this.showNotification(`Group "${groupName}" deleted`, 'success');
        }
    }

    async removeTabFromGroup(groupName, tabIndex) {
        if (this.groups[groupName] && this.groups[groupName].tabs[tabIndex]) {
            this.groups[groupName].tabs.splice(tabIndex, 1);
            await this.saveGroups();
            this.render();
            this.showNotification('Tab removed from group', 'success');

            if (this.groups[groupName].tabs.length === 0) {
                // Optional: Delete group if empty
                // await this.deleteGroup(groupName);
            }
        }
    }

    async openTab(url) {
        try {
            await browser.tabs.create({ url: url });
        } catch (error) {
            console.error('Error opening tab:', error);
        }
    }

    async openAllTabsInGroup(groupName) {
        if (!this.groups[groupName]) {
            this.showNotification('Group not found', 'error');
            return;
        }

        const group = this.groups[groupName];
        if (group.tabs.length === 0) {
            this.showNotification('No tabs in this group', 'warning');
            return;
        }

        try {
            const browserInfo = await browser.runtime.getBrowserInfo?.();
            const isMobile = browserInfo?.name.includes("Firefox") ||
                browserInfo?.name.includes("Chrome") &&
                (await browser.windows.getCurrent()).type === "normal";

            if (isMobile) {
                for (const tab of group.tabs) {
                    await browser.tabs.create({ url: tab.url, active: false });
                }
                if (group.tabs.length > 0) {
                    const tabs = await browser.tabs.query({});
                    if (tabs.length > 0) {
                        await browser.tabs.update(tabs[tabs.length - 1].id, { active: true });
                    }
                }
            } else {
                await browser.windows.create({
                    url: group.tabs.map(tab => tab.url),
                    focused: true
                });
            }

            this.showNotification(`Opened ${group.tabs.length} tabs from "${groupName}"`, 'success');
        } catch (error) {
            console.error('Error opening tabs:', error);
            this.showNotification('Failed to open tabs', 'error');
        }
    }

    getRandomColor() {
        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
            '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getFavicon() {
        // Return just a simple favicon emoji
        return '🌐';
    }

    getDomainFromUrl(url) {
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain.length > 30 ? domain.substring(0, 27) + '...' : domain;
        } catch {
            return 'unknown';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10000',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        const backgrounds = {
            success: 'rgba(34, 197, 94, 0.9)',
            error: 'rgba(239, 68, 68, 0.9)',
            warning: 'rgba(245, 158, 11, 0.9)',
            info: 'rgba(99, 102, 241, 0.9)'
        };
        notification.style.background = backgrounds[type] || backgrounds.info;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    render() {
        this.renderCurrentTab();
        this.renderGroupsList();
        this.renderManageGroups();
        this.toggleNoGroupsMessage();
    }

    renderCurrentTab() {
        const titleEl = document.getElementById('currentTabTitle');
        const urlEl = document.getElementById('currentTabUrl');

        if (this.currentTab) {
            titleEl.textContent = this.currentTab.title || 'Untitled';
            urlEl.textContent = this.getDomainFromUrl(this.currentTab.url || '');
        } else {
            titleEl.textContent = 'No active tab';
            urlEl.textContent = '';
        }
    }

    renderGroupsList() {
        const container = document.getElementById('groupsList');
        container.innerHTML = '';

        const groupNames = Object.keys(this.groups);

        if (groupNames.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                    <p>No groups created yet.</p>
                    <p style="font-size: 12px; margin-top: 4px;">Create a group above to get started.</p>
                </div>
            `;
            return;
        }

        groupNames.forEach(groupName => {
            const group = this.groups[groupName];
            const groupEl = document.createElement('div');
            groupEl.className = 'group-item';

            groupEl.innerHTML = `
                <div class="group-info">
                    <div class="group-icon" style="background-color: ${group.color}20; color: ${group.color};">
                        📁
                    </div>
                    <div class="group-name">${groupName}</div>
                </div>
                <div class="group-count">${group.tabs.length}</div>
            `;

            groupEl.addEventListener('click', () => this.addTabToGroup(groupName));
            container.appendChild(groupEl);
        });
    }

    renderManageGroups() {
        const container = document.getElementById('groupsManage');
        container.innerHTML = '';

        const groupNames = Object.keys(this.groups);

        if (groupNames.length === 0) {
            return;
        }

        groupNames.forEach(groupName => {
            const group = this.groups[groupName];
            const groupEl = document.createElement('div');
            groupEl.className = 'manage-group-item';

            const tabsHtml = group.tabs.map((tab, index) => `
                <div class="tab-item">
                    <div class="tab-item-icon">${this.getFavicon()}</div>
                    <div class="tab-item-content">
                        <div class="tab-item-title" title="${tab.title}">${tab.title}</div>
                        <div class="tab-item-url" title="${tab.url}">${this.getDomainFromUrl(tab.url)}</div>
                    </div>
                    <button class="btn-secondary btn-danger remove-tab-btn" data-group="${groupName}" data-index="${index}">×</button>
                </div>
            `).join('');

            groupEl.innerHTML = `
                <div class="manage-group-header">
                    <div class="manage-group-info">
                        <div class="group-icon" style="background-color: ${group.color}20; color: ${group.color};">
                            📁
                        </div>
                        <div class="group-name">${groupName}</div>
                        <div class="group-count">${group.tabs.length}</div>
                    </div>
                    <div class="manage-actions">
                        <button class="btn-secondary btn-open-all" data-group="${groupName}">Open All</button>
                        <button class="btn-secondary btn-danger delete-group-btn" data-group="${groupName}">Delete</button>
                    </div>
                </div>
                ${group.tabs.length > 0 ? `
                    <div class="group-tabs">
                        ${tabsHtml}
                    </div>
                ` : `
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                        No tabs in this group
                    </div>
                `}
            `;

            groupEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-group-btn')) {
                    const groupName = e.target.getAttribute('data-group');
                    this.deleteGroup(groupName);
                }
                else if (e.target.classList.contains('btn-open-all')) {
                    const groupName = e.target.getAttribute('data-group');
                    this.openAllTabsInGroup(groupName);
                }
                else if (e.target.classList.contains('remove-tab-btn')) {
                    const groupName = e.target.getAttribute('data-group');
                    const tabIndex = parseInt(e.target.getAttribute('data-index'));
                    this.removeTabFromGroup(groupName, tabIndex);
                }
                else if (e.target.closest('.tab-item') && !e.target.classList.contains('btn-danger')) {
                    const tabItem = e.target.closest('.tab-item');
                    const tabIndex = Array.from(tabItem.parentNode.children).indexOf(tabItem);
                    this.openTab(group.tabs[tabIndex].url);
                }
            });

            container.appendChild(groupEl);
        });
    }

    toggleNoGroupsMessage() {
        const noGroupsEl = document.getElementById('noGroupsMessage');
        const hasGroups = Object.keys(this.groups).length > 0;

        noGroupsEl.style.display = hasGroups ? 'none' : 'block';
        document.getElementById('addTabSection').style.display = hasGroups ? 'block' : 'none';
        document.getElementById('manageSection').style.display = hasGroups ? 'block' : 'none';
    }
}

// Initialize the Tab Grouper
let tabGrouper;

document.addEventListener('DOMContentLoaded', () => {
    tabGrouper = new TabGrouper();
});