import { Navbar } from "@/components/Navbar";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useRegions } from "@/hooks/use-regions";
import { useCreateOrder } from "@/hooks/use-orders";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
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
  regionId: z.string().min(1, "Please select a region"),
  paymentMethod: z.enum(["cod", "mpesa"]),
  mpesaPhoneNumber: z.string().optional(),
}).refine((data) => {
  if (data.paymentMethod === "mpesa" && (!data.mpesaPhoneNumber || data.mpesaPhoneNumber.length < 10)) {
    return false;
  }
  return true;
}, {
  message: "Valid MPESA phone number is required",
  path: ["mpesaPhoneNumber"],
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Cart() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { data: regions } = useRegions();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [stkPushInProgress, setStkPushInProgress] = useState(false);

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

    createOrder(
      {
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        deliveryAddress: data.deliveryAddress,
        regionId: Number(data.regionId),
        paymentMethod: data.paymentMethod,
        mpesaPhoneNumber: data.mpesaPhoneNumber,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      },
      {
        onSuccess: async (order) => {
          clearCart();
          
          // If M-Pesa payment, trigger STK push
          if (data.paymentMethod === "mpesa" && data.mpesaPhoneNumber) {
            setStkPushInProgress(true);
            try {
              const stkResponse = await fetch("/api/mpesa/stk-push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phoneNumber: data.mpesaPhoneNumber,
                  amount: Number(order.totalAmount),
                  orderId: order.id,
                }),
                credentials: "include",
              });

              const stkData = await stkResponse.json();

              if (stkData.success) {
                toast({
                  title: "Payment Prompt Sent! 📱",
                  description: `STK push initiated on ${data.mpesaPhoneNumber}. Check your phone for the M-Pesa prompt.`,
                });
              } else {
                toast({
                  title: "Payment Initiated",
                  description: `Please complete the payment of KES ${order.totalAmount} to proceed. Check your phone for the M-Pesa prompt.`,
                  variant: "default",
                });
              }
            } catch (error) {
              toast({
                title: "Order Created",
                description: `Order #${order.id} created. Please complete payment on M-Pesa for ${data.mpesaPhoneNumber}.`,
              });
            } finally {
              setStkPushInProgress(false);
              setLocation("/orders");
            }
          } else {
            toast({
              title: "Order Placed Successfully! 🎉",
              description: `Order #${order.id} has been received.`,
            });
            setLocation("/orders");
          }
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
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0 rounded-xl border border-border p-4 hover:bg-muted/50 cursor-pointer">
                                <FormControl>
                                  <RadioGroupItem value="cod" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer flex-1">
                                  Cash on Delivery
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 rounded-xl border border-border p-4 hover:bg-muted/50 cursor-pointer">
                                <FormControl>
                                  <RadioGroupItem value="mpesa" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer flex-1">
                                  M-PESA (STK Push)
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("paymentMethod") === "mpesa" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl"
                      >
                         <FormField
                          control={form.control}
                          name="mpesaPhoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-green-800">M-PESA Phone Number</FormLabel>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-600" />
                                <FormControl>
                                  <Input placeholder="07XX XXX XXX" {...field} className="bg-white border-green-200 focus:ring-green-500 rounded-xl" />
                                </FormControl>
                              </div>
                              <p className="text-xs text-green-700 mt-2">
                                You will receive an MPESA prompt on this phone to complete payment.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    )}
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
                    disabled={isPending || stkPushInProgress}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending || stkPushInProgress ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {stkPushInProgress ? "Sending Payment Prompt..." : "Processing..."}
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
