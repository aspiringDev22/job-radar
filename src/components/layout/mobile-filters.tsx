"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileFilters({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="Open companies"
        >
          <SlidersHorizontalIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 shadow-none">
        <SheetHeader>
          <SheetTitle>Companies</SheetTitle>
          <SheetDescription>Show roles from one company.</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
