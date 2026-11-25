import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProspectPhoneEditor from "./ProspectPhoneEditor";

describe("ProspectPhoneEditor", () => {
  it("permite înlocuirea unui fix extras greșit cu mobilul din anunț", async () => {
    const onSave = vi.fn(async () => true);
    render(<ProspectPhoneEditor phone="+40323201064" onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Schimbă numărul +40323201064" }));
    const input = screen.getByRole("textbox", { name: "Număr de telefon corectat" });
    fireEvent.change(input, { target: { value: "0722 123 456" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("+40722123456"));
    expect(screen.queryByRole("textbox", { name: "Număr de telefon corectat" })).not.toBeInTheDocument();
  });

  it("acceptă și un fix valid pentru corectarea datelor, fără a pretinde că are WhatsApp", async () => {
    const onSave = vi.fn(async () => true);
    render(<ProspectPhoneEditor phone={null} onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Telefon dezvăluit manual" }), { target: { value: "0256 123 456" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("+40256123456"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("respinge numerele mascate sau incomplete și nu apelează salvarea", async () => {
    const onSave = vi.fn(async () => true);
    render(<ProspectPhoneEditor phone={null} onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Telefon dezvăluit manual" }), { target: { value: "07•• ••• 123" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Scrie un număr românesc valid");
    expect(onSave).not.toHaveBeenCalled();
  });
});
