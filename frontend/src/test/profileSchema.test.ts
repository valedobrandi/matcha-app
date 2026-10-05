import { describe, it, expect } from 'vitest'
import { profileSchema } from '../schemas/users'

describe('profileSchema orientation', () => {
    it('does accept a profile when the orientation is not specified', () => {
        const result = profileSchema.safeParse({ age: 25, gender: 'male', bio: 'hello' })

        expect(result.success).toBe(true)
    })
})
