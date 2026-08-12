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

BRANCH_NAME="fix/TMAIL-${TIMESTAMP}-supported-domain-dedupe"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A -- ':!/.pnpm-store' ':!/.pnpm-store/**'

COMMIT_MSG=$(cat <<'EOF'
fix: filter unsupported domains and dedupe domain lists

Main changes:
- validate backend `/random-domain` candidates against `/domains/status` before saving system domains
- mark existing unsupported system domains as unverified/banned so they disappear from public domain lists
- reject custom/admin domain registration when backend status is not active, approved, and MX-valid
- stop guest auto-generation from reusing a domain after it is detected as unsupported
- dedupe domains by normalized name in the API response, persisted domain store, and guest domain selector

Testing:
- [x] `./node_modules/.bin/tsc --noEmit`
- [x] `./node_modules/.bin/next build`
- [x] Domain selector no longer shows duplicate names after store/API dedupe
- [ ] Verify live production domain sync removes unsupported domains after backend status is healthy
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
