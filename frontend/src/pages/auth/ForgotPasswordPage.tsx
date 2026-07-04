import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../../schemas/auth'
import { resolveErrorMessage } from '../../i18n/errors'

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })
  const [message, setMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: ForgotPasswordValues) => {
    setServerError(null)
    setMessage(null)
    try {
      const response = await authApi.forgotPassword(values)
      setMessage(response.message)
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(resolveErrorMessage(err.code, err.message))
      } else {
        setServerError('Request failed')
      }
    }
  }

  return (
    <div>
      <h1>Forgot password</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" {...register('email')} />
          {errors.email && <p>{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Send reset link
        </button>
      </form>
      {message && <p>{message}</p>}
      {serverError && <p>{serverError}</p>}
      <p>
        <Link to="/auth/login">Back to login</Link>
      </p>
    </div>
  )
}
