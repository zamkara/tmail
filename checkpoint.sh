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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-inbox-realtime-domain-status-cleanup"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: perbaiki realtime inbox, domain status, dan cleanup pesan guest

Perubahan utama:
- services/backend.service.ts: perbaiki builder URL backend agar path `/api/v1` tidak hilang untuk HTTP API, dan arahkan WebSocket default ke root `/ws`
- app/api/inbox/* + services/mail.service.ts: gunakan builder backend yang konsisten untuk inbox list dan detail message
- components/backend-inbox-sync.tsx: kirim status koneksi WebSocket ke komponen inbox agar polling bisa menyesuaikan kondisi realtime
- components/app-sidebar.tsx + components/guest/guest-mail-workspace.tsx: polling inbox skip saat tab hidden/offline, fallback 5 detik saat WebSocket mati, dan 60 detik saat WebSocket connect
- components/guest/guest-mail-workspace.tsx: pisahkan switch Wildcard Domain dari tombol New Address; wildcard default off dan hanya memengaruhi format address saat generate
- app/api/domains/status/route.ts + components/guest/guest-mail-workspace.tsx: tampilkan status domain/subdomain aktif, approved, active, MX valid, dan uptime dari backend
- app/api/inbox/route.ts + components/guest/guest-mail-workspace.tsx: tambahkan tombol Delete All Message yang proxy ke backend dengan token server-side
- app/layout.tsx: ganti Google Sans Flex ke Geist untuk menghilangkan warning fallback font Next.js
- lib/admin-settings.ts + models/admin-settings.model.ts: naikkan default/minimum public inbox refresh interval ke 30 detik

Testing:
- [x] `pnpm typecheck`
- [ ] WebSocket connect ke `wss://api.thvuinin.my.id/ws`
- [ ] Inbox guest dan login refresh dari event WebSocket tanpa harus manual refresh
- [ ] New Address dengan Wildcard Domain off menghasilkan `local@domain`
- [ ] New Address dengan Wildcard Domain on menghasilkan `local@sub.domain`
- [ ] Status domain tampil setelah address aktif berubah
- [ ] Delete All Message menghapus semua pesan pada address aktif
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
