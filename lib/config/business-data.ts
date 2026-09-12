export const businessData = {
  name: "Sunshine Elder Care",
  phone: "+91 81003 11142",
  email: "admin@sunshineeldercare.com",
  address: "Kolkata, West Bengal, India",
  socialLinks: {
    facebook: "https://www.facebook.com/sunshineeldercare/",
    whatsapp: "https://wa.me/918100311142"
  },
  programs: [
    {
      id: "erc",
      slug: "essential-response-care",
      title: "Essential Response Care (ERC)",
      description: "Immediate medical and non-medical response tailored for senior emergencies.",
      fullDescription: "Our Essential Response Care (ERC) program is designed to provide immediate assistance when every second counts. Whether it's a medical emergency, a sudden fall, or an urgent non-medical need, our 24/7 rapid response team coordinates ambulances, hospital admissions, and on-ground support to ensure your loved ones are never alone during a crisis.",
      features: ["24/7 Emergency Helpline", "Ambulance Coordination", "Hospital Admission Support", "Dedicated Care Manager"],
      image: "/images/practice-1.png"
    },
    {
      id: "truecare",
      slug: "truecare",
      title: "TrueCare",
      description: "Continuous daily assistance, emotional support, and routine medical coordination.",
      fullDescription: "TrueCare is our comprehensive companionship and daily assistance program. It focuses on the emotional and physical well-being of seniors by providing regular check-ins, assistance with daily routines, medication management, and meaningful companionship to prevent loneliness and isolation.",
      features: ["Regular Home Visits", "Medication Reminders", "Grocery & Errand Assistance", "Emotional Support & Companionship"],
      image: "/images/practice-2.png"
    },
    {
      id: "pulse-care-plus",
      slug: "pulse-care-plus",
      title: "Pulse Care+",
      description: "Advanced health tracking, doctor visits, and full-spectrum eldercare support.",
      fullDescription: "Pulse Care+ is our most advanced medical coordination program. It includes proactive health monitoring, scheduled doctor home visits, diagnostic sample collection from home, and dedicated physiotherapy sessions to maintain optimal health and mobility for seniors with chronic or recovering conditions.",
      features: ["Monthly Doctor Visits", "Home Physiotherapy", "Diagnostic Home Collection", "Digital Health Records"],
      image: "/images/practice-3.png"
    }
  ],
  pricing: [
    {
      id: "basic",
      name: "Basic Plan",
      price: 14100, // INR
      features: ["24/7 Helpline", "Monthly Doctor Visit", "Basic Diagnostics"],
    },
    {
      id: "premium",
      name: "Premium Plan",
      price: 25000, // INR
      features: ["All Basic Features", "Weekly Caregiver Visit", "Physiotherapy"],
    }
  ]
}
