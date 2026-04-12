export interface MenuOption {
  key: string;
  label: string;
  value: string;
}

export interface Menu {
  title: string;
  options: MenuOption[];
  allowFreetext: boolean;
  freetextPrompt?: string;
}

export function renderMenu(menu: Menu): string {
  const lines: string[] = [menu.title, ""];
  for (const opt of menu.options) {
    lines.push(`${opt.key}. ${opt.label}`);
  }
  if (menu.allowFreetext) {
    const nextKey = String(menu.options.length + 1);
    lines.push(`${nextKey}. ${menu.freetextPrompt ?? "Type something else:"}`);
  }
  return lines.join("\n");
}

export function parseMenuResponse(
  menu: Menu,
  response: string
): { type: "option"; value: string } | { type: "freetext"; value: string } {
  const trimmed = response.trim();
  const match = menu.options.find((o) => o.key === trimmed);
  if (match) return { type: "option", value: match.value };
  return { type: "freetext", value: trimmed };
}
