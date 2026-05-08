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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-lazy-mongodb-clipboard-fallback"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="fix: Lazy MONGODB_URI check, clipboard fallback for non-HTTPS, deploy.sh error visibility

Perubahan utama:
- lib/db.ts: pindah MONGODB_URI check ke dalam connectDB() agar tidak throw saat build time (module evaluation)
- hooks/use-copy.ts: fallback document.execCommand('copy') untuk non-secure context (HTTP via IP)
- deploy.sh: tampilkan non-progress lines dari podman build (error/warning tidak ketelen)
- Containerfile: ENV PORT=8901, copy pnpm-lock.yaml ke runner, CMD pake node langsung
- deploy.sh: blue-green deploy (temp port → health check → migrate → cleanup)
- deploy.sh: IP detection via ip -4 addr show / hostname -I / localhost
- deploy.sh: env-file (.env.local) dan TM_ prefixed vars di-pass ke container
- deploy.sh: cleanup dangling images pake podman rmi -f

Testing:
- [ ] next build di container berhasil tanpa MONGODB_URI
- [ ] Copy email address berhasil via http://<ip>:8901
- [ ] deploy.sh error messages kelihatan di terminal
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
