import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  Palette,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "0% booking fees",
    description:
      "Subscription pricing only. Every ringgit your clients spend stays yours — we never take a cut.",
  },
  {
    icon: Palette,
    title: "Truly white-label",
    description:
      "Your brand, your domain, your colours. Clients never see LORA — they see you.",
  },
  {
    icon: CalendarCheck,
    title: "Bookings that convert",
    description:
      "A fast, beautiful flow tuned for med spas — real-time availability, deposits and reminders.",
  },
];

const slots = ["10:30", "12:00", "14:15", "16:45"];
const highlights = [
  "Per-tenant theming via design tokens",
  "Mobile-first, sub-second load times",
  "Accessible by default",
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[480px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, oklch(0.9 0.08 300 / 0.7), transparent)",
        }}
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <span className="text-lg">LORA</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground sm:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#preview" className="transition-colors hover:text-foreground">
            Preview
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button size="sm">
            Get started
            <ArrowRight />
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-16 pt-12 text-center sm:pt-20">
        <Badge variant="accent" className="mb-5">
          <Star className="size-3" />
          Built for med spas in Malaysia
        </Badge>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          The booking platform that keeps{" "}
          <span className="bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
            100% yours
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Launch a stunning, on-brand booking experience for your spa in
          minutes. Flat monthly pricing, zero commission on every appointment.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg">
            Start free trial
            <ArrowRight />
          </Button>
          <Button size="lg" variant="secondary">
            Book a demo
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No card required · 14-day trial
        </p>
      </section>

      <section id="preview" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Card className="mx-auto w-full max-w-md shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="success">
                  <span className="size-1.5 rounded-full bg-success" />
                  Open today
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Glow Med-Spa · KLCC
                </span>
              </div>
              <CardTitle className="mt-2 text-xl">
                Hydrating Signature Facial
              </CardTitle>
              <CardDescription>
                A 60-minute deep-hydration treatment with our lead aesthetician.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  60 min
                </span>
                <span className="font-medium text-foreground">RM 220</span>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Pick a time</p>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot, i) => (
                    <button
                      key={slot}
                      type="button"
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm transition-colors",
                        i === 1
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button className="w-full">Confirm booking · 12:00</Button>
              <p className="text-center text-xs text-muted-foreground">
                Secured by your spa — 0% platform fee
              </p>
            </CardFooter>
          </Card>

          <div className="order-first lg:order-last">
            <h2 className="text-3xl font-semibold tracking-tight">
              A checkout your clients will actually finish
            </h2>
            <p className="mt-3 text-muted-foreground">
              Real-time availability, deposits and reminders — wrapped in your
              brand. Every component is built on a token-driven design system, so
              each tenant can restyle it instantly.
            </p>
            <ul className="mt-6 space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid size-5 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex max-w-sm gap-2">
              <Input placeholder="you@yourspa.com" type="email" aria-label="Email" />
              <Button>Get early access</Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border bg-muted/40">
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-16 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="hover:shadow-md">
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <CardTitle className="mt-3">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} LORA. All rights reserved.</span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          Crafted for modern med spas
        </span>
      </footer>
    </div>
  );
}
