const { z } = require("zod");

const ALLOWED_DOC_TYPES = ["MOCK_ID", "MOCK_PAN", "PASSPORT_SAMPLE"];

const submitKycSchema = z.object({
  documentType: z.enum(["MOCK_ID", "MOCK_PAN", "PASSPORT_SAMPLE"], {
    errorMap: () => ({
      message: "Document type must be one of: MOCK_ID, MOCK_PAN, PASSPORT_SAMPLE",
    }),
  }),
  documentNumber: z
    .string()
    .min(4, "Document number must be at least 4 characters")
    .max(30),
});

const reviewKycSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().max(250).optional(),
});

module.exports = {
  ALLOWED_DOC_TYPES,
  submitKycSchema,
  reviewKycSchema,
};
