window.NgumpulLiveKit = (() => {
    const sdkUrl = new URL('../vendor/livekit/livekit-client-2.25.0.js?v=2', document.currentScript.src);
    let loading;
    function load() {
        if (window.LivekitClient) return Promise.resolve(window.LivekitClient);
        if (!loading) loading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const fail = () => {
                script.remove();
                reject(new Error('SDK panggilan gagal dimuat.'));
            };
            script.src = sdkUrl.href;
            script.onload = () => window.LivekitClient ? resolve(window.LivekitClient) : fail();
            script.onerror = fail;
            document.head.append(script);
        }).catch(error => { loading = null; throw error; });
        return loading;
    }

    const publicApi = 'https://api.afadhili.my.id';
    const publicSignal = new URL('wss://livekit.afadhili.my.id');
    const internalHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'livekit']);

    function resolveEndpoint(access) {
        let endpoint;
        try { endpoint = new URL(access.url); } catch (_) {}
        if (!endpoint || !['https:', 'http:', 'wss:', 'ws:'].includes(endpoint.protocol) ||
            endpoint.username || endpoint.password) {
            throw new Error('Alamat layanan suara dari API tidak valid.');
        }

        // Dokumen frontend bisa dibuka dari localhost sambil tetap memakai API produksi.
        const production = access.apiOrigin === publicApi;
        const defaultPath = endpoint.pathname === '/' && !endpoint.search && !endpoint.hash;
        const publicHost = endpoint.hostname === publicSignal.hostname && ['', '7880'].includes(endpoint.port);
        const localLiveKit = internalHosts.has(endpoint.hostname) && endpoint.port === '7880';
        if (production && defaultPath && (publicHost || localLiveKit)) return publicSignal.origin;
        if (location.protocol === 'https:' && !['https:', 'wss:'].includes(endpoint.protocol)) {
            throw new Error('Layanan suara perlu alamat WSS untuk halaman HTTPS.');
        }
        return endpoint.href;
    }

    function describeError(error, endpoint) {
        if (!endpoint || error.name !== 'ConnectionError') return null;
        if (error.reasonName === 'NotAllowed' || [401, 403].includes(error.status)) {
            return 'Akses ruang suara ditolak. Coba gabung lagi untuk meminta token baru.';
        }
        if (['ServerUnreachable', 'WebSocket', 'ServiceNotFound'].includes(error.reasonName)) {
            return 'Koneksi ke layanan suara gagal (' + new URL(endpoint).hostname + '). Coba gabung lagi.';
        }
        return 'Sambungan panggilan gagal. Coba gabung lagi.';
    }

    return { load, resolveEndpoint, describeError };
})();
