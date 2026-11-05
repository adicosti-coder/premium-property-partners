"""Mobile E2E: regional location search + selection in UnifiedCalculator.
Runs on emulated iPhone (WebKit) and Android (Chromium). Usage: python3 e2e/calculator-location-mobile.py [base_url]"""
import asyncio, sys
from playwright.async_api import async_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
DEVICES = [("iPhone 13", "webkit"), ("Pixel 7", "chromium")]

async def run(p, device, engine):
    browser = await getattr(p, engine).launch(headless=True)
    ctx = await browser.new_context(**p.devices[device])
    page = await ctx.new_page()
    await page.goto(f"{BASE}/#calculator", wait_until="domcontentloaded")
    calc = page.locator('[data-calculator-ready="true"]')
    await calc.wait_for(timeout=30000)
    await calc.get_by_role("button", name="Altă localitate / Regional").tap()
    box = calc.get_by_role("combobox")
    await box.tap()
    await box.press_sequentially("baile felix", delay=30)
    await calc.get_by_role("option", name="Băile Felix").tap()
    await expect(box).to_have_value("Băile Felix")
    await expect(calc.get_by_role("listbox")).to_have_count(0)
    await box.fill("")
    await box.press_sequentially("Murani, Timiș", delay=20)
    await expect(calc.get_by_role("status")).to_contain_text("Nicio sugestie")
    await box.press("Enter")
    await page.mouse.click(5, 5)
    await expect(box).to_have_value("Murani, Timiș")
    await calc.get_by_label("Suprafață utilă").fill("60")
    await calc.get_by_role("button", name="Continuă").tap()
    await calc.get_by_role("button", name="Vezi rezultatul").tap()
    await expect(calc.get_by_text("· Murani, Timiș · 60 mp ·")).to_be_visible()
    await page.screenshot(path=f"/tmp/browser/loc-{engine}.png")
    await browser.close()
    print(f"OK {device} ({engine})")

async def main():
    async with async_playwright() as p:
        for d, e in DEVICES:
            await run(p, d, e)

asyncio.run(main())
