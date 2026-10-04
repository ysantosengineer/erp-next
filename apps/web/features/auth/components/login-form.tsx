'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '../../../lib/api/api-error';
import { useAuth } from '../hooks/use-auth';
import { loginSchema, type LoginFormValues } from '../schemas/login.schema';

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Não foi possível entrar. Tente novamente.';
  if (error.code === 'INVALID_CREDENTIALS') return 'E-mail ou senha inválidos.';
  if (error.code === 'API_UNAVAILABLE') return error.message;
  return 'Não foi possível entrar. Tente novamente.';
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values);
      router.replace('/');
    } catch (error) {
      setFormError(loginErrorMessage(error));
    }
  };

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      {formError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="email">
          E-mail
        </label>
        <input
          {...register('email')}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          id="email"
          inputMode="email"
          type="email"
        />
        {errors.email ? (
          <p className="mt-1.5 text-sm text-red-700" id="email-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="password">
            Senha
          </label>
          <span
            className="text-xs text-slate-500"
            title="Recuperação de senha ainda não está disponível."
          >
            Recuperar senha indisponível
          </span>
        </div>
        <div className="relative">
          <input
            {...register('password')}
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-3.5 pr-20 text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            id="password"
            type={showPassword ? 'text' : 'password'}
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {errors.password ? (
          <p className="mt-1.5 text-sm text-red-700" id="password-error">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <button
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
