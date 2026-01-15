import { Navbar } from "@/components/Navbar";
import { useRegions, useCreateRegion, useDeleteRegion } from "@/hooks/use-regions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRegionSchema } from "@shared/schema";
import { z } from "zod";
import { Trash2, Plus, Loader2, Pencil, X, Check } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const regionSchema = insertRegionSchema.extend({
  deliveryPrice: z.string().min(1, "Price is required"),
});

type RegionForm = z.infer<typeof regionSchema>;

export default function RegionManager() {
  const { data: regions, isLoading } = useRegions();
  const { mutate: createRegion, isPending } = useCreateRegion();
  const { mutate: deleteRegion } = useDeleteRegion();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);

  const updateRegionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RegionForm }) => {
      const res = await apiRequest("PUT", `/api/regions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      toast({ title: "Region Updated" });
      setEditingId(null);
    },
  });

  const form = useForm<RegionForm>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: "",
      deliveryPrice: "",
    },
  });

  const editForm = useForm<RegionForm>({
    resolver: zodResolver(regionSchema),
  });

  const onSubmit = (data: RegionForm) => {
    createRegion(data, {
      onSuccess: () => {
        form.reset();
        toast({ title: "Region Added", description: `${data.name} added successfully.` });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container-custom py-12">
        <h1 className="text-3xl font-display font-bold mb-8">Delivery Regions</h1>

        <div className="grid md:grid-cols-2 gap-12">
          {/* List */}
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/20">
              <h2 className="font-semibold">Existing Regions</h2>
            </div>
            <div className="divide-y divide-border">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Loading...</div>
              ) : regions?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No regions found.</div>
              ) : (
                regions?.map((region) => (
                  <div key={region.id} className="p-4 flex justify-between items-center hover:bg-muted/10">
                    {editingId === region.id ? (
                      <div className="flex-1 flex gap-2 items-end">
                        <div className="flex-1">
                          <Input {...editForm.register("name")} defaultValue={region.name} className="h-8" />
                        </div>
                        <div className="w-24">
                          <Input type="number" {...editForm.register("deliveryPrice")} defaultValue={region.deliveryPrice} className="h-8" />
                        </div>
                        <button
                          onClick={editForm.handleSubmit((data) => updateRegionMutation.mutate({ id: region.id, data }))}
                          className="p-1 hover:bg-green-50 text-green-600 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 hover:bg-gray-50 text-gray-600 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="font-medium">{region.name}</h4>
                          <p className="text-sm text-muted-foreground">Fee: KES {Number(region.deliveryPrice).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(region.id);
                              editForm.reset({
                                name: region.name,
                                deliveryPrice: region.deliveryPrice,
                              });
                            }}
                            className="p-2 hover:bg-muted/20 text-muted-foreground rounded-full transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRegion(region.id)}
                            className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Form */}
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm h-fit">
             <div className="p-6 border-b border-border bg-muted/20">
              <h2 className="font-semibold">Add New Region</h2>
            </div>
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Westlands" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Fee (KES)</FormLabel>
                        <FormControl><Input type="number" placeholder="200" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <button type="submit" disabled={isPending} className="w-full btn-primary py-3 rounded-lg font-medium flex items-center justify-center gap-2">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Region
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
