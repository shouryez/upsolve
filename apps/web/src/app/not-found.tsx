import Link from "next/link";
import { ButtonArrow, Logo, Stacky, Starfield, buttonClasses } from "@upsolve/ui";
import { Meteors } from "@/components/fx/decor";
import { DecodeText } from "@/components/fx/text";

/** Site-wide 404: Stacky thinking it over, chrome numerals that decode on load, a verdict chip, meteors. */
export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#08080d] px-4 text-white">
      <Starfield className="opacity-60" />
      <Meteors count={6} />
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(164,139,255,.25),transparent_65%)] blur-2xl"
      />
      <div className="relative flex flex-col items-center text-center">
        <Link href="/" aria-label="DsaKaro home" className="mb-10 text-white">
          <Logo />
        </Link>
        <Stacky mood="thinking" size={120} className="-mt-4 mb-4" />
        <span className="mb-4 inline-flex h-7 items-center gap-2 rounded-full border border-[#ff5a78]/40 bg-[#ff5a78]/12 px-3 font-mono text-12 text-[#ff8aa0]">
          <span className="size-1.5 rounded-full bg-current" /> Verdict: 404 Not Found
        </span>
        <p className="num chrome-404 text-[clamp(110px,24vw,220px)]">
          <DecodeText text="404" duration={700} />
        </p>
        <h1 className="mt-2 font-display text-[clamp(30px,4.4vw,48px)] leading-none tracking-[-0.02em]">
          Wrong answer. <em className="text-signal">Let&apos;s upsolve it.</em>
        </h1>
        <p className="mt-3 max-w-[40ch] text-[14.5px] text-white/70">
          This page doesn&apos;t exist, or the link has expired.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Link href="/dashboard" className={buttonClasses({ variant: "signal" })}>
            Go to your dashboard <ButtonArrow />
          </Link>
          <Link
            href="/"
            className="inline-flex h-[42px] items-center rounded-full border border-white/15 bg-white/5 px-[18px] text-14 font-[550] text-white transition-colors hover:bg-white/10"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
