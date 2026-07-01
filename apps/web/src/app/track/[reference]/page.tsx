"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, User } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { lora } from "@/lib/lora";
import { cn } from "@/lib/utils";

interface Tracked {
  reference: string;
  status: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  staffName: string;
  storeName: string;
  storeSlug: string;
  timezone: string;
  customerName: string;
  priceCents: number;
}

function statusMeta(status: string): {
  label: string;
  variant: BadgeProps["variant"];
  message: string;
} {
  switch (status) {
    case "REQUESTED":
      return {
        label: "Requested",
        variant: "default",
        message: "Your booking is in and awaiting confirmation from the spa.",
      };
    case "CONFIRMED":
      return {
        label: "Confirmed",
        variant: "success",
        message: "You're all set — we can't wait to see you!",
      };
    case "IN_PROGRESS":
      return {
        label: "In progress",
        variant: "accent",
        message: "Your appointment is underway. Enjoy!",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        variant: "secondary",
        message: "Thanks for visiting — we hope you loved it.",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        variant: "outline",
        message: "This booking was cancelled.",
      };
    case "NO_SHOW":
      return {
        label: "No-show",
        variant: "outline",
        message: "This booking was marked as a no-show.",
      };
    default:
      return { label: status, variant: "default", message: "" };
  }
}

export default function TrackDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);
  const [state, setState] = useState<"loading" | "found" | "notfound">(
    "loading",
  );
  const [booking, setBooking] = useState<Tracked | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await lora.GET(
          "/v1/public/bookings/{reference}",
          { params: { path: { reference } } },
        );
        if (!active) return;
        if (error || !data) {
          setState("notfound");
          return;
        }
        setBooking(data as Tracked);
        setState("found");
      } catch {
        if (active) setState("notfound");
      }
    })();
    return () => {
      active = false;
    };
  }, [reference]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 py-10">
      <Link
        href="/track"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Track another
      </Link>

      {state === "loading" && <TrackSkeleton />}

      {state === "notfound" && (
        <div className="animate-slide-up rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Booking not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t find a booking with reference{" "}
            <span className="font-mono font-medium text-foreground">
              {reference}
            </span>
            . Double-check the code and try again.
          </p>
          <Link
            href="/track"
            className={cn(buttonVariants({ variant: "secondary" }), "mt-5")}
          >
            Try another reference
          </Link>
        </div>
      )}

      {state === "found" && booking && <TrackCard booking={booking} />}
    </main>
  );
}

function TrackCard({ booking }: { booking: Tracked }) {
  const meta = statusMeta(booking.status);
  return (
    <div className="animate-slide-up space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary/12 to-accent/50 p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Booking reference
          </p>
          <p className="font-mono text-2xl font-semibold tracking-[0.2em]">
            {booking.reference}
          </p>
          <div className="mt-3">
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
        </div>
        <div className="space-y-3 p-6">
          {meta.message && (
            <p className="text-sm text-muted-foreground">{meta.message}</p>
          )}
          <Row
            icon={<Calendar className="size-4" />}
            label={formatDate(booking.startAt, booking.timezone)}
          />
          <Row
            icon={<Clock className="size-4" />}
            label={`${formatTime(booking.startAt, booking.timezone)} – ${formatTime(
              booking.endAt,
              booking.timezone,
            )}`}
          />
          <Row
            icon={<User className="size-4" />}
            label={`${booking.serviceName} · ${booking.staffName}`}
          />
          <Row
            icon={<MapPin className="size-4" />}
            label={booking.storeName}
          />
        </div>
      </div>
      <Link
        href={`/${booking.storeSlug}`}
        className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
      >
        Book again at {booking.storeName}
      </Link>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}

function TrackSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="space-y-3 p-6">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-7 w-40 rounded" />
        <div className="skeleton h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-3 border-t border-border p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton size-8 rounded-lg" />
            <div className="skeleton h-4 w-48 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
