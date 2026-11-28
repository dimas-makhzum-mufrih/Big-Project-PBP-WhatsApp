const NgumpulAuth = (() => {
  const baseUrl = new URL('https://api.afadhili.my.id/api/');
  const sessionKey = 'ngumpul_auth';
  const verificationKey = 'ngumpul_verifikasi_email';
  let pengguna = null;
  let tokenApi = null;

  const pesanKode = {
    INVALID_EMAIL_OR_PASSWORD: 'Email atau sandi salah.',
    INVALID_EMAIL: 'Format email belum benar.',
    INVALID_ORIGIN: 'Alamat halaman ini belum diizinkan oleh layanan Ngumpul.',
    PASSWORD_TOO_SHORT: 'Sandi minimal 8 karakter.',
    PASSWORD_TOO_LONG: 'Sandi maksimal 128 karakter.',
    USER_ALREADY_EXISTS: 'Email ini sudah terdaftar. Silakan masuk.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Email ini sudah terdaftar. Silakan masuk.',
    INVALID_OTP: 'Kode verifikasi salah atau sudah tidak berlaku.',
    OTP_EXPIRED: 'Kode sudah kedaluwarsa. Minta kode baru.',
    TOO_MANY_ATTEMPTS: 'Terlalu banyak percobaan. Minta kode baru.'
  };

  class AuthError extends Error {
    constructor(status, code, message = 'Permintaan ke layanan Ngumpul gagal.') {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  async function request(path, { method = 'GET', body, token, cookie = false, keepalive = false, includeOrigin = false } = {}) {
    const url = new URL(path, baseUrl);
    if (url.origin !== baseUrl.origin) throw new Error('Alamat API Ngumpul tidak valid.');
    const headers = new Headers();
    if (body) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', 'Bearer ' + token);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: cookie ? 'include' : 'omit',
        redirect: 'error',
        cache: 'no-store',
        keepalive,
        signal: controller.signal
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new AuthError(response.status, data?.code, data?.error);
      }
      if (response.status === 204) return;
      const data = await response.json();
      return includeOrigin ? { ...data, apiOrigin: new URL(response.url || url).origin } : data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function kirim(path, body) {
    return request('auth/' + path, { method: 'POST', body });
  }

  function bacaSesi() {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey));
    } catch {
      return null;
    }
  }

  function simpanSesi(sesi) {
    sessionStorage.setItem(sessionKey, JSON.stringify(sesi));
  }

  function hapusSesi() {
    sessionStorage.removeItem(sessionKey);
    pengguna = null;
    tokenApi = null;
  }

  async function masuk(email, password) {
    const data = await kirim('sign-in/email', { email, password });
    if (!data?.user?.id || !data.token) throw new AuthError(502);
    simpanSesi({ token: data.token });
  }

  async function bacaSesiServer(sesi) {
    try {
      return await request('auth/get-session', sesi);
    } catch (error) {
      if (error.status === 401) return null;
      throw error;
    }
  }

  async function pulihkanSesi() {
    const sesi = bacaSesi();
    if (!sesi?.token && !sesi?.googleUserId) return null;

    const data = await bacaSesiServer({ token: sesi.token, cookie: !!sesi.googleUserId });
    const user = data?.user;
    if (!data?.session || !user?.id || (sesi.googleUserId && sesi.googleUserId !== user.id)) {
      hapusSesi();
      return null;
    }

    // Halaman aplikasi memakai nama Indonesia pada data akun.
    pengguna = { id: user.id, nama: user.name, username: user.username, email: user.email, avatar: user.image };
    tokenApi = sesi.token || data.session.token;
    return pengguna;
  }

  async function api(path, options) {
    if (!tokenApi) throw new AuthError(401);
    return request(path, { ...options, token: tokenApi });
  }

  function bukaSocket(jenis, peerId) {
    if (!tokenApi) throw new AuthError(401);
    const url = new URL('/ws/' + jenis, baseUrl);
    url.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    if (peerId) url.searchParams.set(jenis === 'channel' ? 'channelId' : 'peerId', peerId);
    url.searchParams.set('token', tokenApi);
    return new WebSocket(url);
  }

  async function simpanProfil(fields) {
    const { profile } = await api('profile', { method: 'PUT', body: fields });
    pengguna.username = profile.username;
    return profile;
  }

  async function simpanUsername(username) {
    return (await simpanProfil({ username })).username;
  }

  async function ubahSandi(body) {
    const result = await api('auth/change-password', { method: 'POST', body });
    if (result.token) {
      const sesi = bacaSesi() || {};
      tokenApi = result.token;
      simpanSesi({ ...sesi, token: tokenApi });
    }
    return result;
  }

  function urlGoogle(loginUrl) {
    const callback = new URL(loginUrl, location.href);
    callback.searchParams.set('google', 'selesai');
    const errorCallback = new URL(loginUrl, location.href);
    errorCallback.searchParams.set('google', 'gagal');
    const url = new URL('auth/google/start', baseUrl);
    url.searchParams.set('callbackURL', callback.href);
    url.searchParams.set('errorCallbackURL', errorCallback.href);
    return url.href;
  }

  async function selesaikanGoogle() {
    const data = await bacaSesiServer({ cookie: true });
    if (!data?.session || !data.user?.id) return false;
    simpanSesi({ googleUserId: data.user.id });
    return true;
  }

  async function keluar() {
    const sesi = bacaSesi();
    if (sesi?.token || sesi?.googleUserId) {
      try {
        await request('auth/sign-out', { method: 'POST', token: sesi.token, cookie: !!sesi.googleUserId });
      } catch (error) {
        if (error.status !== 401) throw error;
      }
    }
    hapusSesi();
    akhiriVerifikasi();
  }

  function mulaiVerifikasi(email) {
    sessionStorage.setItem(verificationKey, email);
  }

  function emailVerifikasi() {
    return sessionStorage.getItem(verificationKey);
  }

  function akhiriVerifikasi() {
    sessionStorage.removeItem(verificationKey);
  }

  function pesanError(error, fallback = 'Permintaan gagal. Coba lagi.') {
    if (!(error instanceof AuthError)) return 'Tidak dapat terhubung ke layanan Ngumpul. Coba lagi.';
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
    return pesanKode[error.code] || fallback;
  }

  return {
    kirim, masuk, pulihkanSesi, urlGoogle, selesaikanGoogle, keluar,
    api, bukaSocket, simpanUsername, simpanProfil, ubahSandi,
    sesiSekarang: (token) => token === tokenApi,
    mulaiVerifikasi, emailVerifikasi, akhiriVerifikasi, pesanError,
    get pengguna() { return pengguna; }
  };
})();
