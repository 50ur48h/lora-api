"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canManage, type StaffMember } from "@/lib/admin";
import { loraAuthed } from "@/lib/lora-authed";
import { StoreSelect, useAdminStores } from "../stores";
import { useAdmin } from "../layout";

export default function StaffPage() {
  const { me } = useAdmin();
  const { stores, storeId, setStoreId } = useAdminStores();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async (sid: string) => {
    const res = await loraAuthed.GET("/v1/staff", {
      params: { query: { storeId: sid } },
    });
    if (res.error || !res.data) throw new Error("load failed");
    return res.data as StaffMember[];
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!storeId) return;
    let active = true;
    setStaff(null);
    void load(storeId)
      .then((data) => active && setStaff(data))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [storeId, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!canManage(me.role)) {
    return <Notice>You don&apos;t have access to manage staff.</Notice>;
  }
  if (stores !== null && stores.length === 0) {
    return <Notice>No stores yet.</Notice>;
  }

  function upsert(member: StaffMember) {
    setStaff((prev) => {
      const list = prev ?? [];
      const exists = list.some((s) => s.id === member.id);
      const next = exists
        ? list.map((s) => (s.id === member.id ? member : s))
        : [...list, member];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Staff</h1>
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
          <StaffForm
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
            Couldn&apos;t load staff.
          </p>
        )}
        {!error && staff === null && (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {staff?.length === 0 && !creating && (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No staff yet. Add your first team member.
          </p>
        )}
        {staff?.map((s) =>
          editingId === s.id ? (
            <StaffForm
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
            <StaffRow
              key={s.id}
              member={s}
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

function StaffRow({
  member,
  onEdit,
  onToggled,
}: {
  member: StaffMember;
  onEdit: () => void;
  onToggled: (s: StaffMember) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      const res = await loraAuthed.PATCH("/v1/staff/{id}", {
        params: { path: { id: member.id } },
        body: { active: !member.active },
      });
      if (res.data) onToggled(res.data as StaffMember);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{member.name}</span>
          {!member.active && <Badge variant="outline">inactive</Badge>}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {member.jobTitle ?? "Team member"}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleActive} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {member.active ? "Deactivate" : "Activate"}
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function StaffForm({
  storeId,
  initial,
  onCancel,
  onSaved,
}: {
  storeId: string;
  initial?: StaffMember;
  onCancel: () => void;
  onSaved: (s: StaffMember) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      name: name.trim(),
      jobTitle: jobTitle.trim() || undefined,
    };
    try {
      const res = initial
        ? await loraAuthed.PATCH("/v1/staff/{id}", {
            params: { path: { id: initial.id } },
            body: payload,
          })
        : await loraAuthed.POST("/v1/staff", {
            body: { storeId, ...payload },
          });
      if (res.error || !res.data) throw new Error("save failed");
      onSaved(res.data as StaffMember);
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="staff-name">Name</Label>
          <Input
            id="staff-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aisha Rahman"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-title">Job title</Label>
          <Input
            id="staff-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Senior Therapist"
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
