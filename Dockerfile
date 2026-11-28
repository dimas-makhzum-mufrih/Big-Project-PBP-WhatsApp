FROM nginx:1.28-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /srv/ngumpul/
COPY assets/ /srv/ngumpul/assets/
COPY pages/ /srv/ngumpul/pages/

# Version changing scripts and styles even when the CDN sets a browser cache TTL.
RUN cd /srv/ngumpul && \
    for asset in assets/js/auth.js assets/js/auth-page.js assets/js/livekit.js \
                 pages/dashboard/js/profil-avatar.js pages/dashboard/js/teman-data.js \
                 pages/dashboard/js/chat-data.js pages/dashboard/js/chat-tampil.js \
                 pages/dashboard/js/chat-aksi.js pages/dashboard/js/teman.js \
                 pages/dashboard/js/info-kontak.js pages/dashboard/js/grup-data.js \
                 pages/dashboard/js/grup-dasar.js pages/dashboard/js/grup.js \
                 pages/dashboard/js/grup-panggilan.js pages/dashboard/js/setelan-api.js pages/dashboard/js/dm-call.js \
                 pages/dashboard/css/dashboard.css pages/dashboard/css/kontak.css \
                 pages/dashboard/css/grup.css pages/dashboard/css/profil-kontak.css \
                 pages/profile/edit-profile.js; do \
        checksum=$(sha256sum "$asset") && version=$(printf "%.12s" "$checksum") && \
        filename=${asset##*/} && \
        sed -i -E "s|${filename%.*}[.]${filename##*.}([?]v=[[:alnum:]]+)?|${filename}?v=${version}|g" \
            pages/dashboard/dashboard.html pages/profile/edit-profile.html || exit 1; \
    done
