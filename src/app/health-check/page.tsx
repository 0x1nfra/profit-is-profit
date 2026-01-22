// src/app/health-check/page.tsx
import { supabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function checkDatabase() {
  try {
    if (!supabaseAdmin) {
      return { status: false, error: "Supabase admin client not initialized" };
    }

    const { data, error } = await supabaseAdmin.from("users").select("id").limit(1);

    return { status: !error, error: error?.message };
  } catch (err) {
    return { status: false, error: String(err) };
  }
}

async function checkHelius() {
  // Placeholder for Helius API check
  const apiKey = process.env.HELIUS_API_KEY;
  return {
    status: !!apiKey,
    error: !apiKey ? "API key not configured" : undefined,
  };
}

async function checkEnvironment() {
  const checks = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    heliusKey: !!process.env.HELIUS_API_KEY,
  };

  const allPassing = Object.values(checks).every((v) => v);
  return { status: allPassing, checks };
}

export default async function HealthCheckPage() {
  const [dbCheck, heliusCheck, envCheck] = await Promise.all([
    checkDatabase(),
    checkHelius(),
    checkEnvironment(),
  ]);

  const allHealthy = dbCheck.status && heliusCheck.status && envCheck.status;

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health Check</h1>
            <p className="text-muted-foreground mt-1">
              Monitor all service connections and dependencies
            </p>
          </div>
          <Badge
            variant={allHealthy ? "default" : "destructive"}
            className="text-sm bg-green-400 text-black"
          >
            {allHealthy ? "✓ All Systems Operational" : "⚠ Issues Detected"}
          </Badge>
        </div>

        {/* Service Checks */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Database Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Database (Supabase)</span>
                <StatusBadge status={dbCheck.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <CheckItem label="Connection" status={dbCheck.status} />
                {dbCheck.error && (
                  <p className="text-xs text-destructive mt-2">
                    Error: {dbCheck.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Helius API Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Helius API</span>
                <StatusBadge status={heliusCheck.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <CheckItem
                  label="API Key Configured"
                  status={heliusCheck.status}
                />
                {heliusCheck.error && (
                  <p className="text-xs text-destructive mt-2">
                    Error: {heliusCheck.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Environment Variables</span>
                <StatusBadge status={envCheck.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <CheckItem
                  label="Supabase URL"
                  status={envCheck.checks.supabaseUrl}
                />
                <CheckItem
                  label="Supabase Key"
                  status={envCheck.checks.supabaseKey}
                />
                <CheckItem
                  label="Helius Key"
                  status={envCheck.checks.heliusKey}
                />
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for Future Services */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">Future Services</span>
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Additional service checks will appear here as the app grows.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Timestamp */}
        <div className="text-center text-xs text-muted-foreground">
          Last checked: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <Badge
      variant={status ? "default" : "destructive"}
      className="text-xs bg-green-400 text-black"
    >
      {status ? "✓ OK" : "✗ Failed"}
    </Badge>
  );
}

function CheckItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={status ? "text-green-600" : "text-destructive"}>
        {status ? "✓" : "✗"}
      </span>
    </div>
  );
}
