import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Registration from "@/pages/registration";
import Workshops from "@/pages/workshops";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin";
import ConfirmationPage from "@/pages/confirmation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Registration} />
      <Route path="/registration" component={Registration} />
      <Route path="/workshops" component={Workshops} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/confirmation" component={ConfirmationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
