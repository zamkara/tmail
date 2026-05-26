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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-guest-email-share-status-footer"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: improve guest email sharing, domain status, and footer

Main changes:
- redesign guest email card with heading, share URL, compact domain picker, generate icon, and copy icon
- add short guest email URL support such as `/name@domain.com`
- keep invalid routes on the guest landing page instead of showing a 404 page
- copy the short guest email URL from the URL label
- apply shared guest email URLs to the active guest inbox and clean the browser URL back to `/`
- keep pasted/custom guest emails visible even when the domain is private or MX is not ready
- show red guest status messages for private, unavailable, or unsupported domains
- merge app-domain visibility into `/api/domains/status` so private app domains do not appear approved for guests
- add atomic active-address persistence for URL-based guest addresses
- add global footer text: `© 2026 Premiumisme. All rights reserved.`

Testing:
- [x] `pnpm typecheck`
- [ ] Guest short email URL opens the guest page and applies the requested email
- [ ] Guest short email URL refresh keeps the requested email active
- [ ] Invalid guest URL redirects to the guest landing page
- [ ] Private and unavailable domains show red status text
- [ ] Valid public domains show email approved status
- [ ] Guest URL label copies the short URL
- [ ] Footer appears on all pages as text only
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
