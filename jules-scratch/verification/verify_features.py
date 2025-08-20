import re
from playwright.sync_api import Page, expect
import traceback

def test_service_provider_features(page: Page):
    try:
        print("Starting verification script...")

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

        # 3. Verify Price Table Management
        print("Verifying price table management...")
        page.goto("http://localhost:8080/admin/service-providers")
        # Click on the first provider in the table
        page.locator("table > tbody > tr").first.get_by_role("cell").first.click()
        page.get_by_role("tab", name="Tabela de Preços").click()
        expect(page.get_by_role("heading", name="Tabela de Preços")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/price_table_verification.png")
        print("Price table management verified.")

        # 4. Verify Notifications
        print("Verifying notifications...")
        notification_bell = page.get_by_role("button").locator("svg.lucide-bell")
        expect(notification_bell).to_be_visible()
        notification_bell.click()
        expect(page.get_by_text("Notificações")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/notifications_verification.png")
        print("Notifications verified.")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
