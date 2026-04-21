import { Navbar } from "@/components/Navbar";
import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Package, CheckCircle2, Truck, Clock } from "lucide-react";
import { CartDrawer } from "@/components/CartDrawer";
import { getImageSrc } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const STATUS_STEPS = [
  { status: "pending", label: "Order Placed", icon: Clock },
  { status: "processing", label: "Processing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle2 },
];

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const { isAuthenticated } = useAuth();

  // Redirect if not logged in is handled by API 401 response mostly, 
  // but good to show loading state or similar here.

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="container-custom py-12">
        <h1 className="text-3xl font-display font-bold mb-8">My Orders</h1>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-border shadow-sm">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground">Once you place an order, track it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Accordion type="multiple" className="space-y-4">
              {orders.map((order) => {
                const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === order.status) || 0;
                return (
                  <AccordionItem key={order.id} value={`order-${order.id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden"
                    >
                      <AccordionTrigger className="p-6 border-b border-border/50 flex flex-wrap gap-4 justify-between items-center bg-muted/20">
                        <div>
                          <p className="text-sm text-muted-foreground">Order ID</p>
                          <p className="font-mono font-bold">#{order.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date Placed</p>
                          <p className="font-medium">{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="font-bold text-primary">KES {Number(order.totalAmount).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="p-6">
                        <div className="space-y-4 mb-8">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                {/* @ts-ignore - nested relation type */}
                                <img src={getImageSrc(item.product?.imageUrl)} alt="Product" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                {/* @ts-ignore */}
                                <h4 className="font-medium">{item.product?.name}</h4>
                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-medium">KES {Number(item.priceAtPurchase).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>

                        {order.status !== 'cancelled' && (
                          <div className="relative">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 rounded-full" />
                            <div 
                              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000"
                              style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                            />
                            <div className="relative flex justify-between">
                              {STATUS_STEPS.map((step, idx) => {
                                const Icon = step.icon;
                                const isActive = idx <= currentStepIndex;
                                return (
                                  <div key={step.status} className="flex flex-col items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors ${
                                      isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </motion.div>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </main>
    </div>
  );
}
