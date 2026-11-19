import Link from "next/link";

const PACKS = ["60", "325", "660", "1800"] as const;

const STEPS = [
  { n: "1", title: "Pick an event", text: "Choose a tournament that fits your squad and check the schedule." },
  { n: "2", title: "Register", text: "Add your team name, logo and every player with their ID." },
  { n: "3", title: "Get the room", text: "Room ID and password reach your WhatsApp at reveal time." },
  { n: "4", title: "Play and climb", text: "Matches are scored live and rankings are published after each one." },
] as const;

const CHIP =
  "inline-flex items-center rounded-full border border-[#2a3b6e] bg-[#4d7cff]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#a9c0ff]";

export function HomeUcBand() {
  return (
    <section id="uc" className="mx-auto max-w-[1180px] scroll-mt-16 px-5 py-10 sm:px-10">
      <div className="relative flex flex-wrap items-center justify-between gap-11 overflow-hidden rounded-[28px] border border-[#223158] bg-gradient-to-br from-[#0e1a3e] via-[#0a1020] to-[#0a1020] px-6 py-12 sm:px-11">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(242,184,75,0.18),transparent_70%)]" />
        <div className="relative min-w-0 flex-[1_1_340px]">
          <span className={CHIP}>Top up</span>
          <h2 className="epx-hd mb-3.5 mt-4 text-[clamp(28px,3vw,40px)] font-bold leading-[1.05] text-[#e8eefc]">PUBG MOBILE UC, in minutes</h2>
          <p className="max-w-[420px] text-base leading-relaxed text-[#a4b3d1]">Choose a pack, enter your player ID and pay. UC goes straight to your account.</p>
        </div>
        <div className="relative grid min-w-0 flex-[1_1_420px] grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
          {PACKS.map((uc) => (
            <Link
              key={uc}
              href="/shop"
              className="flex flex-col gap-1 rounded-2xl border border-[#223158] bg-[#0b1224] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#f2b84b] hover:bg-[#101a33]"
            >
              <span className="epx-hd text-[30px] font-bold leading-none text-[#f2b84b]">{uc}</span>
              <span className="text-xs tracking-[0.1em] text-[#7f92b8]">UC</span>
              <span className="epx-hd mt-2.5 text-base font-semibold text-[#e8eefc]">Buy now →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeHowItWorks() {
  return (
    <section id="how" className="mx-auto flex max-w-[1180px] scroll-mt-16 flex-wrap justify-between gap-14 px-5 py-16 sm:px-10">
      <div className="min-w-0 flex-[1_1_300px]">
        <span className={CHIP}>How it works</span>
        <h2 className="epx-hd mb-3.5 mt-4 text-[clamp(28px,3vw,40px)] font-bold leading-[1.05] text-[#e8eefc]">Four steps to the lobby</h2>
        <p className="max-w-[340px] text-[15px] leading-relaxed text-[#8da0c4]">From registration to the final result, everything is handled in one place.</p>
      </div>
      <ol className="min-w-0 flex-[1.4_1_420px]">
        {STEPS.map((s) => (
          <li key={s.n} className="relative ml-3 border-l-2 border-[#223158] pb-9 pl-10 last:border-l-transparent last:pb-0">
            <span className="epx-hd absolute -left-[15px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#4d7cff] bg-[#0d1426] text-xs font-bold text-[#a9c0ff]">{s.n}</span>
            <div className="epx-hd text-xl font-bold text-[#e8eefc]">{s.title}</div>
            <div className="mt-1.5 text-[15px] leading-relaxed text-[#9fb0cf]">{s.text}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HomeCta() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 pb-12 sm:px-10">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-gradient-to-r from-[#2447e0] to-[#5b3df5] px-6 py-12 text-white sm:px-11">
        <h2 className="epx-hd text-[clamp(26px,3vw,38px)] font-bold leading-[1.05]">Your squad. Your slot.</h2>
        <Link href="/login" className="epx-hd inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-base font-semibold text-[#1c2d86] transition-transform duration-200 hover:-translate-y-0.5">
          Register now
        </Link>
      </div>
    </section>
  );
}
