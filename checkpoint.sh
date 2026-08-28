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

BRANCH_NAME="fix/TMAIL-${TIMESTAMP}-universal-root-domain-filter"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
fix: hide subdomains from guest and user domain lists

Main changes:
- add universal registrable-domain detection with the Public Suffix List through `tldts`
- hide subdomains from guest and logged-in user domain selectors, including domains such as `aad.rmjhtgiq.web.id`
- filter domain API responses and system-domain synchronization before domains are stored or displayed
- normalize persisted browser domain data during Zustand hydration so old subdomains disappear automatically
- keep admin domain snapshots limited to root domains
- add the `tldts` dependency and lockfile entry for consistent local and production builds

Testing:
- [x] `pnpm typecheck`
- [x] Verify `aad.rmjhtgiq.web.id` resolves to registrable domain `rmjhtgiq.web.id`
- [ ] Verify guest domain list hides subdomains after a fresh load
- [ ] Verify logged-in domain list hides subdomains after refresh and persisted-store hydration
- [ ] Verify `/api/domains` and admin domain snapshot return root domains only
- [ ] Verify production build installs `tldts` from `pnpm-lock.yaml`
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
