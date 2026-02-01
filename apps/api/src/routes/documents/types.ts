import { z } from "zod";

// ==================== VALIDATION SCHEMAS ====================

export const ProjectIdSchema = z.object({
  projectId: z.string().uuid(),
});

export const DocumentIdSchema = z.object({
  projectId: z.string().uuid(),
  docId: z.string().uuid(),
});

export const CitationIdSchema = z.object({
  projectId: z.string().uuid(),
  docId: z.string().uuid(),
  citationId: z.string().uuid(),
});

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const AddCitationSchema = z.object({
  articleId: z.string().uuid(),
  pageRange: z.string().max(50).optional(),
  note: z.string().max(2000).optional(),
});

export const UpdateCitationSchema = z.object({
  note: z.string().max(2000).optional(),
  pageRange: z.string().max(50).optional(),
});

export const SyncCitationsSchema = z.object({
  citationIds: z.array(z.string().uuid()),
});

export const ReorderDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()),
});

export const VersionCreateSchema = z.object({
  versionNote: z.string().optional(),
  versionType: z.enum(["manual", "auto", "exit"]).default("manual"),
});

// ==================== TYPE EXPORTS ====================

export type ProjectIdParams = z.infer<typeof ProjectIdSchema>;
export type DocumentIdParams = z.infer<typeof DocumentIdSchema>;
export type CitationIdParams = z.infer<typeof CitationIdSchema>;
export type CreateDocumentBody = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocumentBody = z.infer<typeof UpdateDocumentSchema>;
export type AddCitationBody = z.infer<typeof AddCitationSchema>;
export type UpdateCitationBody = z.infer<typeof UpdateCitationSchema>;
export type SyncCitationsBody = z.infer<typeof SyncCitationsSchema>;
export type ReorderDocumentsBody = z.infer<typeof ReorderDocumentsSchema>;
export type VersionType = "manual" | "auto" | "exit";
