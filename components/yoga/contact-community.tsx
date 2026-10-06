'use client'

import { useState, type FormEvent, type SVGProps } from 'react'
import { Calendar, Send, Check } from 'lucide-react'
import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import { submitContactForm } from '@/app/actions/contact'

const contactInfo = {
  address: "1/67 NAKTALA, N.S.C BOSE ROAD, KOLKATA - 700047, WEST BENGAL, INDIA",
  email: "INFO.SUNSHINEELDERCARE@GMAIL.COM",
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.8-.1-1.6-.15-2.4-.15-2.4 0-4.05 1.45-4.05 4.15v2.3H7.5V13h2.75v8h3.25z" />
    </svg>
  )
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18.05 5.6 12 5.6 12 5.6s-6.05 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.85.5 7.9.5 7.9.5s6.05 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22.4 12 31 31 0 0 0 22 8.2zM10 15V9l5.2 3-5.2 3z" />
    </svg>
  )
}

const socials = [
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: FacebookIcon, label: 'Facebook' },
  { Icon: YoutubeIcon, label: 'YouTube' },
]

export function ContactCommunity() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await submitContactForm(formData)
    setLoading(false)
    if (result.success) {
      setSent(true)
    } else {
      alert("Failed to send message. Please check the fields.")
    }
  }

  const onSubscribe = (e: FormEvent) => {
    e.preventDefault()
    setSubscribed(true)
  }

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-secondary/50 py-24 paper-texture sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>We're Here for You</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">
            Reach Out to Us
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty font-serif text-lg text-foreground/75">
            Whether you need immediate care, have questions about our plans, or simply want to speak with a counselor — we are here to help.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          {/* Contact form */}
          <Reveal className="lg:col-span-3">
            <form
              onSubmit={onSubmit}
              className="h-full rounded-[1.75rem] border border-gold/40 bg-card p-7 shadow-lg sm:p-9"
            >
              <h3 className="font-display text-2xl font-bold">Send a message</h3>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Your name" id="name" placeholder="Maya Sharma" />
                <Field
                  label="Email"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                />
              </div>
              <div className="mt-5">
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-foreground/80"
                >
                  How can we guide you?
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  placeholder="I would love to learn more about the TrueCare plan for my parents..."
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md"
                />
              </div>
              <button
                type="submit"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-medium text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:scale-100"
                disabled={sent || loading}
              >
                {sent ? (
                  <>
                    <Check className="size-4" /> Message received
                  </>
                ) : loading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="size-4" /> Send Message
                  </>
                )}
              </button>
            </form>
          </Reveal>

          {/* Side column */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* Newsletter */}
            <Reveal delay={100}>
              <div className="rounded-[1.75rem] bg-brown p-7 text-ivory shadow-lg">
                <h3 className="font-display text-xl font-bold text-ivory">
                  Subscribe to Updates
                </h3>
                <p className="mt-2 font-serif text-base text-ivory/75">
                  Receive eldercare tips, health advice, and community news.
                </p>
                <form onSubmit={onSubscribe} className="mt-5 flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Your email"
                    className="w-full rounded-full border border-ivory/25 bg-ivory/10 px-4 py-2.5 text-sm text-ivory placeholder:text-ivory/50 outline-none transition-all duration-300 hover:border-ivory/40 focus:border-gold focus:ring-1 focus:ring-gold/50"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-brown transition-all duration-300 hover:bg-ivory hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  >
                    {subscribed ? <Check className="size-4" /> : 'Join'}
                  </button>
                </form>
                <div className="mt-6 flex gap-3">
                  {socials.map(({ Icon, label }) => (
                    <a
                      key={label}
                      href="#"
                      aria-label={label}
                      className="flex size-10 items-center justify-center rounded-full border border-ivory/25 text-ivory transition-all duration-300 hover:border-gold hover:text-gold hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
                    >
                      <Icon className="size-5" />
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Contact Details */}
            <Reveal delay={180}>
              <div className="rounded-[1.75rem] border border-gold/40 bg-card p-7 shadow-lg">
                <h3 className="font-display text-xl font-bold mb-4">
                  Head Office
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-serif text-sm font-semibold text-primary">Address</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {contactInfo.address}
                    </p>
                  </div>
                  <div>
                    <p className="font-serif text-sm font-semibold text-primary">Email</p>
                    <a href={`mailto:${contactInfo.email.toLowerCase()}`} className="text-sm text-gold hover:underline mt-1 block">
                      {contactInfo.email}
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  id,
  type = 'text',
  placeholder,
}: {
  label: string
  id: string
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-foreground/80"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 font-serif text-base outline-none transition-all duration-300 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md"
      />
    </div>
  )
}
