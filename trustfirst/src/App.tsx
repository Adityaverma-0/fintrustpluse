import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import SignupFreelancer from "@/pages/signup-freelancer";
import SignupClient from "@/pages/signup-client";
import BrowseJobs from "@/pages/browse-jobs";
import BrowseFreelancers from "@/pages/browse-freelancers";
import JobDetail from "@/pages/job-detail";
import FreelancerProfile from "@/pages/freelancer-profile";
import FreelancerDashboard from "@/pages/freelancer-dashboard";
import ClientDashboard from "@/pages/client-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Messages from "@/pages/messages";
import PostJob from "@/pages/post-job";
import WalletPage from "@/pages/wallet";
import WithdrawPage from "@/pages/withdraw";
import WhyTrustFirst from "@/pages/why-trustfirst";
import Pricing from "@/pages/pricing";
import Enterprise from "@/pages/enterprise";
import ProjectsPage from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import InvoiceCenter from "@/pages/invoice-center";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import VerifyResetOtp from "@/pages/verify-reset-otp";
import ResetPassword from "@/pages/reset-password";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType<any>; roles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user && user.emailVerified === false && user.role !== "admin") {
    return <Redirect to={`/verify-email?email=${encodeURIComponent(user.email)}`} />;
  }
  if (roles && user && !roles.includes(user.role)) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/signup/freelancer" component={SignupFreelancer} />
      <Route path="/signup/client" component={SignupClient} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/verify-reset-otp" component={VerifyResetOtp} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/jobs" component={BrowseJobs} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/freelancers" component={BrowseFreelancers} />
      <Route path="/freelancers/:id" component={FreelancerProfile} />
      <Route path="/dashboard/freelancer">
        {() => <ProtectedRoute component={FreelancerDashboard} roles={["freelancer"]} />}
      </Route>
      <Route path="/dashboard/client">
        {() => <ProtectedRoute component={ClientDashboard} roles={["client"]} />}
      </Route>
      <Route path="/dashboard/admin">
        {() => <ProtectedRoute component={AdminDashboard} roles={["admin"]} />}
      </Route>
      <Route path="/messages">
        {() => <ProtectedRoute component={Messages} />}
      </Route>
      <Route path="/post-job">
        {() => <ProtectedRoute component={PostJob} roles={["client"]} />}
      </Route>
      <Route path="/wallet">
        {() => <ProtectedRoute component={WalletPage} />}
      </Route>
      <Route path="/withdraw">
        {() => <ProtectedRoute component={WithdrawPage} roles={["freelancer"]} />}
      </Route>
      <Route path="/invoices">
        {() => <ProtectedRoute component={InvoiceCenter} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={ProjectsPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      <Route path="/projects/:id">
        {() => <ProtectedRoute component={ProjectDetail} />}
      </Route>
      <Route path="/why-trustfirst" component={WhyTrustFirst} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/enterprise" component={Enterprise} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
