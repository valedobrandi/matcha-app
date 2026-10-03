import { z } from 'zod'

export const basicQueryParamsSchema = z.object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
})

export const suggestQueryParamsSchema = basicQueryParamsSchema.extend({
    sort: z.enum(["age", "distance", "fame", "common_tags"]).optional(),
    order: z.enum(["asc", "desc"]).optional()
})

export const searchQueryParamsSchema = suggestQueryParamsSchema.extend({
    age_min: z.number().int().min(18).optional(),
    age_max: z.number().int().max(100).optional(),
    fame_min: z.number().int().min(0).optional(),
    fame_max: z.number().int().max(100).optional(),
    max_distance_km: z.number().max(100).optional(),
    tag_ids: z.array(z.number().int()).default([])
})

export type BasicQueryParamsValues = z.infer<typeof basicQueryParamsSchema>
export type SuggestQueryParamsValues = z.infer<typeof suggestQueryParamsSchema>
export type SearchQueryParamsValues = z.infer<typeof searchQueryParamsSchema>
