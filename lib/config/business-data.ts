export const businessData = {
  name: "Sunshine Eldercare",
  phone: "",
  email: "INFO.SUNSHINEELDERCARE@GMAIL.COM",
  address: "1/67 NAKTALA, N.S.C BOSE ROAD, KOLKATA - 700047, WEST BENGAL, INDIA",
  socialLinks: {
    facebook: "",
    whatsapp: ""
  },
  programs: [
    {
      id: "shield-shine",
      slug: "shield-shine",
      title: "Shield Shine",
      description: "Basic emergency and telephonic support.",
      fullDescription: "Our Shield Shine program is designed to provide immediate assistance when every second counts. Whether it's a medical emergency, a sudden fall, or an urgent non-medical need, our 24/7 rapid response team coordinates ambulances, hospital admissions, and on-ground support to ensure your loved ones are never alone during a crisis.",
      features: ["24/7 Emergency Helpline", "Ambulance Coordination", "Hospital Admission Support", "Dedicated Care Manager"],
      image: "/images/practice-1.png"
    },
    {
      id: "semi-shield-shine",
      slug: "semi-shield-shine",
      title: "Semi Shield Shine",
      description: "Emergency support plus physical care visits.",
      fullDescription: "Semi Shield Shine is our comprehensive companionship and daily assistance program. It focuses on the emotional and physical well-being of seniors by providing regular check-ins, assistance with daily routines, medication management, and meaningful companionship to prevent loneliness and isolation.",
      features: ["Regular Home Visits", "Medication Reminders", "Grocery & Errand Assistance", "Emotional Support & Companionship"],
      image: "/images/practice-2.png"
    },
    {
      id: "life-line-care",
      slug: "life-line-care",
      title: "Life Line Care",
      description: "Complete eldercare support with comprehensive coverage.",
      fullDescription: "Life Line Care is our most advanced medical coordination program. It includes proactive health monitoring, scheduled doctor home visits, diagnostic sample collection from home, and dedicated physiotherapy sessions to maintain optimal health and mobility for seniors with chronic or recovering conditions.",
      features: ["Monthly Doctor Visits", "Home Physiotherapy", "Diagnostic Home Collection", "Digital Health Records"],
      image: "/images/practice-3.png"
    }
  ],
  pricing: [
    {
      id: "shield-shine",
      name: "Shield Shine",
      price: 5664, // INR per month Single
      features: ["24/7 Helpline", "Emergency Support", "Care Manager"],
    },
    {
      id: "semi-shield-shine",
      name: "Semi Shield Shine",
      price: 10030, // INR per month Single
      features: ["All Shield Shine Features", "Physical Care Visits"],
    },
    {
      id: "life-line-care",
      name: "Life Line Care",
      price: 14160, // INR per month Single
      features: ["All Semi Shield Shine Features", "Comprehensive Coverage"],
    }
  ]
}
