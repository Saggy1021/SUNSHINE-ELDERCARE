import { Button } from '@/components/ui/button'
import { submitCareAssessment } from '@/app/actions/care-assessment'
import Link from 'next/link'

export default async function CareAssessmentPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const resolvedSearchParams = await searchParams;
  if (resolvedSearchParams.success) {
    return (
      <main className="min-h-screen bg-ivory pt-32 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-gold/20">
            <h1 className="text-3xl font-display font-bold text-maroon mb-4">Request Received</h1>
            <p className="text-foreground/70 font-serif mb-8">
              Thank you for submitting your care requirements. Our care coordination team is reviewing your details and will contact you shortly with a personalized quotation and care plan.
            </p>
            <Link href="/">
              <Button className="bg-maroon hover:bg-maroon/90 text-white">Return to Homepage</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory pt-32 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-gold/20">
          <h1 className="text-3xl font-display font-bold text-maroon mb-2">Custom Care Assessment</h1>
          <p className="text-foreground/70 font-serif mb-8 border-b border-gold/30 pb-4">
            Tell us about the care requirements for your loved one. This allows us to create an accurate plan, confirm pricing, and determine applicable tax treatment based on your exact needs.
          </p>

          <form action={submitCareAssessment} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground font-display" htmlFor="customerName">Your Name *</label>
                <input id="customerName" name="customerName" required className="w-full p-3 border border-border rounded-lg bg-background" placeholder="E.g. Rajesh Kumar" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground font-display" htmlFor="elderName">Elder's Name (Optional)</label>
                <input id="elderName" name="elderName" className="w-full p-3 border border-border rounded-lg bg-background" placeholder="E.g. Sunita Kumar" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground font-display" htmlFor="customerPhone">Phone Number *</label>
                <input id="customerPhone" name="customerPhone" required type="tel" className="w-full p-3 border border-border rounded-lg bg-background" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground font-display" htmlFor="customerEmail">Email Address *</label>
                <input id="customerEmail" name="customerEmail" required type="email" className="w-full p-3 border border-border rounded-lg bg-background" placeholder="rajesh@example.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground font-display" htmlFor="city">City / Location</label>
                <input id="city" name="city" className="w-full p-3 border border-border rounded-lg bg-background" placeholder="E.g. Kolkata, South City" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground font-display" htmlFor="urgency">Urgency</label>
                <select id="urgency" name="urgency" className="w-full p-3 border border-border rounded-lg bg-background">
                  <option value="routine">Routine Planning (1-2 weeks)</option>
                  <option value="soon">Soon (Within 3-5 days)</option>
                  <option value="immediate">Immediate Need (24-48 hours)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground font-display" htmlFor="requirements">Care Requirements & Medical Notes *</label>
              <textarea 
                id="requirements" 
                name="requirements" 
                required 
                rows={4}
                className="w-full p-3 border border-border rounded-lg bg-background" 
                placeholder="Please describe the daily needs, medical conditions, mobility issues, or any specific requests..."
              ></textarea>
            </div>

            <Button type="submit" size="lg" className="w-full bg-maroon hover:bg-maroon/90 text-white text-lg mt-8">
              Submit Care Requirements
            </Button>
            
            <p className="text-center text-xs text-foreground/50 mt-4 font-serif">
              We respect your privacy. All medical information is kept strictly confidential.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
