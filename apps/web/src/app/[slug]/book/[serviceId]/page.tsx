import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { formatDuration, formatPrice } from "@/lib/format";
import { lora } from "@/lib/lora";
import { brandStyle } from "@/lib/theme";
import { BookingFlow } from "./booking-flow";

export const dynamic = "force-dynamic";

export default async function BookServicePage({
  params,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
}) {
  const { slug, serviceId } = await params;
  const { data: store, error } = await lora.GET("/v1/public/stores/{slug}", {
    params: { path: { slug } },
  });

  if (error || !store) {
    notFound();
  }

  const service = store.services.find((s) => s.id === serviceId);
  if (!service) {
    notFound();
  }

  return (
    <div style={brandStyle(store.theme)} className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-2xl px-6 py-8">
          <Link
            href={`/${slug}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {store.name}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            {service.name}
          </h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {formatDuration(service.durationMin)}
            </span>
            <span className="font-medium text-foreground">
              {formatPrice(service.priceCents)}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <BookingFlow
          slug={slug}
          serviceId={serviceId}
          timezone={store.timezone}
        />
      </main>
    </div>
  );
}
