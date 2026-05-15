import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import CanonicalHreflang from "../CanonicalHreflang";
import TrailingSlashRedirect from "../TrailingSlashRedirect";

const SITE = "https://realtrust.ro";

const LocationProbe = ({ onChange }: { onChange: (p: string, s: string) => void }) => {
  const { pathname, search } = useLocation();
  onChange(pathname, search);
  return null;
};

const renderAt = (initialUrl: string) => {
  let pathname = "";
  let search = "";
  const utils = render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialUrl]}>
        <TrailingSlashRedirect />
        <CanonicalHreflang />
        <LocationProbe
          onChange={(p, s) => {
            pathname = p;
            search = s;
          }}
        />
        <Routes>
          <Route path="*" element={<div>page</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  return { ...utils, getLocation: () => ({ pathname, search }) };
};

const getCanonical = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");

describe("Trailing slash → redirect + canonical", () => {
  it("redirects /pentru-proprietari/ to /pentru-proprietari and emits clean canonical", async () => {
    const { getLocation } = renderAt("/pentru-proprietari/");
    await waitFor(() => expect(getLocation().pathname).toBe("/pentru-proprietari"));
    await waitFor(() =>
      expect(getCanonical()).toBe(`${SITE}/pentru-proprietari`),
    );
  });

  it("strips multiple trailing slashes (/blog/articol///)", async () => {
    const { getLocation } = renderAt("/blog/articol///");
    await waitFor(() => expect(getLocation().pathname).toBe("/blog/articol"));
    await waitFor(() => expect(getCanonical()).toBe(`${SITE}/blog/articol`));
  });

  it("preserves search params during redirect but excludes them from canonical", async () => {
    const { getLocation } = renderAt("/imobiliare-timisoara/?utm_source=ga&fbclid=x");
    await waitFor(() => expect(getLocation().pathname).toBe("/imobiliare-timisoara"));
    expect(getLocation().search).toBe("?utm_source=ga&fbclid=x");
    await waitFor(() =>
      expect(getCanonical()).toBe(`${SITE}/imobiliare-timisoara`),
    );
  });

  it("does NOT redirect the root path /", async () => {
    const { getLocation } = renderAt("/");
    await new Promise((r) => setTimeout(r, 30));
    expect(getLocation().pathname).toBe("/");
    await waitFor(() => expect(getCanonical()).toBe(`${SITE}/`));
  });

  it("does NOT redirect URLs already without a trailing slash", async () => {
    const { getLocation } = renderAt("/pentru-oaspeti");
    await new Promise((r) => setTimeout(r, 30));
    expect(getLocation().pathname).toBe("/pentru-oaspeti");
    await waitFor(() => expect(getCanonical()).toBe(`${SITE}/pentru-oaspeti`));
  });
});
