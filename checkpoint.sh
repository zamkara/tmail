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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-lazy-mongodb-fresh-base"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="fix: Lazy MONGODB_URI check, clipboard fallback, fresh base image per deploy

Perubahan utama:
- lib/db.ts: pindah MONGODB_URI check ke dalam connectDB() agar tidak throw saat build time
- app/api/auth/login/route.ts: cookie secure flag deteksi dari req.url, bukan NODE_ENV
- app/api/auth/register/route.ts: same fix
- hooks/use-copy.ts: fallback document.execCommand('copy') untuk non-secure context (HTTP via IP)
- deploy.sh: hapus base image setiap deploy agar selalu pull fresh
- deploy.sh: tampilkan non-progress lines dari podman build
- Containerfile: ENV PORT=8901, copy pnpm-lock.yaml ke runner, CMD pake node langsung
- deploy.sh: blue-green deploy, IP detection, env-file pass, cleanup dangling images

Testing:
- [ ] Login → refresh → masih login, bukan guest lagi
- [ ] next build di container berhasil tanpa MONGODB_URI
- [ ] Copy clipboard berhasil via HTTP (non-HTTPS)
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
