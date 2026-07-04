import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { resetPasswordSchema, type ResetPasswordValues } from '../../schemas/auth'
import { resolveErrorMessage } from '../../i18n/errors'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const token = searchParams.get('token') ?? ''
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: ResetPasswordValues) => {
    setServerError(null)
    try {
      const response = await authApi.resetPassword({ token, ...values })
      loginWithToken(response.access_token)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(resolveErrorMessage(err.code, err.message))
      } else {
        setServerError('Reset failed')
      }
    }
  }

  if (!token) {
    return (
      <div>
        <h1>Reset password</h1>
        <p>Missing reset token</p>
        <Link to="/auth/forgot-password">Request a new link</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>Reset password</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="password">New password</label>
          <input id="password" type="password" {...register('password')} />
          {errors.password && <p>{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Update password
        </button>
      </form>
      {serverError && <p>{serverError}</p>}
    </div>
  )
}
