"use client";

import { useRouter } from "next/navigation";

export type FilterSelect = { name: string; label: string; value: string; options: { value: string; label: string }[] };

/**
 * Compact alternative to filter pills on small screens: one <select> per
 * filter. Changing one navigates to the URL the server built for that value,
 * so the page logic stays identical to the pill links.
 */
export default function FilterSelects({ filters, hrefFor, className = "" }: { filters: FilterSelect[]; hrefFor: Record<string, Record<string, string>>; className?: string }) {
  const router = useRouter();
  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-3 ${className}`}>
      {filters.map((f) => (
        <div key={f.name}>
          <label htmlFor={`filter-${f.name}`} className="!text-xs !text-muted !mb-0.5">{f.label}</label>
          <select id={`filter-${f.name}`} value={f.value} onChange={(e) => router.push(hrefFor[f.name][e.target.value])} className="!py-1.5 text-sm">
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
