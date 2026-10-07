import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const faqs = [
    {
      question: "What is Sunshine Eldercare?",
      answer: "Sunshine Eldercare is a Kolkata-based eldercare organization dedicated to preserving senior dignity and providing family reassurance through structured support and a comprehensive service ecosystem."
    },
    {
      question: "Where do you operate?",
      answer: "We proudly serve seniors and their families across Kolkata, West Bengal."
    },
    {
      question: "Who can use the service?",
      answer: "Our services are designed for elderly individuals seeking companionship, medical coordination, and dependable emergency assistance in their daily lives."
    },
    {
      question: "What membership plans exist?",
      answer: "We offer Shield Shine, Semi Shield Shine, and Life Line Care plans, available in Single and Couple variants, for durations of 1, 3, 6, and 12 months."
    },
    {
      question: "What does each plan include?",
      answer: "Each plan includes tailored access to our core eldercare services, medical support network, caregiver marketplace, and 24/7 emergency assistance."
    },
    {
      question: "What is 24/7 Emergency Assistance?",
      answer: "It is immediate, round-the-clock support where a trained Sunshine executive travels to the member's location to manage medical or non-medical emergencies."
    },
    {
      question: "How does the 30-minute emergency response work?",
      answer: "We aim to have our on-ground executive reach the member's location within 30 minutes of an emergency being reported, subject to traffic and accessibility."
    },
    {
      question: "Can Sunshine assist with hospital transportation?",
      answer: "Yes, if required and authorized, our executive will assist by taking the member to a hospital."
    },
    {
      question: "Are ambulance services available?",
      answer: "Yes, ambulance services are available and rapidly coordinated through our health and medical support ecosystem."
    },
    {
      question: "Do you provide nursing?",
      answer: "Yes, nursing services are coordinated through our trusted network of healthcare partners."
    },
    {
      question: "Do you provide physiotherapy?",
      answer: "Yes, physiotherapy services are available through our health and medical support network."
    },
    {
      question: "Can diagnostics be arranged?",
      answer: "Yes, we coordinate diagnostic services including at-home sample collection through our partners."
    },
    {
      question: "Do you have doctor networks?",
      answer: "Yes, we work with a dedicated network of doctors for consultations and regular check-ups."
    },
    {
      question: "Do you have hospital networks?",
      answer: "Yes, we coordinate with a robust network of hospitals to ensure seamless care."
    },
    {
      question: "How does the caregiver marketplace work?",
      answer: "Our marketplace connects members with caregivers who have been carefully vetted through our qualification and verification system."
    },
    {
      question: "How are caregivers qualified/verified?",
      answer: "Every caregiver undergoes a rigorous qualification and verification system to ensure professionalism, capability, and empathy before they are permitted to serve our members."
    },
    {
      question: "Can family members arrange services remotely?",
      answer: "Yes, our structured support ecosystem is designed to provide complete transparency and reassurance to families living remotely."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept online payments including UPI, credit/debit cards, and net banking, as well as offline bank transfers (NEFT/RTGS)."
    },
    {
      question: "Do you accept cash?",
      answer: "No, direct cash payments are explicitly not accepted."
    },
    {
      question: "Can membership be cancelled?",
      answer: "Yes, memberships can be cancelled subject to applicable company administrative terms."
    },
    {
      question: "How are refunds handled?",
      answer: "Refund amounts and treatments depend on applicable company administrative terms. Detailed matrices are provided by company administration."
    },
    {
      question: "How long do approved refunds take?",
      answer: "Approved refunds are processed within 7 DAYS."
    }
  ]

  console.log('Seeding FAQs...')
  
  // Clear existing FAQs to avoid duplicates (optional, based on requirement)
  await prisma.faqEntry.deleteMany({})

  let order = 0
  for (const faq of faqs) {
    await prisma.faqEntry.create({
      data: {
        question: faq.question,
        answer: faq.answer,
        status: "PUBLISHED",
        sortOrder: order++,
      }
    })
  }
  
  console.log('Done seeding FAQs.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
