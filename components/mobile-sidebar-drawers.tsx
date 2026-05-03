"use client"

import * as React from "react"
import {
  ArchiveXIcon,
  InboxIcon,
  PanelLeftIcon,
  PanelRightIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"

import AddressSection from "@/components/sidebar/address-section"
import DomainSection from "@/components/sidebar/domain-section"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Inbox", icon: InboxIcon },
  { title: "Junk", icon: ArchiveXIcon },
  { title: "Trash", icon: Trash2Icon },
]

const initialMails = [
  {
    name: "William Smith",
    subject: "Meeting Tomorrow",
    date: "09:34 AM",
    teaser: "Hi team, just a reminder about our meeting tomorrow at 10 AM.",
  },
  {
    name: "Alice Smith",
    subject: "Re: Project Update",
    date: "Yesterday",
    teaser: "Thanks for the update. The progress looks great so far.",
  },
  {
    name: "Bob Johnson",
    subject: "Weekend Plans",
    date: "2 days ago",
    teaser: "I'm thinking of organizing a team outing this weekend.",
  },
]

export function MobileInboxDrawerTrigger() {
  const [activeItem, setActiveItem] = React.useState(navItems[0])
  const [mails, setMails] = React.useState(initialMails)

  function refreshMails() {
    setMails([...initialMails].sort(() => Math.random() - 0.5))
  }

  return (
    <Drawer direction="bottom">
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-ml-1 md:hidden"
          aria-label="Buka inbox"
        >
          <PanelLeftIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[78svh] w-full">
        <DrawerHeader>
          <DrawerTitle>Inbox</DrawerTitle>
          <DrawerDescription>Daftar folder dan email masuk.</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b p-3">
            <Input placeholder="Type to search..." />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh inbox"
              onClick={refreshMails}
            >
              <RefreshCwIcon />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col">
              {mails.map((mail) => (
                <button
                  key={`${mail.name}-${mail.subject}`}
                  type="button"
                  className="flex flex-col items-start gap-2 border-b p-4 text-left text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="truncate">{mail.name}</span>
                    <span className="ml-auto shrink-0 text-xs">
                      {mail.date}
                    </span>
                  </span>
                  <span className="font-medium">{mail.subject}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {mail.teaser}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
          <nav className="flex shrink-0 flex-row items-center justify-center gap-2 border-t bg-popover p-3">
            {navItems.map((item) => (
              <Button
                key={item.title}
                type="button"
                variant={
                  activeItem.title === item.title ? "secondary" : "ghost"
                }
                size="icon-lg"
                className="flex-1"
                aria-label={item.title}
                onClick={() => setActiveItem(item)}
              >
                <item.icon />
                <span className="sr-only">{item.title}</span>
              </Button>
            ))}
          </nav>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function MobileAddressDrawerTrigger() {
  return (
    <Drawer direction="bottom">
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Buka address"
        >
          <PanelRightIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[78svh] w-full">
        <DrawerHeader>
          <DrawerTitle>Alamat Email</DrawerTitle>
          <DrawerDescription>
            Generate dan pindah disposable address.
          </DrawerDescription>
        </DrawerHeader>
        <Separator />
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full w-full">
            <DomainSection compact />
            <AddressSection compact />
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
