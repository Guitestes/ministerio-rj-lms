import re
from playwright.sync_api import Page, expect
import traceback

def test_performance_reports(page: Page):
    try:
        print("Starting reports verification script...")

        # 1. Login as admin
        print("Logging in as admin...")
        page.goto("http://localhost:8080/login")
        page.get_by_label("Email").fill("admin@example.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()
        expect(page).to_have_url("http://localhost:8080/admin/dashboard")
        print("Login successful.")

        # 2. Verify Performance Reports
        print("Verifying performance reports...")
        page.goto("http://localhost:8080/admin/provider-reports")
        expect(page.get_by_role("heading", name="Relatório de Desempenho dos Prestadores")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/reports_verification.png")
        print("Performance reports verified.")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
