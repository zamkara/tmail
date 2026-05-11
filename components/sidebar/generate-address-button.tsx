"use client"

import { useState } from "react"
import { SparklesIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { generateAddress } from "@/services/address.service"
import { useAddressStore } from "@/stores/address.store"
import { useInboxStore } from "@/stores/inbox.store"
import { useAuthStore } from "@/stores/auth.store"

interface GenerateAddressButtonProps {
  domainId: string
  domainName: string
}

export default function GenerateAddressButton({
  domainId,
  domainName,
}: GenerateAddressButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const addresses = useAddressStore((state) => state.addresses)
  const addAddress = useAddressStore((state) => state.addAddress)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const resetInbox = useInboxStore((s) => s.resetInbox)
  const user = useAuthStore((s) => s.user)

  async function handleGenerate() {
    const existingAddress = addresses.find(
      (address) =>
        address.domainId === domainId &&
        new Date(address.expiresAt) > new Date()
    )

    if (existingAddress) {
      setActiveAddress(existingAddress.id)
      router.push(`/inbox/${existingAddress.id}`)
      return
    }

    setIsLoading(true)

    try {
      const address = await generateAddress(domainId, domainName, !!user)
      resetInbox()
      addAddress(address)
      setActiveAddress(address.id)
      toast.success("Email address created")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create email address"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Create address from ${domainName}`}
      disabled={isLoading}
      onClick={() => void handleGenerate()}
    >
      {isLoading ? <Spinner /> : <SparklesIcon />}
    </Button>
  )
}
