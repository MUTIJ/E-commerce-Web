import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/Navbar";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthForm = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: AuthForm) {
    try {
      const endpoint = isLogin ? "/api/login-manual" : "/api/register";
      const res = await apiRequest("POST", endpoint, data);
      
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: isLogin ? "Login successful" : "Registration successful",
        });
        setLocation("/");
      } else {
        const error = await res.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Something went wrong",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to the server",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display font-bold">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Enter your credentials to access your account" 
                : "Join us to start shopping for premium Pure Pishowi rice"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full btn-primary h-11" disabled={form.formState.isSubmitting}>
                  {isLogin ? "Login" : "Sign Up"}
                </Button>
              </form>
            </Form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-11" 
              onClick={() => window.location.href = "/api/login"}
            >
              Google / Replit Auth
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
