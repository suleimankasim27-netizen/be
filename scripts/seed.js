/**
 * Development seed only. Do not use these credentials in production.
 * Demo Director: director@example.com / ChangeMe123!
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../src/config/env.js";
import {
  Director,
  Event,
  Evaluator,
  Team,
  Criterion,
  Assignment,
  Evaluation,
} from "../src/models/index.js";
import { DEFAULT_STARTUP_PITCH_CRITERIA } from "../src/constants/defaultCriteria.js";
import { issueEvaluatorToken } from "../src/services/evaluatorService.js";

const teamsSeed = [
  { name: "GreenTech Africa", pitchNumber: 1, members: "Amina Diallo, Kwame Mensah", description: "Clean energy microgrids for rural communities.", website: "https://example.com/greentech" },
  { name: "FinPay", pitchNumber: 2, members: "Sarah Okonkwo", description: "Cross-border payments for SMEs.", website: "https://example.com/finpay" },
  { name: "AgroLink", pitchNumber: 3, members: "Joseph Mutua, Lisa Ncube", description: "Marketplace connecting smallholder farmers to buyers.", website: "https://example.com/agrolink" },
  { name: "HealthPlus", pitchNumber: 4, members: "Dr. Priya Sharma", description: "Telehealth for underserved clinics.", website: "https://example.com/healthplus" },
  { name: "EduTech", pitchNumber: 5, members: "Marcus Chen", description: "Adaptive learning for secondary schools.", website: "https://example.com/edutech" },
  { name: "AquaPure", pitchNumber: 6, members: "Elena Rossi", description: "Low-cost water purification systems.", website: "https://example.com/aquapure" },
  { name: "LogiChain", pitchNumber: 7, members: "David Kim", description: "Last-mile logistics for African cities.", website: "https://example.com/logichain" },
  { name: "SolarNest", pitchNumber: 8, members: "Fatima Al-Hassan", description: "Pay-as-you-go solar home systems.", website: "https://example.com/solarnest" },
  { name: "MedSupply", pitchNumber: 9, members: "Oliver Brooks", description: "Cold-chain tracking for vaccines.", website: "https://example.com/medsupply" },
  { name: "CraftHub", pitchNumber: 10, members: "Nia Williams", description: "Digital storefronts for artisan cooperatives.", website: "https://example.com/crafthub" },
];

const judgesSeed = [
  { name: "John Smith", email: "john.smith@example.com" },
  { name: "Sarah Williams", email: "sarah.williams@example.com" },
  { name: "Michael Brown", email: "michael.brown@example.com" },
  { name: "Aisha Rahman", email: "aisha.rahman@example.com" },
  { name: "Daniel Okeke", email: "daniel.okeke@example.com" },
];

function pickScore(allowed) {
  return allowed[Math.floor(Math.random() * allowed.length)];
}

async function seed() {
  await mongoose.connect(env.mongodbUri);
  console.log("Connected. Clearing existing data...");

  await Promise.all([
    Director.deleteMany({}),
    Event.deleteMany({}),
    Evaluator.deleteMany({}),
    Team.deleteMany({}),
    Criterion.deleteMany({}),
    Assignment.deleteMany({}),
    Evaluation.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const director = await Director.create({
    name: "Demo Director",
    email: "director@example.com",
    passwordHash,
  });

  const event = await Event.create({
    name: "2026 Startup Pitch Competition",
    description: "A flagship pitch competition for early-stage startups across Africa and beyond.",
    date: new Date("2026-03-14"),
    location: "Innovation Hub, Lagos",
    status: "Active",
    evaluationStartDate: new Date("2026-03-01"),
    evaluationEndDate: new Date("2026-03-21"),
    directorId: director._id,
    settings: {
      allowEvaluatorEdits: false,
      requireFeedback: false,
      includeIncompleteInRankings: false,
      evaluationOpen: true,
    },
  });

  const criteria = await Criterion.insertMany(
    DEFAULT_STARTUP_PITCH_CRITERIA.map((c) => ({ ...c, eventId: event._id }))
  );

  const teams = await Team.insertMany(teamsSeed.map((t) => ({ ...t, eventId: event._id })));

  const evaluatorTokens = [];
  const evaluators = [];
  for (const judge of judgesSeed) {
    const issued = issueEvaluatorToken();
    evaluatorTokens.push({ email: judge.email, token: issued.token });
    evaluators.push(
      await Evaluator.create({
        eventId: event._id,
        name: judge.name,
        email: judge.email,
        tokenHash: issued.tokenHash,
        tokenCreatedAt: issued.tokenCreatedAt,
        tokenExpiresAt: issued.tokenExpiresAt,
        revoked: false,
      })
    );
  }

  const assignments = [];
  for (const evaluator of evaluators) {
    for (const team of teams) {
      assignments.push({ eventId: event._id, evaluatorId: evaluator._id, teamId: team._id });
    }
  }
  await Assignment.insertMany(assignments);

  const sampleComments = [
    {
      strengths: "Strong customer validation and a clear product narrative.",
      improvements: "Financial projections need more evidence and unit economics.",
    },
    {
      strengths: "Founder-market fit is convincing and the demo was polished.",
      improvements: "Go-to-market plan is still high-level.",
    },
    {
      strengths: "Traction numbers are credible and the moat is understandable.",
      improvements: "Q&A answers were uneven on competitive risks.",
    },
  ];

  const evaluations = [];
  const completeJudges = evaluators.slice(0, 3);
  for (const evaluator of completeJudges) {
    for (const team of teams) {
      const scores = criteria.map((c) => {
        const score = pickScore(c.allowedScores);
        return { criterionId: c._id, name: c.name, score, maxPoints: c.maxPoints };
      });
      const totalScore = scores.reduce((s, x) => s + x.score, 0);
      const comment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
      evaluations.push({
        eventId: event._id,
        evaluatorId: evaluator._id,
        teamId: team._id,
        scores,
        totalScore,
        strengths: comment.strengths,
        improvements: comment.improvements,
        submittedAt: new Date(),
      });
    }
  }

  const partial = evaluators[3];
  for (const team of teams.slice(0, 6)) {
    const scores = criteria.map((c) => {
      const score = pickScore(c.allowedScores);
      return { criterionId: c._id, name: c.name, score, maxPoints: c.maxPoints };
    });
    evaluations.push({
      eventId: event._id,
      evaluatorId: partial._id,
      teamId: team._id,
      scores,
      totalScore: scores.reduce((s, x) => s + x.score, 0),
      strengths: "Clear problem framing.",
      improvements: "Needs sharper competitive positioning.",
      submittedAt: new Date(),
    });
  }

  await Evaluation.insertMany(evaluations);

  console.log("\nSeed complete (development only).");
  console.log("Director login: director@example.com / ChangeMe123!");
  console.log("\nEvaluator links (valid until token expiry):");
  for (const item of evaluatorTokens) {
    console.log(`  ${item.email}: ${env.frontendUrl}/evaluate/${item.token}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
