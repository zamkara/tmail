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

BRANCH_NAME="feat/TMAIL-${TIMESTAMP}-sync-guest-inbox-address-flow"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

git add -A

COMMIT_MSG=$(cat <<'EOF'
feat: sinkronkan flow guest dan inbox address management

Perubahan utama:
- app/api/addresses/route.ts: generate address user login sekarang merotasi `Alamat Aktif` saat slot `maxAddressesPerUser` penuh, bukan melempar `Address limit reached`
- app/api/addresses/route.ts + services/address.service.ts: response create address sekarang mengembalikan snapshot `activeAddresses` supaya UI langsung sinkron setelah backend menonaktifkan address lama
- stores/address.store.ts: `setAddresses` sekarang hanya menyimpan address terbaru per domain agar list `Alamat Aktif` di `/inbox` tidak menumpuk riwayat address lama
- components/guest/domain-address-switcher.tsx dan components/guest/guest-mail-workspace.tsx: guest `/` sekarang hanya memakai domain `public`, termasuk untuk random/auto generate
- components/guest/inbox-cta-button.tsx + components/guest/guest-navbar.tsx: tombol `Login/Add Domain` dipindah ke navbar dan `DomainAddressSwitcher` dipindah ke header mobile
- components/guest/guest-mail-workspace.tsx: ukuran teks address editor mobile dikembalikan ke ukuran default
- components/admin/admin-session-dialog.tsx: badge tameng floating hanya tampil saat sesi admin aktif
- endpoint admin/settings/domain/user/voucher/address dan inbox state: opsi Mongoose `new: true` diganti ke `returnDocument: "after"`
- toast create address di sidebar/guest sekarang menampilkan pesan backend yang sebenarnya, bukan pesan generik

Testing:
- [ ] Guest page `/` hanya menampilkan domain `public`, bukan domain `private`
- [ ] Navbar guest mobile menampilkan `DomainAddressSwitcher` di tengah dan CTA `Login/Add Domain` sebelum theme toggle
- [ ] `Alamat Aktif` di `/inbox` hanya menyisakan satu address terbaru per domain
- [ ] Saat slot aktif penuh, generate address baru menggusur address aktif lama tanpa `Address limit reached`
- [ ] Setelah generate address baru saat slot penuh, list `Alamat Aktif` langsung sinkron tanpa reload
- [ ] Badge admin floating hanya muncul saat sesi admin aktif
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
