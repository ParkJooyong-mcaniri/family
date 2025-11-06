"use client";

import { Button } from "@/components/ui/button";
import { Calendar, List, ChefHat, Home, Clock, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "홈",
      icon: Home,
    },
    {
      href: "/family-meals",
      label: "가족식단",
      icon: Calendar,
    },
    {
      href: "/meals",
      label: "식단리스트",
      icon: List,
    },
    {
      href: "/recipes",
      label: "레시피",
      icon: ChefHat,
    },
    {
      href: "/schedule",
      label: "일정 관리",
      icon: Clock,
    },
    {
      href: "/supplies",
      label: "생필품",
      icon: Package,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-around md:justify-start md:space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="flex flex-col items-center justify-center h-16 w-full md:h-12 md:w-auto md:flex-row md:space-x-2"
                >
                  <Icon className="h-5 w-5 md:h-4 md:w-4" />
                  <span className="text-xs md:text-sm">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 