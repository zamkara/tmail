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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-fix-deploy-containerfile"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="feat: fix deploy script dan containerfile

Perubahan utama:
- deploy.sh: fix PIPESTATUS dengan temp file supaya build failure terdeteksi benar dari subshell pipe
- deploy.sh: filter build log noise (pnpm Progress/WARN/Done) jadi spinner, error tetap tampil
- deploy.sh: tambah per-phase timer (build, health check, swap, final check, cleanup) dan summary report di akhir
- deploy.sh: tambah final health check dengan fail() supaya tidak silent jika container tidak naik
- deploy.sh: cleanup diurutkan ulang — buildah working containers dihapus duluan sebelum image, supaya rmi tidak gagal karena image masih dipakai
- deploy.sh: base image (alpine:edge) tidak dihapus lagi supaya layer cache persist antar deploy
- deploy.sh: auto-detect Containerfile atau Dockerfile dengan fallback
- deploy.sh: tambah --restart=unless-stopped di container final
- Containerfile: tambah --mount=type=cache,id=pnpm-store untuk persist pnpm store antar build (dari 30+ menit → ~9 menit)
- Containerfile: tambah COPY pnpm-lock.yaml dan --frozen-lockfile supaya tidak resolve ulang tiap build
- Containerfile: hapus stage build-deps yang redundant, builder langsung install sendiri
- Containerfile: gabung npm install -g npm@latest pnpm jadi satu layer

Testing:
- [ ] Build pertama selesai dan image tmail:latest muncul
- [ ] Build kedua lebih cepat karena pnpm store di-cache
- [ ] Summary report muncul di akhir dengan durasi tiap phase
- [ ] Setelah deploy, podman images hanya tmail:latest dan alpine:edge
- [ ] Tidak ada buildah working-container nyangkut di podman ps -a --external
- [ ] Container tmail running di port 8901
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
