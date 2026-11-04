import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RegionalLocationInput } from "./RegionalLocationInput";

function setup() {
  const onChange = vi.fn();
  function Field() {
    const [value, setValue] = useState("");
    return <RegionalLocationInput value={value} language="ro" onChange={(next) => { setValue(next); onChange(next); }} />;
  }
  render(<Field />);
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  return { input, onChange };
}

afterEach(cleanup);

describe("regional location selection regressions", () => {
  it.each(["baile felix", "BAILE  FELIX", "Băile Felix", "Ba\u0306ile Felix"])("selects canonical Băile Felix by touch after searching %s", (query) => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: query } });
    const suggestion = screen.getByRole("option", { name: "Băile Felix" });
    fireEvent.pointerDown(suggestion, { pointerType: "touch", isPrimary: true });
    suggestion.focus();
    fireEvent.blur(input, { relatedTarget: suggestion });
    fireEvent.pointerUp(suggestion, { pointerType: "touch", isPrimary: true });
    fireEvent.click(suggestion);
    expect(onChange).toHaveBeenLastCalledWith("Băile Felix");
    expect(input).toHaveValue("Băile Felix");
  });

  it("selects Băile Felix with ArrowDown and Enter without diacritics", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "baile felix" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("Băile Felix");
    expect(input).toHaveValue("Băile Felix");
  });

  it("selects the correct suggestion after navigating down and up", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "brasov" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("Brașov");
    fireEvent.change(input, { target: { value: "brasov" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("Poiana Brașov");
  });

  it("Escape cancels keyboard selection without replacing free text", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "baile felix" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("baile felix");
    expect(input).toHaveValue("baile felix");
  });
});