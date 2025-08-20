import re
from playwright.sync_api import Page, expect
import traceback

def test_playwright_installation(page: Page):
    try:
        print("Starting Playwright verification script...")
        page.goto("https://www.google.com")
        expect(page).to_have_title(re.compile("Google"))
        page.screenshot(path="jules-scratch/verification/google_verification.png")
        print("Playwright verification script completed successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()
        page.screenshot(path="jules-scratch/verification/playwright_error.png")
