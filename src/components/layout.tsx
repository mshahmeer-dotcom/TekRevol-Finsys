import React from 'react';
export { PageContent, PageHeader } from '@/components/page-components';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/components/ui/sidebar';
import { Link, useLocation } from 'wouter';
import { Briefcase, Building, CalendarDays, CreditCard, DollarSign, FileText, Globe, Landmark, LayoutDashboard, List, RefreshCw, Settings, Wallet } from 'lucide-react';

const navGroups = [
  {
    label: "Reports",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Consolidated P&L", href: "/consolidated", icon: Globe },
      { name: "Monthly P&L", href: "/monthly-pl", icon: CalendarDays },
      { name: "CA P&L", href: "/pl/CA", icon: FileText },
      { name: "TX P&L", href: "/pl/TX", icon: FileText },
      { name: "UAE P&L", href: "/pl/UAE", icon: FileText },
      { name: "BuzzFlick P&L", href: "/pl/BuzzFlick", icon: FileText },
      { name: "Allocation Engine", href: "/allocation", icon: Briefcase },
      { name: "Intercompany", href: "/intercompany", icon: RefreshCw },
    ]
  },
  {
    label: "Source Data",
    items: [
      { name: "Bank Transaction", href: "/bank-spending", icon: Landmark },
    ]
  },
  {
    label: "Configuration & Rules",
    items: [
      { name: "Chart of Accounts", href: "/accounts", icon: List },
      { name: "Exchange Rates", href: "/exchange-rates", icon: Wallet },
      { name: "Allocation Rules", href: "/allocation-rules", icon: Settings },
    ]
  }
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r-0 border-sidebar-border shadow-none">
          <SidebarHeader className="p-4 flex items-center justify-start border-b border-sidebar-border mb-2">
            <div className="flex items-center gap-2 font-mono text-sm tracking-tighter font-semibold text-sidebar-foreground uppercase">
              <div className="size-6 flex items-center justify-center">
                <img src="/logo.png" alt="TekRevol FinSys" className="size-6 object-contain" />
              </div>
              TekRevol FinSys
            </div>
          </SidebarHeader>
          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-xs uppercase tracking-widest font-mono text-sidebar-foreground/50">{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={location === item.href} tooltip={item.name}>
                          <Link href={item.href} className="flex items-center gap-2 text-sm font-medium">
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background border-l">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
