import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { loginSchema, type LoginValues } from '../../schemas/auth'
import { resolveErrorMessage } from '../../i18n/errors'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: LoginValues) => {
    setServerError(null)
    try {
      await login(values)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
      setServerError(resolveErrorMessage(err.code, err.message))
      } else {
        setServerError('Login failed')
      }
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" type="text" {...register('username')} />
          {errors.username && <p>{errors.username.message}</p>}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" {...register('password')} />
          {errors.password && <p>{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Login
        </button>
      </form>
      {serverError && <p>{serverError}</p>}
      <p>
        <Link to="/auth/forgot-password">Forgot password?</Link>
      </p>
      <p>
        No account? <Link to="/auth/register">Register</Link>
      </p>
    </div>
  )
}
