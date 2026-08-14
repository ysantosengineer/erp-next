import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from '../ui/button';

export function EmptyState({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="rounded-full bg-slate-100 p-3 text-slate-500">
        <Inbox aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: Readonly<{ message: string; onRetry(): void }>) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
    >
      <span className="rounded-full bg-red-50 p-3 text-red-700">
        <AlertCircle aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 font-semibold text-slate-900">Não foi possível carregar os dados</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600">{message}</p>
      <Button className="mt-5" onClick={onRetry} type="button" variant="outline">
        Tentar novamente
      </Button>
    </div>
  );
}
