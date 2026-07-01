"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/lib/admin";
import { loraAuthed } from "@/lib/lora-authed";

/** Loads the tenant's stores and tracks the selected one (defaults to first). */
export function useAdminStores() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [storeId, setStoreId] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    void loraAuthed
      .GET("/v1/stores")
      .then((res) => {
        if (!active) return;
        const list = (res.data ?? []) as Store[];
        setStores(list);
        if (list.length > 0) setStoreId((cur) => cur || list[0].id);
      })
      .catch(() => active && setStores([]));
    return () => {
      active = false;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { stores, storeId, setStoreId };
}

/** Store picker — hidden when the tenant has a single store. */
export function StoreSelect({
  stores,
  storeId,
  onChange,
}: {
  stores: Store[] | null;
  storeId: string;
  onChange: (id: string) => void;
}) {
  if (!stores || stores.length <= 1) return null;
  return (
    <select
      value={storeId}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
      aria-label="Store"
    >
      {stores.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
