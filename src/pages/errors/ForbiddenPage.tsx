import { Lock } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 animate-float">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">403</h1>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Access Denied</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          You don't have permission to access this page. If you believe this is a mistake,
          please contact your administrator.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          <Button onClick={() => window.location.href = '/'}>Return Home</Button>
        </div>
      </div>
    </div>
  );
}
