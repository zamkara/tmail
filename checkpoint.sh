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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-deploy-bluegreen-clipboard-fallback"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="fix: Blue-green deploy, clipboard fallback, Containerfile port/env fixes

Perubahan utama:
- deploy.sh: blue-green deployment (temp port → health check → migrate → cleanup)
- deploy.sh: IP detection otomatis via `ip -4 addr show`, fallback hostname -I, fallback localhost
- deploy.sh: env-file (.env.local) dan TM_ prefixed vars di-pass ke container
- deploy.sh: cleanup dangling images pake podman rmi -f (force remove build cache)
- Containerfile: ENV PORT=8901 agar next start listen di port yg benar
- Containerfile: copy pnpm-lock.yaml ke runner stage, hindari pnpm auto-install
- Containerfile: CMD pake node langsung (bypass pnpm runtime install)
- hooks/use-copy.ts: fallback document.execCommand('copy') untuk non-secure context (HTTP via IP)

Testing:
- [ ] deploy.sh berjalan: build → start temp port → health check → stop old → migrate → cleanup
- [ ] podman images bersih, tidak ada dangling <none> dari intermediate build
- [ ] Copy email address berhasil via http://192.168.1.76:8901 (non-HTTPS)
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
