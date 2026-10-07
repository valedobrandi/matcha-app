import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { registerSchema, type RegisterValues } from '../../schemas/auth'
import { isRegisterField } from '../../i18n/errors'
import { toServerMessage } from '@/hooks/toServerMessage'
import { RegisterForm } from '../../components/register-form'

export function RegisterPage() {
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const registration = useMutation({
    mutationFn: authApi.register,
    onMutate: () => setServerError(null),
    onError: error => {
      const message = toServerMessage(error) ?? 'Registration failed'
      if (error instanceof ApiError && error.field && isRegisterField(error.field)) {
        setError(error.field, { message })
      } else {
        setServerError(message)
      }
    },
  })

  return (
    <RegisterForm
      register={registerField}
      errors={errors}
      isSubmitting={registration.isPending}
      serverError={serverError}
      successMessage={registration.data?.message ?? null}
      onSubmit={handleSubmit(values => registration.mutate(values))}
    />
  )
}
