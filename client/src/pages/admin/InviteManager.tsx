import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";

export default function InviteManager() {
  const [email, setEmail] = useState("");
  const [expires, setExpires] = useState<number>(72);
  const [viewStats, setViewStats] = useState(false);
  const [isSuperInvite, setIsSuperInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const { toast } = useToast();

  async function createInvite() {
    try {
      const body: any = { email, expiresInHours: expires };
      if (viewStats) body.permissions = { viewStats: true };
      if (isSuperInvite) body.isSuperInvite = true;

      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        let errMessage = "Failed to create invite";
        try {
          const errJson = await res.json();
          errMessage = errJson?.message || JSON.stringify(errJson);
        } catch {
          try {
            const text = await res.text();
            errMessage = text || errMessage;
          } catch {}
        }
        console.error("Invite creation failed:", res.status, errMessage);
        toast({ variant: "destructive", title: "Error", description: errMessage });
        return;
      }

      const data = await res.json();
      setInviteUrl(data.inviteUrl);
      toast({ title: "Invite created", description: "Invite URL is ready." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create invite" });
    }
  }

  function copyInvite() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast({ title: "Copied", description: "Invite URL copied to clipboard" });
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex items-center justify-center py-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-2xl">
          <h1 className="text-2xl font-bold mb-6">Invite Manager</h1>
          <Form>
            <div className="grid grid-cols-1 gap-4">
              <FormItem>
                <FormLabel>Email (optional)</FormLabel>
                <FormControl>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="invitee@example.com" />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Expires (hours)</FormLabel>
                <FormControl>
                  <Input type="number" value={String(expires)} onChange={(e) => setExpires(Number(e.target.value))} />
                </FormControl>
              </FormItem>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={viewStats} onChange={(e) => setViewStats(e.target.checked)} />
                <span>Grant viewStats permission</span>
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isSuperInvite} onChange={(e) => setIsSuperInvite(e.target.checked)} />
                <span>Make this a Super-Admin invite</span>
              </label>

              <div className="flex gap-3 mt-4">
                <Button onClick={createInvite}>Create Invite</Button>
                {inviteUrl && (
                  <Button variant="outline" onClick={copyInvite}>Copy Link</Button>
                )}
              </div>

              {inviteUrl && (
                <div className="mt-4 p-3 bg-muted rounded">
                  <p className="text-sm">Share this link with the recipient (keep it private):</p>
                  <div className="mt-2 break-all font-mono text-sm">{inviteUrl}</div>
                </div>
              )}
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}
