from playwright.sync_api import sync_playwright
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture console errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exception: print(f"PAGE ERROR: {exception}"))
        
        print("Navigating to https://sgo-pzbp.vercel.app...")
        try:
            page.goto('https://sgo-pzbp.vercel.app', wait_until='networkidle', timeout=30000)
            
            # Check for the expected element
            print("Checking for 'ZONA DE TRABAJO'...")
            if page.locator('text=ZONA DE TRABAJO').count() > 0:
                print("SUCCESS: 'ZONA DE TRABAJO' found in DOM.")
            else:
                print("FAILURE: 'ZONA DE TRABAJO' NOT found.")
                print("Page content snippet:")
                print(page.content()[:1000])

        except Exception as e:
            print(f"Error navigating: {e}")
        
        browser.close()

if __name__ == "__main__":
    run()
