"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Clock, Loader2, Users } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  BOOKING_ACTIONS,
  STATUS_VERB,
  humanize,
  type Booking,
  type BookingStatus,
} from "@/lib/admin";
import { loraAuthed } from "@/lib/lora-authed";

const TZ = "Asia/Kuala_Lumpur";

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

function actionVariant(target: string): "primary" | "outline" {
  return target === "CANCELLED" || target === "NO_SHOW" ? "outline" : "primary";
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await loraAuthed.GET("/v1/bookings");
    if (res.error || !res.data) throw new Error("load failed");
    return res.data as Booking[];
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    void load()
      .then((data) => active && setBookings(data))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function changeStatus(id: string, status: BookingStatus) {
    setPendingId(id);
    try {
      const res = await loraAuthed.PATCH("/v1/bookings/{id}/status", {
        params: { path: { id } },
        body: { status },
      });
      if (res.error || !res.data) throw new Error("update failed");
      const updated = res.data as Booking;
      setBookings((prev) =>
        prev ? prev.map((b) => (b.id === id ? updated : b)) : prev,
      );
    } catch {
      // Reload to resync if the transition raced or failed.
      try {
        setBookings(await load());
      } catch {
        setError(true);
      }
    } finally {
      setPendingId(null);
    }
  }

  if (error) {
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load bookings.
        </p>
      </Centered>
    );
  }

  if (!bookings) {
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Centered>
    );
  }

  const now = new Date();
  const todayKey = dayKey(now);
  const upcoming = bookings.filter((b) => new Date(b.startAt) >= now).length;
  const today = bookings.filter((b) => dayKey(b.startAt) === todayKey).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold">Bookings</h1>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="Total"
          value={bookings.length}
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="Upcoming"
          value={upcoming}
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Today"
          value={today}
        />
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
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const actions = BOOKING_ACTIONS[b.status] ?? [];
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-border last:border-0 align-top hover:bg-muted/40"
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
                      <td className="px-4 py-3">
                        {b.serviceName}
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(b.priceCents)}
                        </div>
                      </td>
                      <td className="px-4 py-3">{b.staffName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(b.status)}>
                          {humanize(b.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {actions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {actions.map((target) => (
                              <Button
                                key={target}
                                size="sm"
                                variant={actionVariant(target)}
                                disabled={pendingId === b.id}
                                onClick={() =>
                                  changeStatus(b.id, target as BookingStatus)
                                }
                              >
                                {pendingId === b.id && (
                                  <Loader2 className="animate-spin" />
                                )}
                                {STATUS_VERB[target] ?? humanize(target)}
                              </Button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center">{children}</div>;
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
