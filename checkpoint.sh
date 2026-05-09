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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-pixelblast-decryptedtext-navbar-logo"

git checkout -b "$BRANCH_NAME"

git add -A

COMMIT_MSG="feat: PixelBlast background, DecryptedText animation, navbar logo, inbox refactor

Perubahan utama:
- components/shared/pixel-blast.tsx + .css: WebGL pixel shader background (React Bits)
- components/shared/decrypted-text.tsx: Decrypt animation component (React Bits)
- components/guest/guest-navbar.tsx: Inline SVG logo (ic_tmail) di kiri, justify-between layout
- public/ic_tmail.svg: fill #000000 jadi currentColor biar ngikut theme
- app/page.tsx: PikselBlast ganti Particles, main flex-col + center
- app/signin/page.tsx: PikselBlast background, bg-background
- components/guest/guest-mail-workspace.tsx: Refactor inbox (expand/collapse, Card layout, search, decrypted address text, willcard switch)
- components/guest/domain-address-switcher.tsx: Dialog redesain (search bar, Login/Add Domain button, hideGenerate prop)
- components/guest/guest-mail-list-card.tsx: Gradient bg + hover effect
- components/guest/guest-mail-preview-card.tsx: backdrop-blur
- components/mobile-sidebar-drawers.tsx: Restructure, add login check + fetch per address
- components/shared/copy-button.tsx: Styling adjustment
- components/theme-provider.tsx: Guard event.key undefined di hotkey
- components/ui/sidebar.tsx: Fix Tailwind v4 calc() warnings (left-[calc...] -> -left-(--...))
- stores/address.store.ts: Add addAddress, updateAddress, removeExpired, setActiveAddress
- package.json: Add motion, three, postprocessing, @types/three dependencies

Testing:
- [ ] Guest page tampil dengan PixelBlast background
- [ ] DecryptedText animasi saat ganti address
- [ ] Navbar logo muncul di kiri, theme toggle di kanan
- [ ] Domain dialog login/add domain button animation
- [ ] Inbox expand/collapse works
- [ ] Signin page has PixelBlast background
- [ ] Theme hotkey tidak error di signin page
"

git commit -m "$COMMIT_MSG"

echo ""
echo "Branch created: $BRANCH_NAME"
echo "Commit successful."
