import { Logo } from "@/components/layout/logo";
import { FadeIn } from "@/components/motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Brand panel — desktop */}
      <div className="bg-luxe relative hidden w-[44%] flex-col justify-between overflow-hidden p-10 lg:flex">
        <Logo onDark />
        <div className="relative z-10">
          <p className="font-display text-4xl font-semibold leading-[1.15] text-white xl:text-5xl">
            Every lead answered.
            <br />
            <span className="text-gold-gradient italic">Every estate</span> remembered.
          </p>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60">
            The CRM that calls your leads the moment they arrive, shares properties in one
            tap, and keeps your whole brokerage in one place.
          </p>
        </div>
        <div className="flex items-center gap-6 text-[13px] text-white/45">
          <span>Instant call bridge</span>
          <span className="size-1 rounded-full bg-gold/60" aria-hidden />
          <span>One-tap sharing</span>
          <span className="size-1 rounded-full bg-gold/60" aria-hidden />
          <span>Live pipeline</span>
        </div>
        {/* Decorative skyline lines */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full text-white/6"
          viewBox="0 0 800 220"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden
        >
          <path d="M0 220V140h60v80M60 220V100h50v120M110 220V160h70v60M180 220V60h60l10 20v140M250 220V120h55v100M305 220V90h45v130M350 220V150h80v70M430 220V40h50l14 26v154M494 220V110h60v110M554 220V70h44v150M598 220V140h70v80M668 220V95h56v125M724 220V160h76v60" />
        </svg>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <FadeIn className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center font-display text-[13px] italic text-muted-foreground">
            EstateFlow CRM — close more deals, faster.
          </p>
        </FadeIn>
      </div>
    </div>
  );
}
