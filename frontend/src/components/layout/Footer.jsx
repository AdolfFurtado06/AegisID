import React from "react";
import { ShieldCheck, Info } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-borderSoft bg-surface py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-textSecondary">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-forest" />
          <span className="font-medium text-textPrimary">AegisID Prototype</span>
          <span>&mdash; Privacy-Preserving On-Chain Identity Registry</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] bg-bgMain px-3 py-1 rounded-md border border-borderSoft">
          <Info className="w-3.5 h-3.5 text-tealAccent" />
          <span>Academic prototype for demonstration only. Uses synthetic mock documents.</span>
        </div>
      </div>
    </footer>
  );
}
