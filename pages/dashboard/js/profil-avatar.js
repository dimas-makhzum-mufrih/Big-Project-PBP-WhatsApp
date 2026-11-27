const NgumpulAvatar = (() => {
    function url(value) {
        if (typeof value !== 'string' || !value) return '';
        try {
            const parsed = new URL(value);
            if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password)
                return parsed.href;
        } catch (_) {}
        return '';
    }

    function render(container, nama, foto, lokal = false) {
        const src = url(foto) || (lokal && /^data:image\/(png|jpeg|webp);base64,/i.test(foto || '') ? foto : '');
        const initial = Array.from((nama || '').trim().replace(/^@/, ''))[0]?.toUpperCase() || '?';
        if (!src) {
            if (container.textContent !== initial || container.childElementCount) container.textContent = initial;
            return;
        }

        const current = container.firstElementChild;
        if (current?.tagName === 'IMG' && current.getAttribute('src') === src) return;
        const img = document.createElement('img');
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';
        img.loading = 'lazy';
        img.addEventListener('error', () => {
            if (img.parentElement === container) container.textContent = initial;
        }, { once: true });
        img.src = src;
        container.replaceChildren(img);
    }

    return { url, render };
})();
