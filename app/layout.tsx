import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"

// Import AWS configuration
import "@/lib/aws-config"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "EcoSync - Intelligent Waste Management Platform",
  description: "Connecting Citizens, Vendors, and Industries for efficient waste management with AWS",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
