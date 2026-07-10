import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "./NotificationBell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="border-b sticky top-0 z-50 text-[20px] font-bold bg-[#325b5c]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-left text-[30px] ml-[0px] mr-[0px] text-[#67cf38]">fintrust+</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/freelancers" className="hover:text-foreground transition-colors text-[#fffcfc] text-[20px]">Find Talent</Link>
            <Link href="/jobs" className="hover:text-foreground transition-colors text-[20px] text-[#ffffff]">Find Work</Link>
            <Link href="/why-trustfirst" className="hover:text-foreground transition-colors text-[20px] text-[#ededed]">Why fintrust+</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors text-[#ffffff] text-[20px]">Pricing</Link>
            <Link href="/enterprise" className="hover:text-foreground transition-colors text-[20px] text-[#fafafa]">Enterprise</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search talent or jobs..." 
              className="w-full rounded-full border-none focus-visible:ring-1 focus-visible:ring-primary pl-[36px] bg-white"
            />
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${user.role}`}>Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/projects">Projects</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wallet">Wallet</Link>
                  </DropdownMenuItem>
                  {user.role === "freelancer" && (
                    <DropdownMenuItem asChild>
                      <Link href="/withdraw">Withdraw Funds</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/invoices">Invoice Center</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages">Messages</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-flex px-4 py-2 font-medium hover:text-primary transition-colors text-border text-lg justify-center items-center">
                Log In
              </Link>
              <Link href="/signup">
                <Button className="rounded-full hover:bg-primary/90 text-white font-medium px-6 bg-[#47b013e6] text-lg">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-emerald-800">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#325b5c] border-l-0 text-white w-64 p-6">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-left text-[#67cf38] text-2xl font-bold">fintrust+</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col gap-5 text-lg font-semibold mt-6">
                <Link href="/freelancers" className="hover:text-emerald-300 transition-colors">Find Talent</Link>
                <Link href="/jobs" className="hover:text-emerald-300 transition-colors">Find Work</Link>
                <Link href="/why-trustfirst" className="hover:text-emerald-300 transition-colors">Why fintrust+</Link>
                <Link href="/pricing" className="hover:text-emerald-300 transition-colors">Pricing</Link>
                <Link href="/enterprise" className="hover:text-emerald-300 transition-colors">Enterprise</Link>
                
                {isAuthenticated && user && (
                  <>
                    <div className="h-px bg-emerald-800 my-2" />
                    <Link href={`/dashboard/${user.role}`} className="hover:text-emerald-300 transition-colors text-emerald-100">Dashboard</Link>
                    <Link href="/profile" className="hover:text-emerald-300 transition-colors text-emerald-100">My Profile</Link>
                    <Link href="/projects" className="hover:text-emerald-300 transition-colors text-emerald-100">Projects</Link>
                    <Link href="/wallet" className="hover:text-emerald-300 transition-colors text-emerald-100">Wallet</Link>
                    {user.role === "freelancer" && (
                      <Link href="/withdraw" className="hover:text-emerald-300 transition-colors text-emerald-100">Withdraw Funds</Link>
                    )}
                    <Link href="/invoices" className="hover:text-emerald-300 transition-colors text-emerald-100">Invoice Center</Link>
                    <Link href="/messages" className="hover:text-emerald-300 transition-colors text-emerald-100">Messages</Link>
                    <button onClick={logout} className="text-left hover:text-emerald-300 transition-colors text-red-300 mt-4">Log Out</button>
                  </>
                )}
                
                {!isAuthenticated && (
                  <>
                    <div className="h-px bg-emerald-800 my-2" />
                    <Link href="/login" className="hover:text-emerald-300 transition-colors text-emerald-100">Log In</Link>
                    <Link href="/signup" className="hover:text-emerald-300 transition-colors text-emerald-100">Sign Up</Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
