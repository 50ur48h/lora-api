"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatTime } from "@/lib/format";
import { lora } from "@/lib/lora";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  serviceId: string;
  timezone: string;
}

interface Slot {
  startAt: string;
  staffId: string;
}

interface Confirmation {
  startAt: string;
  serviceName: string;
  staffName: string;
}

function upcomingDays(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      value,
      weekday: d.toLocaleDateString("en-MY", { weekday: "short" }),
      day: d.toLocaleDateString("en-MY", { day: "numeric", month: "short" }),
    };
  });
}

export function BookingFlow({ slug, serviceId, timezone }: Props) {
  const days = useMemo(() => upcomingDays(14), []);
  const [date, setDate] = useState(days[0].value);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const loadSlots = useCallback(
    async (forDate: string): Promise<Slot[]> => {
      const { data } = await lora.GET(
        "/v1/public/stores/{slug}/services/{serviceId}/availability",
        { params: { path: { slug, serviceId }, query: { date: forDate } } },
      );
      return data?.slots ?? [];
    },
    [slug, serviceId],
  );

  // Fetch slots whenever the chosen date changes. Setting state from this
  // effect is the intended pattern for external data fetching (guarded by the
  // `active` flag against out-of-order responses).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    setLoadingSlots(true);
    setSelected(null);
    void loadSlots(date)
      .then((next) => {
        if (active) setSlots(next);
      })
      .catch(() => {
        if (active) setSlots([]);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [date, loadSlots]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data, error: apiError } = await lora.POST(
        "/v1/public/stores/{slug}/bookings",
        {
          params: { path: { slug } },
          body: {
            serviceId,
            staffId: selected.staffId,
            startAt: selected.startAt,
            customer: {
              name: form.name,
              phone: form.phone,
              email: form.email || undefined,
            },
          },
        },
      );

      if (apiError || !data) {
        setError("That time was just taken — please pick another slot.");
        setSlots(await loadSlots(date));
        setSelected(null);
        return;
      }
      setConfirmation({
        startAt: data.startAt,
        serviceName: data.serviceName,
        staffName: data.staffName,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-6" />
        </span>
        <h2 className="text-xl font-semibold">Booking confirmed</h2>
        <p className="mt-2 text-muted-foreground">
          {confirmation.serviceName} with {confirmation.staffName}
        </p>
        <p className="mt-1 font-medium">
          {formatDate(confirmation.startAt, timezone)} at{" "}
          {formatTime(confirmation.startAt, timezone)}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          We&apos;ve sent your request to the spa. See you soon!
        </p>
      </div>
    );
  }

  const canSubmit =
    selected !== null &&
    form.name.trim() !== "" &&
    form.phone.trim() !== "" &&
    !submitting;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-medium">Choose a date</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDate(d.value)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors",
                d.value === date
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              <span className="text-xs opacity-80">{d.weekday}</span>
              <span className="font-medium">{d.day}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Choose a time</h2>
        {loadingSlots ? (
          <p className="text-sm text-muted-foreground">Loading times…</p>
        ) : slots && slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => (
              <button
                key={s.startAt}
                type="button"
                onClick={() => setSelected(s)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-sm transition-colors",
                  selected?.startAt === s.startAt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {formatTime(s.startAt, timezone)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No times available on this day.
          </p>
        )}
      </section>

      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-sm font-medium">Your details</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+60 12-345 6789"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
        >
          {submitting && <Loader2 className="animate-spin" />}
          {selected
            ? `Confirm booking · ${formatTime(selected.startAt, timezone)}`
            : "Select a time"}
        </Button>
      </form>
    </div>
  );
}
