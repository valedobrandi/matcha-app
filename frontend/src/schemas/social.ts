import z from "zod";

export const reportInputSchema = z.object({
    reason: z.string().max(500, "Max length should be less than 500 characters.").nullable()
})

export type reportInputValue = z.infer<typeof reportInputSchema>