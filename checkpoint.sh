#!/bin/bash
# ============================================================================
# CHECKPOINT.SH - Auto branch, stage, dan commit
# ============================================================================
# Cara update script ini (untuk AI):
# 1. Jalankan `git diff` dan `git diff --cached` untuk melihat semua perubahan
# 2. Jalankan `git status` untuk melihat file baru (untracked)
# 3. Identifikasi fitur utama dan fix dari diff, buat judul branch format:
#    feat/TMAIL-{DDMMYYHHMM}-{judul-kecil-yang-mewakili-keseluruhan}
# 4. Update BRANCH_NAME di bawah dengan judul yang sesuai
# 5. Tulis commit message yang mencakup:
#    - Baris pertama: ringkasan fitur utama + fix
#    - Paragraf kedua: detail poin-poin perubahan (bullet)
#    - Checkbox list untuk testing
# 6. Simpan file, user tinggal jalankan ./checkpoint.sh
# ============================================================================

TIMESTAMP=$(date +"%d%m%y%H%M")

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-backend-console-realtime-address-editor"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: tambah backend console, realtime inbox, dan editor address guest

Perubahan utama:
- app/dashboard/page.tsx + components/admin/backend-console-page.tsx: backend console baru untuk Swagger, health, domain status, incoming domains, system status, dan aksi maintenance backend
- app/api/backend/*: proxy admin ke backend untuk `system/status`, `DELETE /inbox`, `DELETE /messages/:id`, dan `DELETE /admin/domains/:domain/messages`
- components/backend-inbox-sync.tsx + app/layout.tsx: frontend sekarang subscribe ke WebSocket backend `/ws` dan memicu refresh inbox saat ada pesan baru
- components/app-sidebar.tsx + components/guest/guest-mail-workspace.tsx: inbox polling sekarang ikut merespons event realtime backend agar list pesan cepat sinkron
- services/address.service.ts: guest address generation mencoba backend `/generate` dulu lalu fallback ke generator lokal
- components/guest/guest-mail-workspace.tsx: editor address di page `/` sekarang bisa menerima `domain.com` untuk verify/add domain lalu langsung generate/update address
- components/admin/admin-session-dialog.tsx: dialog admin punya link ke backend console
- .env.local: tambahkan `ADMIN_TOKEN` agar frontend proxy admin backend memakai token yang sama dengan backend

Testing:
- [ ] `/dashboard` menampilkan backend console dan tombol ke Swagger UI bekerja
- [ ] Action admin backend bisa delete inbox, delete message by ID, dan delete domain messages
- [ ] Inbox guest dan login refresh otomatis saat backend mengirim update websocket
- [ ] Guest address generation tetap jalan saat backend `/generate` tersedia dan fallback ke lokal bila tidak
- [ ] Editor address di page `/` bisa menambah domain baru lalu langsung memakai address itu
- [ ] `ADMIN_TOKEN` frontend dan backend sudah konsisten untuk proxy admin backend
EOF
)

if git diff --cached --quiet; then
  echo ""
  echo "Branch ready: $(git branch --show-current)"
  echo "No staged changes to commit."
  exit 0
fi

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
