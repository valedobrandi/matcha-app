import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { registerSchema, type RegisterValues } from '../../schemas/auth'
import { isRegisterField, resolveErrorMessage } from '../../i18n/errors'

export function RegisterPage() {
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })
  const [message, setMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null)
    setMessage(null)
    try {
      const response = await authApi.register(values)
      setMessage(response.message)
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = resolveErrorMessage(err.code, err.message)
        if (err.field && isRegisterField(err.field)) {
          setError(err.field, { message: msg })
        } else {
          setServerError(msg)
        }
      } else {
        setServerError('Registration failed')
      }
    }
  }

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" {...registerField('email')} />
          {errors.email && <p>{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" type="text" {...registerField('username')} />
          {errors.username && <p>{errors.username.message}</p>}
        </div>
        <div>
          <label htmlFor="first_name">First name</label>
          <input
            id="first_name"
            type="text"
            {...registerField('first_name')}
          />
          {errors.first_name && <p>{errors.first_name.message}</p>}
        </div>
        <div>
          <label htmlFor="last_name">Last name</label>
          <input id="last_name" type="text" {...registerField('last_name')} />
          {errors.last_name && <p>{errors.last_name.message}</p>}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            {...registerField('password')}
          />
          {errors.password && <p>{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Register
        </button>
      </form>
      {message && <p>{message}</p>}
      {serverError && <p>{serverError}</p>}
      <p>
        Already have an account? <Link to="/auth/login">Login</Link>
      </p>
    </div>
  )
}
