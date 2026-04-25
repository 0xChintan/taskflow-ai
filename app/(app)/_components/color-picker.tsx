"use client";

import { useState } from "react";
import { ORG_COLOR_PRESETS } from "@/lib/color";

export function ColorPicker({
  name = "color",
  defaultValue,
}: {
  name?: string;
  defaultValue?: string;
}) {
  const [color, setColor] = useState(defaultValue ?? ORG_COLOR_PRESETS[0].value);
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={color} />
      <div className="grid grid-cols-7 gap-2">
        {ORG_COLOR_PRESETS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setColor(c.value)}
            aria-label={c.name}
            title={c.name}
            className={`h-8 w-8 rounded-full transition-all ${
              c.value === color
                ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                : "hover:scale-105"
            }`}
            style={
              {
                backgroundColor: c.value,
                "--tw-ring-color": c.value,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Custom</span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-12 cursor-pointer rounded border border-border bg-background"
        />
        <span className="font-mono">{color}</span>
      </div>
    </div>
  );
}
