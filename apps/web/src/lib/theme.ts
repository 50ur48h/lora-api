import type { CSSProperties } from "react";
import type { components } from "@lora/sdk";

type Theme = components["schemas"]["PublicThemeDto"] | null;

/**
 * Maps a tenant's theme colours onto the design-token CSS variables, so any
 * subtree wrapped in this style renders in the tenant's brand.
 */
export function brandStyle(theme: Theme): CSSProperties {
  const colors = theme?.colors ?? {};
  const style: Record<string, string> = {};
  if (colors.primary) style["--primary"] = colors.primary;
  if (colors.accent) style["--accent"] = colors.accent;
  return style as CSSProperties;
}
