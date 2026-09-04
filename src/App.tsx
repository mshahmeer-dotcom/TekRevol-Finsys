import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { AppLayout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import Revenue from "@/pages/revenue";
import AllocationEngine from "@/pages/allocation";
import BrandPL from "@/pages/brand-pl";
import ConsolidatedPL from "@/pages/consolidated-pl";
import MonthlyPL from "@/pages/monthly-pl";
import BankSpending from "@/pages/bank-spending";
import Intercompany from "@/pages/intercompany";
import Accounts from "@/pages/accounts";
import ExchangeRates from "@/pages/exchange-rates";
import AllocationRules from "@/pages/allocation-rules";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/revenue" component={Revenue} />
        <Route path="/allocation" component={AllocationEngine} />
        <Route path="/pl/:entity" component={BrandPL} />
        <Route path="/consolidated" component={ConsolidatedPL} />
        <Route path="/monthly-pl" component={MonthlyPL} />
        <Route path="/bank-spending" component={BankSpending} />
        <Route path="/intercompany" component={Intercompany} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/exchange-rates" component={ExchangeRates} />
        <Route path="/allocation-rules" component={AllocationRules} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
