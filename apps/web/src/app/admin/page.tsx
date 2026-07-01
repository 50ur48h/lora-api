"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock, Loader2, LogOut, Users } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { loraAuthed } from "@/lib/lora-authed";
import { supabase } from "@/lib/supabase";

const TZ = "Asia/Kuala_Lumpur";

interface Me {
  email: string;
  role: string;
  tenantId: string | null;
}

interface Booking {
  id: string;
  startAt: string;
  status: string;
  serviceName: string;
  staffName: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  priceCents: number;
}

type Phase = "checking" | "loading" | "ready" | "error";

function whenLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function dayKey(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(
    new Date(iso),
  );
}

function statusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "CONFIRMED":
      return "success";
    case "IN_PROGRESS":
      return "accent";
    case "COMPLETED":
      return "secondary";
    case "CANCELLED":
    case "NO_SHOW":
      return "outline";
    default:
      return "default";
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [me, setMe] = useState<Me | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = useCallback(async () => {
    const [meRes, bookingsRes] = await Promise.all([
      loraAuthed.GET("/v1/auth/me"),
      loraAuthed.GET("/v1/bookings"),
    ]);
    if (meRes.error || !meRes.data) throw new Error("Failed to load profile");
    return {
      me: meRes.data as Me,
      bookings: (bookingsRes.data ?? []) as Booking[],
    };
  }, []);

  // Guard + initial load. Setting state from this effect is the intended
  // pattern for auth-gated data fetching (guarded against unmount).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      if (active) setPhase("loading");
      try {
        const result = await load();
        if (!active) return;
        setMe(result.me);
        setBookings(result.bookings);
        setPhase("ready");
      } catch {
        if (active) setPhase("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [router, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (phase === "checking" || phase === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load your dashboard.
          </p>
          <Button className="mt-4" onClick={() => router.refresh()}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  const now = new Date();
  const todayKey = dayKey(now);
  const upcoming = bookings.filter((b) => new Date(b.startAt) >= now).length;
  const today = bookings.filter((b) => dayKey(b.startAt) === todayKey).length;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bookings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {me?.email}
            {me?.role ? (
              <Badge variant="outline" className="ml-2 align-middle">
                {me.role.replaceAll("_", " ").toLowerCase()}
              </Badge>
            ) : null}
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<CalendarClock className="size-4" />} label="Total" value={bookings.length} />
        <StatCard icon={<Clock className="size-4" />} label="Upcoming" value={upcoming} />
        <StatCard icon={<Users className="size-4" />} label="Today" value={today} />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {bookings.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No bookings yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {whenLabel(b.startAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div>{b.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.customerPhone ?? b.customerEmail ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{b.serviceName}</td>
                    <td className="px-4 py-3">{b.staffName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(b.status)}>
                        {b.status.replaceAll("_", " ").toLowerCase()}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {formatPrice(b.priceCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
