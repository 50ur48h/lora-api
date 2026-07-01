"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TrackSearchPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ref = code.trim().toUpperCase();
    if (ref) router.push(`/track/${ref}`);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[420px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, oklch(0.9 0.08 300 / 0.6), transparent)",
        }}
      />
      <div className="w-full max-w-md animate-slide-up text-center">
        <Link
          href="/"
          className="mx-auto mb-6 flex w-fit items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </span>
          LORA
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Track your booking
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enter your booking reference to see its status. No login needed.
        </p>
        <form onSubmit={submit} className="mt-6 flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. K7M2P9QX"
            aria-label="Booking reference"
            autoFocus
            className="text-center font-mono text-lg uppercase tracking-[0.2em]"
          />
          <Button type="submit" size="lg" disabled={!code.trim()}>
            <Search className="size-4" />
            Track
          </Button>
        </form>
      </div>
    </main>
  );
}
