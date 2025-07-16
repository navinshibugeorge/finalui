"use client"

import type React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Home,
  Truck,
  Factory,
  BarChart3,
  Settings,
  LogOut,
  User,
  Recycle,
  Plus,
  History,
  Wallet,
  Users,
  MapPin,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  userRole: string
}

export function DashboardLayout({ children, title, userRole }: DashboardLayoutProps) {
  const { user, signOut } = useAuth()

  const getMenuItems = () => {
    const baseItems = [
      { icon: Home, label: "Dashboard", href: "#" },
      { icon: BarChart3, label: "Analytics", href: "#" },
      { icon: Settings, label: "Settings", href: "#" },
    ]

    switch (userRole) {
      case "citizen":
        return [
          { icon: Home, label: "Dashboard", href: "#" },
          { icon: Plus, label: "New Request", href: "#" },
          { icon: History, label: "History", href: "#" },
          { icon: Wallet, label: "Wallet", href: "#" },
          { icon: Settings, label: "Settings", href: "#" },
        ]
      case "vendor":
        return [
          { icon: Home, label: "Dashboard", href: "#" },
          { icon: Truck, label: "Pickups", href: "#" },
          { icon: MapPin, label: "Routes", href: "#" },
          { icon: BarChart3, label: "Analytics", href: "#" },
          { icon: Settings, label: "Settings", href: "#" },
        ]
      case "industry":
        return [
          { icon: Home, label: "Dashboard", href: "#" },
          { icon: Factory, label: "Bins", href: "#" },
          { icon: Truck, label: "Pickups", href: "#" },
          { icon: BarChart3, label: "Reports", href: "#" },
          { icon: Settings, label: "Settings", href: "#" },
        ]
      case "admin":
        return [
          { icon: Home, label: "Dashboard", href: "#" },
          { icon: Users, label: "Users", href: "#" },
          { icon: Truck, label: "Pickups", href: "#" },
          { icon: Factory, label: "Industries", href: "#" },
          { icon: BarChart3, label: "Analytics", href: "#" },
          { icon: Settings, label: "Settings", href: "#" },
        ]
      default:
        return baseItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b">
            <div className="flex items-center space-x-2 px-4 py-2">
              <Recycle className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold">EcoSync</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild>
                    <a href={item.href} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{user?.email}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
