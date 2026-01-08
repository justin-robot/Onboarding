"use client";

import { Button } from "@repo/design/components/ui/button";
import { ArrowRight } from "lucide-react";
import { FlowingPixelsCanvas } from "./flowing";

export function Hero() {
  return (
    <main className="relative z-10 pt-32 pb-20 px-6 overflow-hidden">
      {/* Dot gradient background */}
      <div 
        className="absolute inset-0 opacity-40 md:opacity-70 bg-gradient-to-br from-background to-muted/20"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,1) 80%, rgba(0,0,0,1) 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,1) 80%, rgba(0,0,0,1) 100%)',
        }}>
        <FlowingPixelsCanvas />
      </div>
      
      <div className="max-w-6xl mx-auto animate-fade-in relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-medium text-foreground tracking-tight leading-[1.05] mb-8">
            N2O's monorepo template for rapid development
          </h1>

          <p className="text-xl text-muted-foreground max-w-xl mb-10 font-light leading-relaxed">
            Create a new project in minutes that can be extended and maintained for years
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Button variant="outline">
              Start Building
              <ArrowRight className="w-[18px] h-[18px]" />
            </Button>
            <Button variant="outline">
              Contact
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
