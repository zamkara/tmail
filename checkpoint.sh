#!/bin/bash
# ============================================================================
# TMAIL.SH - Auto branch, stage, dan commit
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
# 6. Simpan file, user tinggal jalankan ./tmail.sh
# ============================================================================

TIMESTAMP=$(date +"%d%m%y%H%M")

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-guest-page-aurora-domain-refactor"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="feat: Guest page with aurora effect, domain API refactor, purple theme

Perubahan utama:
- app/page.tsx: ganti redirect /inbox jadi guest page dengan aurora + email workspace
- stores/aurora.store.ts: store untuk trigger aurora 8 detik saat email baru
- components/guest/: komponen guest page (navbar, mail workspace, mail list, mail preview)
- components/shared/aurora.tsx: WebGL aurora background component
- app/api/domains/route.ts: refactor getSystemDomains() dengan timeout + error handling
- app/globals.css: ubah hue dari 277 ke 310 (purple tone)
- services/domain.service.ts: perbaikan fetch domain service
- proxy.ts: fix proxy

Testing:
- [ ] Guest page tampil tanpa login
- [ ] Aurora muncul 8 detik saat email baru masuk
- [ ] Domain list fallback ke system domains jika API timeout
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
