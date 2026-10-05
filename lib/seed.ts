import { ProfileSchema, type Profile } from "./types";

/**
 * First business created on an empty database. Every value below is a
 * PLACEHOLDER — replace rooms, rates, contacts and FAQs from /admin.
 */
export const seedProfile: Profile = ProfileSchema.parse({
  name: "The Stone Guest House",
  tagline: "Quiet, comfortable stays in the heart of Maseru.",
  about:
    "A family-run guest house for business travellers, NGO staff and visitors who want a calm, " +
    "secure and well-connected base in Maseru.",
  brandColor: "#8a5a2b",
  heroImageUrl: "",
  currency: "M",
  city: "Maseru, Lesotho",
  address: "",
  directions:
    "A short drive from the city centre and Moshoeshoe I International Airport. " +
    "Send us your arrival details on WhatsApp and we'll share a pin.",
  mapUrl: "",
  whatsapp: "",
  phone: "",
  email: "",
  ownerEmail: "",
  bookingUrl: "",
  checkIn: "14:00",
  checkOut: "10:00",
  rooms: [
    { name: "Standard Double", sleeps: 2, rate: 650, description: "Ensuite, WiFi, secure parking.", imageUrl: "" },
    { name: "Twin Room", sleeps: 2, rate: 700, description: "Two single beds, ideal for colleagues.", imageUrl: "" },
    { name: "Family Room", sleeps: 4, rate: 1100, description: "One double and two single beds.", imageUrl: "" },
  ],
  amenities: [
    "Free WiFi",
    "Secure off-street parking",
    "Breakfast on request",
    "Hot water and backup power",
  ],
  policies: [
    "Check-in from 14:00, check-out by 10:00. Early or late by arrangement.",
    "Free cancellation up to 48 hours before arrival.",
    "A 50% deposit confirms your booking.",
    "No smoking indoors.",
  ],
  faqs: [
    { q: "Do you have WiFi?", a: "Yes, free WiFi throughout. A connection voucher is given at check-in." },
    { q: "Is there secure parking?", a: "Yes, secure off-street parking at no extra charge." },
  ],
  aiNotes: "Tone: warm, professional and concise. Most guests are business travellers and NGO staff.",
  greeting: "Hi! I can answer questions about rooms, rates and directions, or help you request a booking.",
});
