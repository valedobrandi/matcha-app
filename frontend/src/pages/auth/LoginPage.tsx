import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { loginSchema, type LoginValues } from '../../schemas/auth'
import { resolveErrorMessage } from '../../i18n/errors'
import { buildFortyTwoAuthorizeUrl } from '../../auth/oauthState'
import { LoginForm } from '@/components/login-form'

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
  const [showResendLink, setShowResendLink] = useState(false)

  const onSubmit = async (values: LoginValues) => {
    setServerError(null)
    setShowResendLink(false)
    try {
      await login(values)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(resolveErrorMessage(err.code, err.message))
        if (err.code === 'ACCOUNT_NOT_VERIFIED') {
          setShowResendLink(true)
        }
      } else {
        setServerError('Login failed')
      }
    }
  }

  return (
    <LoginForm
      register={register}
      errors={errors}
      isSubmitting={isSubmitting}
      serverError={serverError}
      showResendLink={showResendLink}
      onSubmit={handleSubmit(onSubmit)}
      onFortyTwoLogin={() => {
        window.location.href = buildFortyTwoAuthorizeUrl()
      }}
    />
  )
}
