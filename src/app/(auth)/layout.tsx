import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Logo className="mb-8" />
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">
        EstateFlow CRM — close more deals, faster.
      </p>
    </div>
  );
}
