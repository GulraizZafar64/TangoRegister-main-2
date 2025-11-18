import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Sign in with Supabase Auth (client-side)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      if (!data.session) {
        toast({
          title: "Login Failed",
          description: "No session created",
          variant: "destructive",
        });
        return;
      }

      // Store token FIRST so apiRequest can use it
      localStorage.setItem("admin-token", data.session.access_token);

      // Now verify user is an admin by calling the backend
      try {
        const response = await apiRequest("GET", "/api/admin/verify");
        if (!response.ok) {
          // Get error details from response
          let errorMessage = "Admin privileges required";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            console.error("Admin verification error:", errorData);
          } catch {
            // Ignore JSON parse errors
          }
          
          // Not an admin - clean up and sign out
          localStorage.removeItem("admin-token");
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }
      } catch (err: any) {
        // Verification failed - clean up
        console.error("Admin verification exception:", err);
        localStorage.removeItem("admin-token");
        await supabase.auth.signOut();
        const errorMessage = err.message || "Admin verification failed";
        toast({
          title: "Access Denied",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Login Successful",
        description: "Welcome to the admin dashboard",
      });
      setLocation("/admin");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: error.message || "Unable to connect to the server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Access
          </CardTitle>
          <CardDescription>
            Dubai Tango Festival Admin Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Authorized personnel only</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}