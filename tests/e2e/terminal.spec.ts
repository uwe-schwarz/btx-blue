import { expect, test } from "@playwright/test";

test("dials 01910 on the rotary dial, couples the handset and shows the call charge after hanging up", async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/000");
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  // In 3D the phosphor is drawn by WebGL; the HTML screen stays interactive underneath.
  await expect(page.locator(".btx-screen")).toHaveClass(/crt-rendered/);
  await page.getByRole("button", { name: "Verbinden", exact: true }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "lifting");
  await expect(page.locator("[data-local-grid]")).toContainText("Wählton 425 Hz");
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "dialing", { timeout: 5000 });
  await expect(page.locator("[data-local-grid]")).toContainText("0 1 9 1 _", { timeout: 15000 });
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "answering", { timeout: 15000 });
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "coupling", { timeout: 5000 });
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "online", { timeout: 10000 });
  await page.getByRole("button", { name: "Auflegen" }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "idle");
  await expect(page.locator("[data-local-grid]")).toContainText("0,23 DM");
  expect(errors).toEqual([]);
});

test("connects, navigates without replacing the desk, and preserves browser history", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/000");
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await page.getByRole("button", { name: "Direkt verbinden" }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "online", { timeout: 15000 });
  await page.evaluate(() => { document.querySelector("canvas")!.dataset.identity = "original"; });
  await page.getByLabel("Dreistellige Seitennummer").fill("800");
  await page.getByLabel("Dreistellige Seitennummer").press("Enter");
  await expect(page).toHaveURL(/\/800$/);
  await page.getByLabel("Suche im Seitenfinder").fill("ipv6");
  await page.locator("[data-btx-search-result='0']").click();
  await expect(page).toHaveURL(/\/340$/);
  await expect(page.locator("canvas.desk-webgl")).toHaveAttribute("data-identity", "original");
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "online");
  await page.goBack();
  await expect(page.getByLabel("Suche im Seitenfinder")).toBeVisible();
  await page.goForward();
  await expect(page.locator(".btx-status-page")).toContainText("340");
  // Send one sequence within the terminal's 1.2-second command window.
  // Two locator calls can be seconds apart on software-rendered cloud browsers.
  await page.getByLabel("Dreistellige Seitennummer").pressSequentially("#h");
  await expect(page).toHaveURL(/\/000$/);
  expect(errors).toEqual([]);
});

test("cancels dialing and pauses then resumes the same received page", async ({ page }) => {
  await page.goto("/000");
  await page.getByRole("button", { name: "Verbinden", exact: true }).click();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "idle");
  await page.getByRole("button", { name: "Direkt verbinden" }).click();
  await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  await page.getByRole("button", { name: "Hörer herausnehmen" }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "paused");
  const before = await page.locator("[data-btx-grid]").getAttribute("style");
  await page.waitForTimeout(350);
  expect(await page.locator("[data-btx-grid]").getAttribute("style")).toBe(before);
  await page.getByRole("button", { name: "Hörer einsetzen", exact: true }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "online");
  await expect.poll(() => page.locator("[data-btx-grid]").getAttribute("style")).not.toBe(before);
  await page.getByRole("button", { name: "Terminal ausschalten" }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "off");
  await page.getByRole("button", { name: "Terminal einschalten" }).click();
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-connection", "idle");
});

test("switches modem profiles, keeps sound preference, and supports the flat fallback", async ({ page }) => {
  await page.goto("/000");
  await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  for (const [speed, label] of [["300", "V.21"], ["2400", "V.22bis"], ["9600", "V.32"], ["LINE", "Direkt"]]) {
    await page.locator(`[data-btx-baud-option][value='${speed}']`).check();
    await expect(page.locator("[data-connection-profile]")).toContainText(label);
  }
  await page.getByRole("button", { name: "Ton an" }).click();
  await page.getByRole("button", { name: "Ohne 3D" }).click();
  await expect(page.locator("[data-terminal]")).toHaveClass(/desk-flat/);
  await expect(page.locator("canvas.desk-webgl")).toHaveCount(0);
  await expect(page.locator(".btx-screen")).toBeVisible();
  await expect(page.locator(".btx-screen")).toHaveCSS("user-select", "auto");
  await page.getByRole("button", { name: "Einstellungen schließen" }).click();
  await page.getByRole("button", { name: "Direkt verbinden" }).click();
  await page.getByLabel("Dreistellige Seitennummer").fill("100");
  await page.getByLabel("Dreistellige Seitennummer").press("Enter");
  await expect(page).toHaveURL(/\/100$/);
  await page.reload();
  await expect(page.locator("[data-terminal]")).toHaveClass(/desk-flat/);
  await expect(page.getByRole("button", { name: "Ton aus" })).toBeVisible();
});

test("fits mobile, supports reduced motion, and keeps all 24 rows inside the display", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/800");
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await page.getByRole("button", { name: "Direkt verbinden" }).click();
  await page.getByLabel("Suche im Seitenfinder").fill("ipv6");
  await expect(page.locator("[data-btx-search-result='0']")).toContainText("340");
  const bounds = await page.evaluate(() => {
    const screen = document.querySelector(".btx-screen")!.getBoundingClientRect();
    const status = document.querySelector(".btx-status-line")!.getBoundingClientRect();
    return { left: screen.left, right: screen.right, statusBottom: status.bottom, screenBottom: screen.bottom, viewport: innerWidth, scroll: document.documentElement.scrollWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
  expect(bounds.statusBottom).toBeLessThan(bounds.screenBottom);
  expect(bounds.scroll).toBe(bounds.viewport);
});

test("keeps the screen aligned when inputs receive focus during a mobile camera transition", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/800");
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await page.getByRole("button", { name: "Direkt verbinden" }).click();
  await page.getByLabel("Suche im Seitenfinder").fill("ipv6");
  await page.setViewportSize({ width: 390, height: 844 });
  // Native focus can scroll overflow:hidden ancestors while the camera is moving.
  await page.getByLabel("Dreistellige Seitennummer").focus();
  await page.getByLabel("Suche im Seitenfinder").focus();
  await expect.poll(() => page.locator(".btx-screen").evaluate((screen) => {
    const bounds = screen.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth;
  }), { timeout: 10000 }).toBe(true);
  const offsets = await page.getByLabel("Suche im Seitenfinder").evaluate((input) => {
    const result: number[] = [];
    for (let parent = input.parentElement; parent; parent = parent.parentElement) {
      result.push(parent.scrollLeft, parent.scrollTop);
    }
    return result;
  });
  expect(offsets.every((offset) => offset === 0)).toBe(true);
  await expect(page.locator("[data-btx-search-result='0']")).toContainText("340");
});

test("lets the visitor look around freely and fly back to framed views", async ({ page }) => {
  await page.goto("/000");
  await expect(page.locator("[data-terminal]")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await page.getByRole("button", { name: "Tastatur", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tastatur", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Let the camera arrive, then drag on open desk (not on the screen, which stays interactive HTML).
  await page.waitForTimeout(2500);
  const box = (await page.locator("canvas.desk-webgl").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.85);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.8, { steps: 8 });
  await page.mouse.up();
  // Dragging hands the camera to the visitor: no framed view is selected any more.
  await expect(page.locator("[data-desk-goto][aria-pressed='true']")).toHaveCount(0);
  await expect(page.locator("[data-desk-navhint]")).toBeHidden();
  await page.getByRole("button", { name: "Monitor", exact: true }).click();
  await expect(page.getByRole("button", { name: "Schreibtisch" })).toBeVisible();
  await page.getByRole("button", { name: "Gesamt", exact: true }).click();
  await expect(page.getByRole("button", { name: "Gesamt", exact: true })).toHaveAttribute("aria-pressed", "true");
});
