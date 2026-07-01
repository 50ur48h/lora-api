import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatPrice } from "@/lib/format";
import { brandStyle } from "@/lib/theme";
import { lora } from "@/lib/lora";

// Booking pages are tenant-specific and data-driven — always render fresh.
export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: store, error } = await lora.GET("/v1/public/stores/{slug}", {
    params: { path: { slug } },
  });

  if (error || !store) {
    notFound();
  }

  return (
    <div style={brandStyle(store.theme)} className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl animate-fade-in flex-col items-start gap-3 px-6 py-12">
          <Badge>Now booking</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">
            {store.name}
          </h1>
          <p className="text-muted-foreground">
            Choose a treatment below to book your appointment.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h2 className="mb-5 text-lg font-semibold">Treatments</h2>
        {store.services.length === 0 ? (
          <p className="text-muted-foreground">No treatments available yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {store.services.map((service) => (
              <Card
                key={service.id}
                className="flex animate-slide-up flex-col transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader className="flex-1">
                  <CardTitle>{service.name}</CardTitle>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    {formatDuration(service.durationMin)}
                  </div>
                </CardHeader>
                <CardFooter className="items-center justify-between">
                  <span className="text-lg font-semibold">
                    {formatPrice(service.priceCents)}
                  </span>
                  <Link
                    href={`/${slug}/book/${service.id}`}
                    className={buttonVariants()}
                  >
                    Book
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
          <span>
            Powered by{" "}
            <span className="font-medium text-foreground">LORA</span> · 0%
            booking fees
          </span>
          <Link
            href="/track"
            className="transition-colors hover:text-foreground"
          >
            Track a booking
          </Link>
        </div>
      </footer>
    </div>
  );
}
