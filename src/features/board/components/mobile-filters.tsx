"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

export function MobileFilters({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="h-9 rounded-full bg-card px-3.5 xl:hidden">
          <SlidersHorizontalIcon data-icon="inline-start" />
          Companies
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto shadow-none">
        <SheetHeader>
          <SheetTitle>Companies</SheetTitle>
          <SheetDescription>Show roles from one company.</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
