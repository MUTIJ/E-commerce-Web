import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="h-24 w-24 text-accent opacity-50" />
        </div>
        <h1 className="text-4xl font-display font-bold text-foreground">404 - Page Not Found</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The page you are looking for does not exist or has been moved. 
          Maybe try checking our latest rice products?
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button size="lg" className="rounded-full">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
