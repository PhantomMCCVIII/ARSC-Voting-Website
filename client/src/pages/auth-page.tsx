import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
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
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SystemSettings } from "@shared/schema";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { data: systemSettings } = useQuery<{systemSettings: SystemSettings}>({
    queryKey: ["/api/candidates"],
  });

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      studentName: "",
      referenceNumber: "",
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            {systemSettings?.systemSettings?.leftLogoUrl ? (
              <img 
                src={systemSettings.systemSettings.leftLogoUrl} 
                alt="Left Logo"
                className="h-8 w-8"
              />
            ) : (
              <Vote className="h-8 w-8 text-primary" />
            )}
            ARSC Voting System
            {systemSettings?.systemSettings?.rightLogoUrl ? (
              <img 
                src={systemSettings.systemSettings.rightLogoUrl} 
                alt="Right Logo"
                className="h-8 w-8"
              />
            ) : (
              <Vote className="h-8 w-8 text-primary" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit((data) =>
                loginMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={loginForm.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}