import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import Cart from "@/pages/Cart";
import Orders from "@/pages/Orders";
import AuthPage from "@/pages/AuthPage";
import AdminDashboard from "@/pages/admin/Dashboard";
import ProductManager from "@/pages/admin/ProductManager";
import OrderManager from "@/pages/admin/OrderManager";
import RegionManager from "@/pages/admin/RegionManager";
import CategoryManager from "@/pages/admin/CategoryManager";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/cart" component={Cart} />
      <Route path="/orders" component={Orders} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Admin Routes - Ideally protected by role check wrapper */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/products" component={ProductManager} />
      <Route path="/admin/orders" component={OrderManager} />
      <Route path="/admin/regions" component={RegionManager} />
      <Route path="/admin/categories" component={CategoryManager} />

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
