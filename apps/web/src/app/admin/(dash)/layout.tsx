"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  Loader2,
  LogOut,
  Scissors,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canManage, humanize, type Me } from "@/lib/admin";
import { loraAuthed } from "@/lib/lora-authed";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface AdminContextValue {
  me: Me;
}

const AdminContext = createContext<AdminContextValue | null>(null);

/** Access the authenticated admin user resolved by the layout. */
export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within the admin layout");
  return ctx;
}

const NAV = [
  { href: "/admin", label: "Bookings", icon: CalendarClock, manageOnly: false },
  {
    href: "/admin/services",
    label: "Services",
    icon: Scissors,
    manageOnly: true,
  },
  { href: "/admin/staff", label: "Staff", icon: Users, manageOnly: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [phase, setPhase] = useState<"checking" | "ready" | "error">(
    "checking",
  );

  // Session guard + one-time profile load; persists across dashboard tabs.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      try {
        const res = await loraAuthed.GET("/v1/auth/me");
        if (!active) return;
        if (res.error || !res.data) {
          setPhase("error");
          return;
        }
        setMe(res.data as Me);
        setPhase("ready");
      } catch {
        if (active) setPhase("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (phase === "checking" || !me) {
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
            Couldn&apos;t load your account.
          </p>
          <Button className="mt-4" variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  const links = NAV.filter((n) => !n.manageOnly || canManage(me.role));

  return (
    <AdminContext.Provider value={{ me }}>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-6">
              <span className="font-semibold tracking-tight">LORA</span>
              <nav className="flex items-center gap-1">
                {links.map((n) => {
                  const active = pathname === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <n.icon className="size-4" />
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {me.email}
              </span>
              <Badge variant="outline">{humanize(me.role)}</Badge>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </header>
        {children}
      </div>
    </AdminContext.Provider>
  );
}
