"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, formatPrice } from "@/lib/format";
import { canManage, type Service } from "@/lib/admin";
import { loraAuthed } from "@/lib/lora-authed";
import { StoreSelect, useAdminStores } from "../stores";
import { useAdmin } from "../layout";

export default function ServicesPage() {
  const { me } = useAdmin();
  const { stores, storeId, setStoreId } = useAdminStores();
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async (sid: string) => {
    const res = await loraAuthed.GET("/v1/services", {
      params: { query: { storeId: sid } },
    });
    if (res.error || !res.data) throw new Error("load failed");
    return res.data as Service[];
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!storeId) return;
    let active = true;
    setServices(null);
    void load(storeId)
      .then((data) => active && setServices(data))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [storeId, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!canManage(me.role)) {
    return <Notice>You don&apos;t have access to manage services.</Notice>;
  }
  if (stores !== null && stores.length === 0) {
    return <Notice>No stores yet.</Notice>;
  }

  function upsert(service: Service) {
    setServices((prev) => {
      const list = prev ?? [];
      const exists = list.some((s) => s.id === service.id);
      const next = exists
        ? list.map((s) => (s.id === service.id ? service : s))
        : [...list, service];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Services</h1>
        <div className="flex items-center gap-2">
          <StoreSelect
            stores={stores}
            storeId={storeId}
            onChange={setStoreId}
          />
          <Button
            size="sm"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
            }}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      {creating && storeId && (
        <div className="mt-4">
          <ServiceForm
            storeId={storeId}
            onCancel={() => setCreating(false)}
            onSaved={(s) => {
              upsert(s);
              setCreating(false);
            }}
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {error && (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load services.
          </p>
        )}
        {!error && services === null && (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {services?.length === 0 && !creating && (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No services yet. Add your first one.
          </p>
        )}
        {services?.map((s) =>
          editingId === s.id ? (
            <ServiceForm
              key={s.id}
              storeId={s.storeId}
              initial={s}
              onCancel={() => setEditingId(null)}
              onSaved={(updated) => {
                upsert(updated);
                setEditingId(null);
              }}
            />
          ) : (
            <ServiceRow
              key={s.id}
              service={s}
              onEdit={() => {
                setEditingId(s.id);
                setCreating(false);
              }}
              onToggled={upsert}
            />
          ),
        )}
      </div>
    </main>
  );
}

function ServiceRow({
  service,
  onEdit,
  onToggled,
}: {
  service: Service;
  onEdit: () => void;
  onToggled: (s: Service) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      const res = await loraAuthed.PATCH("/v1/services/{id}", {
        params: { path: { id: service.id } },
        body: { active: !service.active },
      });
      if (res.data) onToggled(res.data as Service);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{service.name}</span>
          {!service.active && <Badge variant="outline">inactive</Badge>}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {formatDuration(service.durationMin)}
          {service.bufferMin > 0 && ` · ${service.bufferMin} min buffer`} ·{" "}
          {formatPrice(service.priceCents)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleActive} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {service.active ? "Deactivate" : "Activate"}
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function ServiceForm({
  storeId,
  initial,
  onCancel,
  onSaved,
}: {
  storeId: string;
  initial?: Service;
  onCancel: () => void;
  onSaved: (s: Service) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [durationMin, setDurationMin] = useState(
    String(initial?.durationMin ?? 60),
  );
  const [bufferMin, setBufferMin] = useState(String(initial?.bufferMin ?? 0));
  const [price, setPrice] = useState(
    initial ? (initial.priceCents / 100).toFixed(2) : "",
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      name: name.trim(),
      durationMin: Math.round(Number(durationMin)),
      bufferMin: Math.round(Number(bufferMin)) || 0,
      priceCents: Math.round(Number(price) * 100),
    };
    try {
      const res = initial
        ? await loraAuthed.PATCH("/v1/services/{id}", {
            params: { path: { id: initial.id } },
            body: payload,
          })
        : await loraAuthed.POST("/v1/services", {
            body: { storeId, ...payload },
          });
      if (res.error || !res.data) throw new Error("save failed");
      onSaved(res.data as Service);
    } catch {
      setErr("Couldn't save. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="space-y-1.5">
        <Label htmlFor="svc-name">Name</Label>
        <Input
          id="svc-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Signature Facial"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="svc-duration">Duration (min)</Label>
          <Input
            id="svc-duration"
            type="number"
            min={1}
            required
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="svc-buffer">Buffer (min)</Label>
          <Input
            id="svc-buffer"
            type="number"
            min={0}
            value={bufferMin}
            onChange={(e) => setBufferMin(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="svc-price">Price (MYR)</Label>
          <Input
            id="svc-price"
            type="number"
            min={0}
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="120.00"
          />
        </div>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {initial ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {children}
      </p>
    </main>
  );
}
