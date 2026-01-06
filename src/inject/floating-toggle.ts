// Floating toggle button for quick on/off switching
// This is injected into Fabric/Power BI pages

let floatingButton: HTMLElement | null = null;
let isEnabled = true;

export function createFloatingToggle(enabled: boolean, onToggle: () => void): void {
    // Only create in top frame, not in iframes
    if (window !== window.top) {
        return;
    }

    // Don't create if already exists
    if (floatingButton && document.body.contains(floatingButton)) {
        updateFloatingToggle(enabled);
        return;
    }

    isEnabled = enabled;

    // Create the button container
    floatingButton = document.createElement('div');
    floatingButton.id = 'darkreader-floating-toggle';
    floatingButton.setAttribute('style', `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 56px !important;
        height: 56px !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease !important;
        user-select: none !important;
        -webkit-user-select: none !important;
    `);

    // Create the icon
    const icon = document.createElement('div');
    icon.id = 'darkreader-floating-toggle-icon';
    icon.setAttribute('style', `
        width: 28px !important;
        height: 28px !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
    `);

    floatingButton.appendChild(icon);

    // Set initial state
    updateButtonAppearance();

    // Add hover effects
    floatingButton.addEventListener('mouseenter', () => {
        if (floatingButton) {
            floatingButton.style.transform = 'scale(1.1)';
            floatingButton.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
        }
    });

    floatingButton.addEventListener('mouseleave', () => {
        if (floatingButton) {
            floatingButton.style.transform = 'scale(1)';
            floatingButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }
    });

    // Add click handler
    floatingButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
    });

    // Add tooltip
    floatingButton.title = isEnabled ? 'Click to disable Dark Mode' : 'Click to enable Dark Mode';

    // Wait for body to be available
    if (document.body) {
        document.body.appendChild(floatingButton);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (floatingButton && document.body) {
                document.body.appendChild(floatingButton);
            }
        });
    }
}

function updateButtonAppearance(): void {
    if (!floatingButton) return;

    const icon = floatingButton.querySelector('#darkreader-floating-toggle-icon') as HTMLElement;
    
    if (isEnabled) {
        // Dark mode ON - show moon icon with blue/green background
        floatingButton.style.backgroundColor = '#316e7d';
        floatingButton.style.border = '3px solid #317c4e';
        if (icon) {
            // Moon icon (dark mode on)
            icon.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'/%3E%3C/svg%3E")`;
        }
        floatingButton.title = 'Click to disable Dark Mode';
    } else {
        // Dark mode OFF - show sun icon with orange background
        floatingButton.style.backgroundColor = '#e96c4c';
        floatingButton.style.border = '3px solid #c55a3e';
        if (icon) {
            // Sun icon (dark mode off)
            icon.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z'/%3E%3C/svg%3E")`;
        }
        floatingButton.title = 'Click to enable Dark Mode';
    }
}

export function updateFloatingToggle(enabled: boolean): void {
    isEnabled = enabled;
    updateButtonAppearance();
}

export function removeFloatingToggle(): void {
    if (floatingButton && floatingButton.parentNode) {
        floatingButton.parentNode.removeChild(floatingButton);
    }
    floatingButton = null;
}
