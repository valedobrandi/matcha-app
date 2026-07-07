import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import {
  resendVerificationSchema,
  type ResendVerificationValues,
} from '../../schemas/auth'
import { resolveErrorMessage } from '../../i18n/errors'

export function ResendVerificationPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendVerificationValues>({
    resolver: zodResolver(resendVerificationSchema),
  })
  const [message, setMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: ResendVerificationValues) => {
    setServerError(null)
    setMessage(null)
    try {
      const response = await authApi.resendVerification(values.email)
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
      <h1>Resend verification</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" {...register('email')} />
          {errors.email && <p>{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Resend email
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
