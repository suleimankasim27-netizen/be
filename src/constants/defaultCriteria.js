export const DEFAULT_STARTUP_PITCH_CRITERIA = [
  {
    name: "Problem & Solution",
    description: "Clear pain point, unique value proposition, and customer validation.",
    maxPoints: 25,
    allowedScores: [0, 5, 10, 15, 20, 25],
    order: 1,
    active: true,
  },
  {
    name: "Market & Traction",
    description:
      "Defined TAM/SAM/SOM, concrete traction such as LOIs, users, revenue, and GTM strategy.",
    maxPoints: 20,
    allowedScores: [0, 4, 8, 12, 16, 20],
    order: 2,
    active: true,
  },
  {
    name: "Business Model & Financials",
    description: "Monetization model, realistic unit economics, and clear 3-5 year projections.",
    maxPoints: 20,
    allowedScores: [0, 4, 8, 12, 16, 20],
    order: 3,
    active: true,
  },
  {
    name: "Team & Competitive Advantage",
    description: "Founder-market fit, execution capability, and clear moat/defensibility.",
    maxPoints: 20,
    allowedScores: [0, 4, 8, 12, 16, 20],
    order: 4,
    active: true,
  },
  {
    name: "Pitch Quality & Q&A",
    description: "Storytelling, slide design, timekeeping, and confident responses during Q&A.",
    maxPoints: 15,
    allowedScores: [0, 3, 6, 9, 12, 15],
    order: 5,
    active: true,
  },
];

export const EVENT_STATUSES = ["Draft", "Active", "Completed", "Archived"];
