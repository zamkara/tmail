"use client"

import Image from "next/image"
import Link from "next/link"

import AddDomainDialog from "@/components/sidebar/add-domain-dialog"
import LoginAddDomainButton from "@/components/guest/login-add-domain-button"
import DomainAddressSwitcher from "@/components/guest/domain-address-switcher"
import ModeToggle from "@/components/shared/mode-toggle"

export default function GuestNavbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center">
      <nav className="mx-auto grid size-full max-w-4xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:flex sm:px-6 lg:px-0">
        <Link href="/" className="shrink-0">
          <Image
            src="/ic_tmail.svg"
            alt="tmail"
            width={40}
            height={40}
            className="size-10 shrink-0"
            priority
          />
        </Link>
        <div className="min-w-0 justify-self-end sm:hidden">
          <DomainAddressSwitcher hideGenerate />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:ml-auto">
          <AddDomainDialog
            trigger={
              <LoginAddDomainButton
                mobileIconOnly
                className="px-2.5 sm:px-4"
              />
            }
            showSignInLink
          />
          <ModeToggle />
        </div>
      </nav>
    </header>
  )
}
