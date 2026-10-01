import { Mail, Phone, MapPin } from 'lucide-react'
import { Lotus, Mandala } from './ornaments'
import { businessData } from '@/lib/config/business-data'
import Link from 'next/link'

const columns = [
  {
    title: 'Explore',
    links: [
      { label: 'About Us', href: '/about-us' },
      { label: 'Services', href: '/services' },
      { label: 'Moments of Care', href: '/moments-of-care' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Membership', href: '/membership' },
      { label: 'FAQs', href: '/faqs' },
      { label: 'Contact Us', href: '/contact-us' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms & Conditions', href: '/legal/terms-and-conditions' },
      { label: 'Privacy Policy', href: '/legal/privacy-policy' },
      { label: 'Refund & Cancellation', href: '/legal/refund-cancellation' },
    ],
  },
]

export function Footer({ settings }: { settings?: Record<string, string> }) {
  const address = settings?.['public_address'] || businessData.address;
  const email = settings?.['public_email'] || businessData.email;
  const phone = settings?.['public_phone'] || businessData.phone;
  const footerText = settings?.['footer_text'] || 'Compassionate Care. Exceptional Companionship.';
  const name = settings?.['public_name'] || businessData.name;
  return (
    <footer className="relative overflow-hidden bg-brown text-ivory paper-texture">
      {/* Lotus watermark */}
      <Mandala className="pointer-events-none absolute -bottom-24 left-1/2 h-96 w-96 -translate-x-1/2 text-gold opacity-[0.06]" />

      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Lotus className="h-8 w-auto text-gold" />
              <span className="font-display text-2xl font-bold tracking-[0.18em] text-ivory">
                {name.toUpperCase()}
              </span>
            </div>
            <p className="mt-5 max-w-sm font-serif text-lg leading-relaxed text-ivory/70">
              Providing comprehensive, compassionate care and companionship for seniors.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ivory/70">
              <li className="flex items-center gap-3">
                <MapPin className="size-4 text-gold" /> {address}
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-gold" /> {email}
              </li>
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone className="size-4 text-gold" /> {phone}
                </li>
              )}
            </ul>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gold">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-serif text-base text-ivory/70 transition-colors hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-ivory/15 pt-8">
          <p className="text-center font-serif text-xl italic text-gold">
            {footerText}
          </p>
          <p className="text-center text-sm text-ivory/50">
            © {new Date().getFullYear()} {name}. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
