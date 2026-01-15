import { Navbar } from "@/components/Navbar";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function OrderManager() {
  const { data: orders, isLoading } = useOrders();
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const { toast } = useToast();

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatus(
      { id: orderId, status: newStatus },
      {
        onSuccess: () => {
          toast({ title: "Updated", description: `Order #${orderId} status updated to ${newStatus}` });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-custom py-12">
        <h1 className="text-3xl font-display font-bold mb-8">Manage Orders</h1>

        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">#{order.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {order.guestName || order.user?.firstName || "Guest"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.guestPhone || order.user?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.createdAt ? format(new Date(order.createdAt), "MMM d, HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.paymentMethod === 'mpesa' ? 'M-PESA' : 'Cash'}
                    </TableCell>
                    <TableCell className="font-bold">KES {Number(order.totalAmount).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                         order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                         order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                         'bg-amber-100 text-amber-700 border-amber-200'
                       }`}>
                         {order.status}
                       </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={order.status}
                        onValueChange={(val) => handleStatusChange(order.id, val)}
                      >
                        <SelectTrigger className="w-[140px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
