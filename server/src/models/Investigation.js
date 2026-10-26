import mongoose from 'mongoose';
import { CLASSIFICATION_IDS, ROOT_CAUSE_IDS, ENTRY_POINT_IDS } from '../config/taxonomy.js';

const { Schema } = mongoose;

const findingsSchema = new Schema(
  {
    classification: { type: String, enum: CLASSIFICATION_IDS, required: true },
    rootCause: { type: String, enum: ROOT_CAUSE_IDS, required: true },
    entryPoint: { type: String, enum: ENTRY_POINT_IDS, required: true },
    evidenceIds: { type: [String], default: [] },
    reasoning: { type: String, required: true, maxlength: 1000 },
  },
  { _id: false },
);

const scoreBreakdownSchema = new Schema(
  {
    classificationPoints: { type: Number, required: true },
    rootCausePoints: { type: Number, required: true },
    evidencePoints: { type: Number, required: true },
    hintPenalty: { type: Number, required: true },
    wrongSubmissionPenalty: { type: Number, required: true },
    uniqueEvidenceCount: { type: Number, required: true },
    hintCount: { type: Number, required: true },
    wrongSubmissionCount: { type: Number, required: true },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const investigationSchema = new Schema(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    // Reserved for future authentication. Unused in the anonymous MVP.
    ownerId: { type: Schema.Types.ObjectId, default: null },
    status: { type: String, enum: ['active', 'submitted'], default: 'active' },
    discoveredEvidenceIds: { type: [String], default: [] },
    hintsUsed: { type: [String], default: [] }, // issued hint ids, in order
    timeline: { type: [String], default: [] },
    findings: { type: findingsSchema, default: undefined },
    scoreBreakdown: { type: scoreBreakdownSchema, default: undefined },
    finalScore: { type: Number, default: null },
    // Full result snapshot (contains the ground truth) - private until submitted.
    result: { type: Schema.Types.Mixed, default: null, select: false },
    submittedAt: { type: Date, default: null },
    // Optimistic-concurrency counter, incremented on every mutation.
    revision: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
);

investigationSchema.index({ caseId: 1 }, { unique: true });
investigationSchema.index({ status: 1, updatedAt: -1 });

export const Investigation =
  mongoose.models.Investigation || mongoose.model('Investigation', investigationSchema);
