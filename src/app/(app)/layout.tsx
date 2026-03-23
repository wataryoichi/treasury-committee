"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

function LogoutButton() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2 ml-auto">
      <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
      <Button variant="ghost" size="sm" onClick={signOut}>
        ログアウト
      </Button>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold">Treasury Committee</h1>
            <LogoutButton />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
