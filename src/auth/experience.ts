import { z } from 'zod'

/** How much a baker has baked before. Asked at sign-up, stored on the user. */
export const experienceSchema = z.enum(['novice', 'intermediate', 'experienced'])

export type Experience = z.infer<typeof experienceSchema>
