import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RouteLoading from "./RouteLoading";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RouteLoading", () => {
  it("preserves fast loads and then announces a pending page", () => {
    vi.useFakeTimers();
    render(<RouteLoading />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("status")).toHaveTextContent("Se încarcă pagina");
  });

  it("cleans up the pending timer on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<RouteLoading />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});