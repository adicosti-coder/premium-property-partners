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

  it("selects a suggestion with a single touch tap after typing a partial name", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "mama" } });
    const suggestion = screen.getByRole("option", { name: "Mamaia" });
    fireEvent.pointerDown(suggestion, { pointerType: "touch", isPrimary: true });
    fireEvent.pointerUp(suggestion, { pointerType: "touch", isPrimary: true });
    fireEvent.click(suggestion);
    expect(onChange).toHaveBeenLastCalledWith("Mamaia");
    expect(input).toHaveValue("Mamaia");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps every suggestion at the 48px minimum touch target on mobile", () => {
    setup();
    const { input } = { input: screen.getByRole("combobox") };
    fireEvent.change(input, { target: { value: "a" } });
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(3);
    for (const option of options) expect(option.className).toContain("min-h-12");
  });

  it("renders the suggestion list as a scrollable container so it fits small screens", () => {
    setup();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a" } });
    const listbox = screen.getByRole("listbox");
    expect(listbox.className).toContain("max-h-64");
    expect(listbox.className).toContain("overflow-y-auto");
  });

  it("reopens suggestions on focus after a touch selection closed them", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "sinaia" } });
    const suggestion = screen.getByRole("option", { name: "Sinaia" });
    fireEvent.pointerDown(suggestion, { pointerType: "touch", isPrimary: true });
    fireEvent.pointerUp(suggestion, { pointerType: "touch", isPrimary: true });
    fireEvent.click(suggestion);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.blur(input);
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
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

  it.each(["Murani, Timiș", "Brasov Sud"])("keeps custom location %s after mobile Done/Enter and tapping outside", (custom) => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: custom } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(input).toHaveValue(custom);
    expect(onChange).toHaveBeenLastCalledWith(custom);
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside, { pointerType: "touch", isPrimary: true });
    outside.focus();
    fireEvent.blur(input, { relatedTarget: outside });
    expect(input).toHaveValue(custom);
    expect(onChange).toHaveBeenLastCalledWith(custom);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    outside.remove();
  });

  it("keeps a custom location when the mobile keyboard closes and reopens", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "Murani, Timiș" } });
    fireEvent.blur(input, { relatedTarget: null });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.focus(input);
    expect(input).toHaveValue("Murani, Timiș");
    fireEvent.blur(input, { relatedTarget: null });
    expect(input).toHaveValue("Murani, Timiș");
    expect(onChange).toHaveBeenLastCalledWith("Murani, Timiș");
  });

  it("updates suggestions after editing an already entered custom location", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "Murani" } });
    fireEvent.blur(input, { relatedTarget: null });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "mamaia" } });
    expect(screen.getByRole("option", { name: "Mamaia" })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "sinaia" } });
    expect(screen.getByRole("option", { name: "Sinaia" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Mamaia" })).not.toBeInTheDocument();
  });

  it("moves the active suggestion with arrows, selects with Enter and closes with Escape", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "brasov" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Brașov" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Poiana Brașov" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("Brașov");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "brasov" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("brasov");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it.each([
    "Șofronea, Țărmure, Încă o stație",
    "  Sat   Vechi  ",
    "Comuna cu un nume foarte lung pentru testarea câmpului de localitate regională din România",
  ])("preserves custom location %j through Enter, outside tap and refocus", (custom) => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: custom } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input, { relatedTarget: null });
    fireEvent.focus(input);
    expect(input).toHaveValue(custom);
    expect(onChange).toHaveBeenLastCalledWith(custom);
  });

  it.each([
    ["Sânmartin", "Sanmartin"],
    ["Sat Vechi", "Sat  Vechi"],
    ["Ținutul Pădurenilor", "Tinutul Padurenilor"],
  ])("keeps %j and %j as distinct custom values when editing", (first, second) => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: first } });
    fireEvent.blur(input, { relatedTarget: null });
    expect(input).toHaveValue(first);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: second } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input, { relatedTarget: null });
    expect(input).toHaveValue(second);
    expect(onChange).toHaveBeenLastCalledWith(second);
  });

  it("announces the active suggestion through ARIA while navigating with the keyboard", () => {
    const { input } = setup();
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-controls", "uc-location-suggestions");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    fireEvent.change(input, { target: { value: "brasov" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { name: "Sugestii de localități" })).toHaveAttribute("id", "uc-location-suggestions");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "uc-location-option-0");
    expect(document.getElementById("uc-location-option-0")).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "uc-location-option-1");
    expect(document.getElementById("uc-location-option-0")).toHaveAttribute("aria-selected", "false");
    expect(document.getElementById("uc-location-option-1")).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-activedescendant", "uc-location-option-0");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("uses an English listbox label for English visitors", () => {
    render(<RegionalLocationInput value="sibiu" language="en" onChange={() => {}} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox", { name: "Location suggestions" })).toBeInTheDocument();
  });
});
