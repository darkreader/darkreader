const fallbackStyle = document.createElement('style');
fallbackStyle.textContent = 'html,body,body :not(iframe) { background-color:#181a1b!important;border-color:#776e62!important;color:#e8e6e3!important;';
document.documentElement.appendChild(fallbackStyle);
// After inserting into DOM no need for any performance reducing so all `meta/optional` things are being handled.
// Also using document.documentElement so it's no need to wait until the `head` element is loaded.
fallbackStyle.media = 'screen';
fallbackStyle.classList.add('darkreader');
fallbackStyle.classList.add('darkreader--fallback');
