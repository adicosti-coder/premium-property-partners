import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("recovers when navigating to a different page without losing sibling UI", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const Broken = (): JSX.Element => { throw new Error("Test page failure"); };
  const { rerender } = render(<><span>Notifications</span><ErrorBoundary resetKey="/broken"><Broken /></ErrorBoundary></>);
  expect(screen.getByText("Ceva nu a mers bine")).toBeInTheDocument();
  expect(screen.getByText("Notifications")).toBeInTheDocument();
  rerender(<><span>Notifications</span><ErrorBoundary resetKey="/healthy"><h1>Healthy page</h1></ErrorBoundary></>);
  expect(screen.getByRole("heading", { name: "Healthy page" })).toBeInTheDocument();
  expect(screen.queryByText("Ceva nu a mers bine")).toBeNull();
});