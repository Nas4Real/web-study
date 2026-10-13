import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: pathname }));

import WorkspaceLoading from "@/app/(workspace)/loading";

describe("workspace loading feedback", () => {
  it.each([
    ["/", "Dashboard"],
    ["/tasks", "Tasks"],
    ["/calendar", "Calendar"],
    ["/documents", "Documents"],
    ["/settings", "Settings"],
  ])("labels %s without showing completed-page controls", (path, label) => {
    pathname.mockReturnValue(path);
    const html = renderToStaticMarkup(createElement(WorkspaceLoading));
    expect(html).toContain(`Loading ${label}…`);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("animate-");
    expect(html).not.toContain("<h1");
  });

  it("does not echo an unknown pathname in its status", () => {
    pathname.mockReturnValue("/unexpected/private-value");
    const html = renderToStaticMarkup(createElement(WorkspaceLoading));
    expect(html).toContain("Loading workspace…");
    expect(html).not.toContain("private-value");
  });
});
