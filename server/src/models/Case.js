import mongoose from 'mongoose';
import {
  CATEGORY_IDS,
  CLASSIFICATION_IDS,
  ROOT_CAUSE_IDS,
  ENTRY_POINT_IDS,
  EVIDENCE_TYPES,
  SEVERITIES,
} from '../config/taxonomy.js';
import { DIFFICULTY_IDS } from '../config/difficulty.js';

const { Schema } = mongoose;

// ---- public sub-documents -------------------------------------------------
const eventSchema = new Schema(
  {
    eventId: { type: String, required: true, match: /^evt-\d{2}$/ },
    timestamp: { type: Date, required: true },
    source: { type: String, required: true, maxlength: 60 },
    severity: { type: String, enum: SEVERITIES, required: true },
    summary: { type: String, required: true, maxlength: 300 },
    details: { type: String, default: '', maxlength: 500 },
  },
  { _id: false },
);

// Evidence "stub": safe to show before discovery.
const evidenceStubSchema = new Schema(
  {
    evidenceId: { type: String, required: true, match: /^ev-\d{2}$/ },
    title: { type: String, required: true, maxlength: 100 },
    type: { type: String, enum: EVIDENCE_TYPES, required: true },
  },
  { _id: false },
);

// ---- private sub-documents (never returned by default queries) -------------
const evidenceDetailSchema = new Schema(
  {
    evidenceId: { type: String, required: true, match: /^ev-\d{2}$/ },
    description: { type: String, required: true, maxlength: 800 },
    relatedEventIds: { type: [String], default: [] },
  },
  { _id: false },
);

const answerKeySchema = new Schema(
  {
    classification: { type: String, enum: CLASSIFICATION_IDS, required: true },
    rootCause: { type: String, enum: ROOT_CAUSE_IDS, required: true },
    entryPoint: { type: String, enum: ENTRY_POINT_IDS, required: true },
    rootCauseExplanation: { type: String, required: true, maxlength: 1000 },
    keyEvidenceIds: { type: [String], required: true },
    attackChainEventIds: { type: [String], required: true },
  },
  { _id: false },
);

const hintSchema = new Schema(
  {
    hintId: { type: String, required: true, match: /^hint-\d{2}$/ },
    level: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, maxlength: 300 },
  },
  { _id: false },
);

const caseSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 120 },
    summary: { type: String, required: true, maxlength: 600 },
    category: { type: String, enum: CATEGORY_IDS, required: true },
    difficulty: { type: String, enum: DIFFICULTY_IDS, required: true },
    organizationTheme: { type: String, default: '', maxlength: 60 },
    organization: {
      name: { type: String, required: true, maxlength: 80 },
      industry: { type: String, required: true, maxlength: 80 },
      description: { type: String, required: true, maxlength: 400 },
    },
    objectives: { type: [String], default: [] },
    events: { type: [eventSchema], default: [] },
    evidence: { type: [evidenceStubSchema], default: [] },
    source: { type: String, enum: ['gemini', 'demo'], required: true },

    // PRIVATE: select:false => excluded from every query unless explicitly requested
    evidenceDetails: { type: [evidenceDetailSchema], select: false },
    answerKey: { type: answerKeySchema, select: false },
    hints: { type: [hintSchema], select: false },
    explanation: { type: String, select: false },
    recommendations: { type: [String], select: false },
  },
  { timestamps: true },
);

caseSchema.index({ createdAt: -1 });
caseSchema.index({ category: 1, difficulty: 1 });

// Second line of defence: even `res.json(caseDoc)` cannot leak private fields.
// (The primary defence is the whitelist in serializers/caseSerializer.js.)
caseSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.answerKey;
    delete ret.evidenceDetails;
    delete ret.hints;
    delete ret.explanation;
    delete ret.recommendations;
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Names of the private paths, for services that must opt in explicitly.
export const PRIVATE_CASE_FIELDS = '+evidenceDetails +answerKey +hints +explanation +recommendations';

export const Case = mongoose.models.Case || mongoose.model('Case', caseSchema);
