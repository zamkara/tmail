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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-fix-admin-cookie-mobile-bg"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="feat: fix admin session cookie dan disable background animation di mobile

Perubahan utama:
- app/api/admin/session/route.ts: cookie admin sekarang hanya `Secure` saat request benar-benar HTTPS, termasuk support `x-forwarded-proto` dari reverse proxy
- app/api/admin/session/route.ts: login admin via HTTP direct IP:port tidak lagi gagal simpan session cookie di browser
- components/shared/desktop-only.tsx: tambah wrapper client-only untuk mencegah background animation mount di mobile
- app/page.tsx: disable `ShootingStars` dan `Aurora` di mobile
- app/signin/page.tsx: disable `PixelBlast` di mobile supaya beban GPU/CPU turun

Testing:
- [ ] Login admin di HTTP `:8901` berhasil dan `/api/admin/overview` tidak lagi `401 Unauthorized`
- [ ] Login admin di HTTPS atau reverse proxy HTTPS tetap menyimpan cookie `Secure`
- [ ] Home page di mobile tidak lagi mount background animation
- [ ] Sign-in page di mobile tidak lagi mount `PixelBlast`
- [ ] Desktop tetap menampilkan background animation seperti sebelumnya
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
