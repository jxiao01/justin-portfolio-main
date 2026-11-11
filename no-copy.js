(() => {
    const style = document.createElement('style');
    style.textContent =
        'html { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }' +
        'img, video { -webkit-user-drag: none; }' +
        'input, textarea, [contenteditable] { -webkit-user-select: text; user-select: text; }';
    document.head.appendChild(style);

    const editable = target => target.closest && target.closest('input, textarea, [contenteditable]');
    ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'selectstart'].forEach(type => {
        document.addEventListener(type, e => {
            if (!editable(e.target)) e.preventDefault();
        }, true);
    });
})();
