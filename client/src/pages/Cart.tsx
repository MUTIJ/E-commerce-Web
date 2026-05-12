import { Navbar } from "@/components/Navbar";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useRegions } from "@/hooks/use-regions";
import { useCreateOrder } from "@/hooks/use-orders";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Minus, Plus, Trash2, ArrowRight, Loader2, Phone } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getImageSrc } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Checkout form schema
const checkoutSchema = z.object({
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  deliveryAddress: z.string().min(5, "Address must be at least 5 characters"),
  regionId: z.string().optional(),
  customRegion: z.string().optional(),
  paymentMethod: z.enum(["cod", "mpesa"]),
  mpesaPhoneNumber: z.string().optional(),
}).refine((data) => {
  if (!data.regionId && !data.customRegion) {
    return false;
  }
  if (data.paymentMethod === "mpesa" && (!data.mpesaPhoneNumber || data.mpesaPhoneNumber.length < 10)) {
    return false;
  }
  return true;
}, {
  message: "Please select a region or type one if it is not listed",
  path: ["regionId"],
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Cart() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { data: regions } = useRegions();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  // Commented out: stkPushInProgress state (using WhatsApp integration instead)
  // const [stkPushInProgress, setStkPushInProgress] = useState(false);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      guestName: "",
      guestPhone: "",
      deliveryAddress: "",
      regionId: "",
      paymentMethod: "cod",
      mpesaPhoneNumber: "",
    },
  });

  const selectedRegionId = form.watch("regionId");
  const selectedRegion = regions?.find((r) => String(r.id) === selectedRegionId);
  const deliveryFee = selectedRegion ? Number(selectedRegion.deliveryPrice) : 0;
  const grandTotal = total() + deliveryFee;

  const onSubmit = (data: CheckoutForm) => {
    if (!isAuthenticated && (!data.guestName || !data.guestPhone)) {
      toast({
        title: "Missing Details",
        description: "Please provide your name and phone number for delivery.",
        variant: "destructive",
      });
      return;
    }

    if (!data.regionId && !data.customRegion) {
      toast({
        title: "Region required",
        description: "Please select a region or type it if it is not listed.",
        variant: "destructive",
      });
      return;
    }

    createOrder(
      {
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        deliveryAddress: data.deliveryAddress,
        regionId: data.regionId ? Number(data.regionId) : undefined,
        customRegion: data.customRegion,
        paymentMethod: "cod",
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      },
      {
        onSuccess: async (order) => {
          clearCart();
          
          // Redirect to WhatsApp with order details
          const whatsappNumber = "254701354886"; // Your WhatsApp number
          const customerName = data.guestName || `${user?.firstName || ""}${user?.lastName ? ` ${user.lastName}` : ""}`.trim() || user?.email || "Customer";
          const region = regions?.find((r) => String(r.id) === selectedRegionId);
          const deliveryPrice = region ? Number(region.deliveryPrice) : 0;
          
          const selectedRegion = regions?.find((r) => String(r.id) === selectedRegionId);
          const regionName = selectedRegion?.name || data.customRegion || "Not specified";

          const whatsappMessage = `
Hello! 👋

I just placed an order with your shop:

📦 Order Details:
- Order ID: #${order.id}
- Region: ${regionName}
- Total Amount: KES ${order.totalAmount}
- Delivery Fee: KES ${deliveryPrice}
- Delivery Address: ${data.deliveryAddress}


Items Ordered:
${items.map((item) => `- ${item.name} (${item.weight}) x${item.quantity}`).join("\n")}

Please confirm my order. Thank you! 😊
          `.trim();

          const encodedMessage = encodeURIComponent(whatsappMessage);
          const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

          // Show success toast and redirect
          toast({
            title: "Order Placed Successfully! 🎉",
            description: `Order #${order.id} has been created. Opening WhatsApp to confirm with us...`,
          });

          // Open WhatsApp link in a new window
          setTimeout(() => {
            window.open(whatsappLink, "_blank");
            setLocation("/orders");
          }, 1500);

          // COMMENTED OUT: STK Push Integration (to be used later)
          // if (data.paymentMethod === "mpesa" && data.mpesaPhoneNumber) {
          //   setStkPushInProgress(true);
          //   try {
          //     const stkResponse = await fetch("/api/mpesa/stk-push", {
          //       method: "POST",
          //       headers: { "Content-Type": "application/json" },
          //       body: JSON.stringify({
          //         phoneNumber: data.mpesaPhoneNumber,
          //         amount: Number(order.totalAmount),
          //         orderId: order.id,
          //       }),
          //       credentials: "include",
          //     });
          //
          //     const stkData = await stkResponse.json();
          //
          //     if (stkData.success) {
          //       toast({
          //         title: "Payment Prompt Sent! 📱",
          //         description: `STK push initiated on ${data.mpesaPhoneNumber}. Check your phone for the M-Pesa prompt.`,
          //       });
          //     } else {
          //       toast({
          //         title: "Payment Initiated",
          //         description: `Please complete the payment of KES ${order.totalAmount} to proceed. Check your phone for the M-Pesa prompt.`,
          //         variant: "default",
          //       });
          //     }
          //   } catch (error) {
          //     toast({
          //       title: "Order Created",
          //       description: `Order #${order.id} created. Please complete payment on M-Pesa for ${data.mpesaPhoneNumber}.`,
          //     });
          //   } finally {
          //     setStkPushInProgress(false);
          //     setLocation("/orders");
          //   }
          // }
        },
      }
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <ShoppingBagIcon className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            Looks like you haven't made your choice yet. Browse our premium selection of rice.
          </p>
          <Link href="/products">
            <button className="btn-primary px-8 py-3 rounded-xl font-semibold">Start Shopping</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-custom py-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Order Summary & Cart Items */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <h2 className="text-xl font-semibold">Order Summary</h2>
              </div>
              <div className="p-6 space-y-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img src={getImageSrc(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{item.name}</h4>
                        <span className="font-semibold text-primary">
                          KES {(Number(item.price) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.weight}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-border rounded-lg h-8">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-2 h-full hover:bg-muted transition-colors disabled:opacity-50"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2 h-full hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive text-sm flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-lg shadow-stone-900/5 border border-border/50 p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Delivery Details</h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {!isAuthenticated && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="guestName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} className="rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guestPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="07XX XXX XXX" {...field} className="rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="regionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Region</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select your region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regions?.map((region) => (
                              <SelectItem key={region.id} value={String(region.id)}>
                                {region.name} (+KES {Number(region.deliveryPrice)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customRegion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Region</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Type region if not listed"
                            {...field}
                            className="rounded-xl"
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          If your delivery area is not listed above, type it here.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Address / Landmark</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Near Karen Hospital, Gate B" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border-t border-border pt-6 mt-6">
                    <p className="text-sm text-muted-foreground">
                      Payment selection is hidden. Orders are confirmed via WhatsApp.
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>KES {total().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery</span>
                      <span>KES {deliveryFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-foreground pt-2">
                      <span>Total</span>
                      <span>KES {grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Place Order <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ShoppingBagIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
