import { describe, expect, it } from 'vitest'
import { registerSchema } from '../schemas/auth'
import { accountSchema, profileSchema } from '../schemas/users'

const REGISTRATION = { email: 'a@ex.org', username: 'ana', first_name: 'Ana', last_name: 'Lee', password: 'Zq9Xv7Lm2Kp' }

function firstMessage(result: { success: boolean, error?: { issues: Array<{ message: string }> } }) {
    return result.error?.issues[0]?.message
}

describe('form limits', () => {
    it('does reject a username longer than the 50 characters the account can store', () => {
        const result = registerSchema.safeParse({ ...REGISTRATION, username: 'u'.repeat(51) })

        expect(firstMessage(result)).toBe('Username must be at most 50 characters')
    })

    it('does reject a name made only of spaces when the account is edited', () => {
        const result = accountSchema.safeParse({ username: 'ana', first_name: '   ', last_name: 'Lee', email: 'a@ex.org' })

        expect(firstMessage(result)).toBe('First name is required')
    })

    it('does reject a password longer than 72 bytes when registering', () => {
        const result = registerSchema.safeParse({ ...REGISTRATION, password: 'Zq9Xv7Lm2Kp'.repeat(7) })

        expect(firstMessage(result)).toBe('Password is too long')
    })

    it('does reject a bio longer than 1000 characters', () => {
        const result = profileSchema.safeParse({ age: 25, gender: 'male', bio: 'b'.repeat(1001) })

        expect(firstMessage(result)).toBe('Bio must be at most 1000 characters')
    })

    it('does accept a registration at every limit', () => {
        const result = registerSchema.safeParse({ ...REGISTRATION, username: 'u'.repeat(50), password: 'Zq9Xv7Lm2Kp'.repeat(6) })

        expect(result.success).toBe(true)
    })
})
