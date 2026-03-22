import { expect, test } from "@playwright/test";

test("direkte Hauptseiten funktionieren", async ({ page }) => {
  const routes = ["/000", "/100", "/210", "/510", "/998", "/999"];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("body")).toContainText("SEITE");
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  }
});

test("numerische Navigation funktioniert", async ({ page }) => {
  await page.goto("/000");
  await page.keyboard.press("2");
  await page.keyboard.press("0");
  await page.keyboard.press("0");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/200$/);

  await page.keyboard.press("2");
  await page.keyboard.press("1");
  await page.keyboard.press("0");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/210$/);
});

test("browser back und forward bleiben konsistent", async ({ page }) => {
  await page.goto("/000");
  await page.goto("/100");
  await page.goBack();
  await expect(page).toHaveURL(/\/000$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/100$/);
});

test("seitenfinder zeigt Treffer und navigiert", async ({ page }) => {
  await page.goto("/800");
  await page.getByLabel("Suche im Seitenfinder").fill("ipv6");
  await expect(page.locator("[data-btx-search-result='0']")).toContainText("340");
  await page.locator("[data-btx-search-result='0']").click();
  await expect(page).toHaveURL(/\/340$/);
});

test("fortsetzungsseiten sind direkt erreichbar", async ({ page }) => {
  await page.goto("/998/2");
  await expect(page.locator("body")).toContainText("SEITE 998/2");
  await page.goto("/510/2");
  await expect(page.locator("body")).toContainText("SEITE 510/2");
});

test("weiter-link und 404-seite funktionieren", async ({ page }) => {
  await page.goto("/000");
  await page.getByRole("link", { name: "Naechste Folgeseite" }).click();
  await expect(page).toHaveURL(/\/000\/2$/);

  await page.goto("/404");
  await expect(page.locator("body")).toContainText("SEITE NICHT VORHANDEN");
  await page.getByRole("link", { name: "000 Zur Startseite" }).click();
  await expect(page).toHaveURL(/\/000$/);
});
