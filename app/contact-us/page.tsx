import { ContactCommunity } from "@/components/yoga/contact-community"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Us | Sunshine Elder Care",
  description: "Reach out to us for immediate care, inquiries about our membership plans, or general questions.",
}

export default function ContactUsPage() {
  return (
    <main className="relative overflow-x-clip min-h-screen pt-24">
      <ContactCommunity />
    </main>
  )
}