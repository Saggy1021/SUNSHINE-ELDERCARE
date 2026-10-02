import { Reveal } from './reveal'
import { Eyebrow } from './ornaments'
import { ShieldCheck, Award, FileText, CheckCircle } from 'lucide-react'

export function Credentials() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 bg-card">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="text-center">
          <Eyebrow>Trust & Verification</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-4xl text-primary">
            Credentials & Certifications
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-serif text-lg leading-relaxed text-foreground/80">
            Sunshine Eldercare is a verified, certified organization committed to maintaining the highest standards of eldercare service.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={100} className="rounded-2xl border border-gold/30 bg-background p-6 shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">KMC Enlistment</h3>
            <p className="mt-2 text-sm text-foreground/70 font-serif">
              <span className="font-semibold block text-foreground">C.E. No. 0381 8410 0702 (PERMANENT)</span>
              Office of Eldercare Service
            </p>
          </Reveal>

          <Reveal delay={200} className="rounded-2xl border border-gold/30 bg-background p-6 shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">Udyam Registration</h3>
            <p className="mt-2 text-sm text-foreground/70 font-serif">
              <span className="font-semibold block text-foreground">UDYAM-WB-10-0225763</span>
              Micro Enterprise (Services)
              <br />
              NIC: 88100
            </p>
          </Reveal>

          <Reveal delay={300} className="rounded-2xl border border-gold/30 bg-background p-6 shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold mb-4">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">ISO Certification</h3>
            <p className="mt-2 text-sm text-foreground/70 font-serif">
              <span className="font-semibold block text-foreground">ISO 9001:2015 Certified</span>
              Audittech Certification Pvt. Ltd.
            </p>
          </Reveal>

          <Reveal delay={400} className="rounded-2xl border border-gold/30 bg-background p-6 shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold mb-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">Quality Management</h3>
            <p className="mt-2 text-sm text-foreground/70 font-serif">
              <span className="font-semibold block text-foreground">QMS CAB#119012</span>
              Ensuring consistent service quality and continuous improvement.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
