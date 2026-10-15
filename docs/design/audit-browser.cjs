// Isolated visual audit: no real API requests or database writes.
const { chromium } = require(
  process.env.NEXTVN_PLAYWRIGHT_PATH || '../../../ui-audit-tools/node_modules/playwright',
);
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, process.env.NEXTVN_AUDIT_OUTPUT || 'baseline');
const interactiveChecks = ['B', 'C', 'D', 'E', 'F'].includes(process.env.NEXTVN_AUDIT_PHASE);
const phaseF = process.env.NEXTVN_AUDIT_PHASE === 'F';
const selectedRoles = process.env.NEXTVN_AUDIT_ROLES?.split(',');
const widths = process.env.NEXTVN_AUDIT_WIDTHS
  ? process.env.NEXTVN_AUDIT_WIDTHS.split(',').map(Number)
  : [1920, 1366, 1024, 768, 390, 360];
const date = '2026-10-14T03:00:00Z';
const branch = {
  id: 'audit-branch',
  name: 'Chi nhánh minh họa',
  isActive: true,
  managerName: null,
  revenueVnd: 0,
  orderCount: 0,
};
const menu = {
  id: 'audit-menu',
  name: 'Cà phê sữa',
  price: 35000,
  categoryId: 'coffee',
  isAvailable: true,
};
const order = {
  id: 'audit-order',
  orderType: 'TAKEAWAY',
  status: 'PAID',
  total: 35000,
  subtotal: 35000,
  discount: 0,
  createdAt: date,
  paymentMethod: 'CASH',
  items: [{ id: 'item', name: menu.name, quantity: 1, unitPrice: 35000, total: 35000 }],
};
const inventory = {
  asOf: date,
  ingredients: [
    {
      id: 'coffee',
      name: 'Cà phê',
      category: 'Khác',
      unit: 'g',
      stock: 100,
      minimum: 200,
      unitCost: 100,
      expiry: null,
      status: 'LOW_STOCK',
    },
  ],
  recipes: [
    {
      id: 'recipe',
      menuItemId: menu.id,
      name: menu.name,
      sellingPrice: 35000,
      foodCost: 2000,
      marginPercent: 90,
      ingredients: [{ ingredientId: 'coffee', quantityMilli: 20000 }],
      modifiers: [],
    },
  ],
  transactions: [],
  alerts: [
    { id: 'alert', ingredientId: 'coffee', type: 'LOW_STOCK', status: 'OPEN', updatedAt: date },
  ],
};
const owner = {
  overview: {
    revenueVnd: 0,
    grossProfitVnd: null,
    averageOrderVnd: 0,
    orderCount: 0,
    revenueTrend: [],
    categoryRevenue: [],
    peakHours: [],
    highlights: [],
    profitableItems: [],
  },
  revenue: {
    revenueVnd: 0,
    orderCount: 0,
    averageOrderVnd: 0,
    bestWindow: 'Chưa có dữ liệu',
    trend: [],
    categories: [],
    topItems: [],
  },
  branches: [branch],
  members: [],
  'menu-profit': [],
  promotions: [],
  subscription: {
    plan: 'Minh họa',
    usage: '1 chi nhánh',
    renewalDate: null,
    status: 'TRIALING',
    billingHistory: [],
    plans: [],
    payOSAvailable: false,
  },
  settings: {
    businessName: 'Doanh nghiệp minh họa',
    contactEmail: null,
    contactPhone: null,
    address: null,
    taxRate: 0,
    serviceFeeRate: 0,
    invoicePrefix: 'HD',
    receiptTitle: null,
    receiptFooter: null,
    notifyLowStock: true,
    notifyNearExpiry: true,
  },
};
const routes = [
  ['PUBLIC', '/'],
  ['PUBLIC', '/login'],
  ['PUBLIC', '/register'],
  ...['pos', 'tables', 'orders', 'shift'].map((p) => ['STAFF', '/app/' + p]),
  ...['inventory', 'stock-transactions', 'recipes', 'alerts'].map((p) => ['MANAGER', '/app/' + p]),
  ...[
    '',
    '/branches',
    '/revenue',
    '/menu-profit',
    '/promotions',
    '/users',
    '/settings',
    '/subscription',
    '/inventory',
  ].map((p) => ['OWNER', '/app/owner' + p]),
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [],
    errors = [],
    consoleErrors = [],
    unmapped = [],
    interactions = [];
  try {
    for (const [role, url] of routes.filter(
      ([role]) => !selectedRoles || selectedRoles.includes(role),
    )) {
      const context = await browser.newContext();
      await context.addInitScript((role) => {
        if (role !== 'PUBLIC') localStorage.setItem('access_token', 'isolated-ui-audit');
      }, role);
      await context.route('**/*', async (route) => {
        const req = route.request(),
          u = new URL(req.url()),
          p = u.pathname;
        if (u.origin === 'http://127.0.0.1:5173') return route.continue();
        if (!p.includes('/workspace') && !p.includes('/business/')) return route.abort();
        if (req.method() !== 'GET')
          return route.fulfill({ status: 403, json: { message: 'Audit is read only' } });
        let data;
        if (p.endsWith('/workspace'))
          data = {
            user: { id: 'audit-user', fullName: 'Người dùng minh họa' },
            business: { id: 'audit-business', name: 'Doanh nghiệp minh họa' },
            branch,
            role,
          };
        else if (p.includes('/owner/')) data = { data: owner[p.split('/').at(-1)] };
        else if (p.endsWith('/inventory/summary'))
          data = {
            branches: [
              {
                branch,
                asOf: date,
                lowStockCount: 1,
                nearExpiryCount: 0,
                inventoryValue: 10000,
                ingredients: inventory.ingredients,
                consumptionLast30Days: [],
              },
            ],
          };
        else if (p.includes('/inventory/branches/')) data = inventory;
        else if (p.endsWith('/categories')) data = { data: [{ id: 'coffee', name: 'Cà phê' }] };
        else if (p.endsWith('/items')) data = { data: [menu] };
        else if (p.endsWith('/areas')) data = { data: [] };
        else if (p.endsWith('/bill')) data = { data: order };
        else if (p.includes('/tables/'))
          data = { data: [{ id: 'table', name: 'Bàn 01', seats: 4, status: 'AVAILABLE' }] };
        else if (p.includes('/orders/'))
          data = {
            data: p.endsWith('/audit-order')
              ? order
              : { data: [order], pagination: { page: 1, totalPages: 1, total: 1, limit: 20 } },
          };
        else if (p.endsWith('/active')) data = { data: null };
        else if (p.includes('/shifts/')) data = { data: [] };
        else {
          unmapped.push(p);
          return route.fulfill({ status: 404, json: { message: 'Unmapped audit request' } });
        }
        return route.fulfill({ json: data });
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push({ url, message: e.message }));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push({ url, message: message.text() });
      });
      for (const width of widths) {
        await page.setViewportSize({ width, height: width >= 1366 ? 900 : 844 });
        await page.goto('http://127.0.0.1:5173' + url);
        await page.waitForTimeout(600);
        const state = await page.evaluate(
          (measureActions) => ({
            title: document.title,
            theme: {
              primary: getComputedStyle(document.documentElement)
                .getPropertyValue('--primary')
                .trim(),
              bodyFont: getComputedStyle(document.querySelector('.owner-app') || document.body)
                .fontFamily,
            },
            heading: document.querySelector('main h1,main h2,.page-header h1')?.textContent,
            scrollWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            alerts: [...document.querySelectorAll('[role=alert]')].map((e) => e.textContent),
            unlabelled: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')]
              .filter(
                (e) =>
                  !e.labels?.length &&
                  !e.getAttribute('aria-label') &&
                  !e.getAttribute('aria-labelledby'),
              )
              .map((e) => e.id || e.tagName),
            mobileActions: measureActions
              ? [
                  ...document.querySelectorAll(
                    'main button,main a,main input,main select,main summary',
                  ),
                ]
                  .filter((element) => {
                    const rect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
                  })
                  .map((element) => {
                    const rect = element.getBoundingClientRect();
                    let region = element.parentElement;
                    while (region) {
                      const overflow = getComputedStyle(region).overflowX;
                      if (
                        region.scrollWidth > region.clientWidth + 2 &&
                        (overflow === 'auto' || overflow === 'scroll')
                      )
                        break;
                      region = region.parentElement;
                    }
                    return {
                      name:
                        element.getAttribute('aria-label') ||
                        element.labels?.[0]?.textContent?.trim() ||
                        element.textContent?.trim().slice(0, 48) ||
                        element.getAttribute('placeholder') ||
                        element.tagName,
                      tag: element.tagName,
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                      outside: rect.left < -1 || rect.right > innerWidth + 1,
                      scrollRegion: region?.getAttribute('aria-label') || null,
                      scrollRegionKeyboard: region?.tabIndex >= 0 || false,
                    };
                  })
              : undefined,
            contrastFindings: measureActions
              ? (() => {
                  const rgb = (value) => {
                    const parts = value.match(/[\d.]+/g)?.map(Number);
                    return parts?.length >= 3 && (parts.length < 4 || parts[3] === 1)
                      ? parts.slice(0, 3)
                      : null;
                  };
                  const luminance = (color) =>
                    color
                      .map((part) => part / 255)
                      .map((part) =>
                        part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4,
                      )
                      .reduce(
                        (sum, part, index) => sum + part * [0.2126, 0.7152, 0.0722][index],
                        0,
                      );
                  const findings = [];
                  for (const element of document.querySelectorAll(
                    'main h1,main h2,main h3,main p,main span,main small,main label,main button,main a,main td,main th,main strong,main li,main summary',
                  )) {
                    const ownText = [...element.childNodes]
                      .filter((node) => node.nodeType === Node.TEXT_NODE)
                      .map((node) => node.textContent.trim())
                      .join(' ')
                      .trim();
                    if (
                      ownText.length < 3 ||
                      !element.getClientRects().length ||
                      element.closest('[disabled]')
                    )
                      continue;
                    const style = getComputedStyle(element);
                    const foreground = rgb(style.color);
                    if (!foreground) continue;
                    let background = null;
                    let ancestor = element;
                    let uncertain = false;
                    while (ancestor && !background) {
                      const ancestorStyle = getComputedStyle(ancestor);
                      if (ancestorStyle.backgroundImage !== 'none') uncertain = true;
                      background = rgb(ancestorStyle.backgroundColor);
                      ancestor = ancestor.parentElement;
                    }
                    if (!background || uncertain) continue;
                    const a = luminance(foreground),
                      b = luminance(background);
                    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
                    const fontSize = parseFloat(style.fontSize);
                    const large =
                      fontSize >= 24 || (fontSize >= 18.66 && Number(style.fontWeight) >= 700);
                    if (ratio < (large ? 3 : 4.5))
                      findings.push({
                        text: ownText.slice(0, 55),
                        selector:
                          element.tagName.toLowerCase() +
                          (element.className && typeof element.className === 'string'
                            ? '.' + element.className.trim().split(/\s+/).join('.')
                            : ''),
                        ratio: Math.round(ratio * 100) / 100,
                        foreground: style.color,
                        background: background.join(','),
                      });
                  }
                  return findings.slice(0, 60);
                })()
              : undefined,
          }),
          phaseF && width <= 390,
        );
        results.push({ role, url, width, ...state });
        if ([1366, 390].includes(width))
          await page.screenshot({
            path: path.join(
              out,
              role.toLowerCase() +
                '-' +
                (url.replaceAll('/', '-') || 'landing') +
                '-' +
                width +
                '.png',
            ),
            fullPage: true,
          });
      }
      if (phaseF) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          const style = getComputedStyle(element);
          return {
            tag: element?.tagName,
            name: element?.getAttribute('aria-label') || element?.textContent?.trim().slice(0, 40),
            visible: element?.matches(':focus-visible'),
            outlineWidth: style.outlineWidth,
            outlineStyle: style.outlineStyle,
          };
        });
        const primary = page
          .locator(
            'main button:not([disabled]):visible, main a:visible, main input:not([disabled]):visible, main select:not([disabled]):visible',
          )
          .first();
        const primaryControl = (await primary.count())
          ? await primary.evaluate((element) => {
              element.scrollIntoView({ block: 'center', inline: 'center' });
              const rect = element.getBoundingClientRect();
              const hit = document.elementFromPoint(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
              );
              return {
                name:
                  element.getAttribute('aria-label') ||
                  element.textContent?.trim().slice(0, 50) ||
                  element.getAttribute('placeholder'),
                reachable: hit === element || element.contains(hit),
              };
            })
          : null;
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const reducedMotion = await page.evaluate(() => {
          const element = document.querySelector('main button, main a');
          if (!element) return null;
          const style = getComputedStyle(element);
          return {
            matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
            animationDuration: style.animationDuration,
            transitionDuration: style.transitionDuration,
          };
        });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        interactions.push({ url, focus, primaryControl, reducedMotion });
      }
      if (interactiveChecks && url === '/app/pos') {
        const product = page.getByRole('button', { name: /Cà phê sữa/ }).first();
        await product.focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('Enter');
        const count = await page.locator('.cart-item-qty').textContent();
        if (count !== '2') throw Error('Native product keyboard activation failed');
        const sizes = await page.locator('.cart-item-controls button').evaluateAll((nodes) =>
          nodes.map((e) => ({
            width: e.getBoundingClientRect().width,
            height: e.getBoundingClientRect().height,
          })),
        );
        if (sizes.some((s) => s.width < 44 || s.height < 44))
          throw Error('POS touch targets too small');
        interactions.push({ url, keyboardQuantity: count, quantityControlSizes: sizes });
      }
      if (interactiveChecks && url === '/') {
        const menuButton = page.getByRole('button', { name: 'Mở menu' });
        await menuButton.click();
        if (!(await page.getByRole('button', { name: 'Đóng menu' }).isVisible()))
          throw Error('Public mobile navigation did not open');
        await page.keyboard.press('Escape');
        if (!(await page.getByRole('button', { name: 'Mở menu' }).isVisible()))
          throw Error('Public mobile navigation did not close with Escape');
        await page.getByRole('link', { name: /Đăng nhập cho chủ doanh nghiệp/ }).click();
        if (new URL(page.url()).pathname !== '/login') throw Error('Business login CTA is broken');
        await page.goto('http://127.0.0.1:5173/');
        await page.getByRole('link', { name: /Đăng ký NextVN/ }).click();
        if (new URL(page.url()).pathname !== '/register') throw Error('Registration CTA is broken');
        interactions.push({ url, mobileMenuEscape: true, loginCta: true, registrationCta: true });
      }
      if (interactiveChecks && (url === '/login' || url === '/register')) {
        const password = page.getByLabel('Mật khẩu', { exact: true });
        await password.fill('Example@2026');
        await page.getByRole('button', { name: 'Hiện mật khẩu' }).click();
        if ((await password.getAttribute('type')) !== 'text')
          throw Error('Password did not reveal');
        await page.getByRole('button', { name: 'Ẩn mật khẩu' }).click();
        if ((await password.getAttribute('type')) !== 'password')
          throw Error('Password did not hide');
        if ((await password.inputValue()) !== 'Example@2026')
          throw Error('Password changed when visibility toggled');
        interactions.push({ url, passwordVisibility: true });
      }
      if (role !== 'PUBLIC' && widths.at(-1) <= 760) {
        await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
        const opened = await page.locator('#app-navigation').isVisible();
        await page.locator('#app-navigation a').first().click();
        interactions.push({
          url,
          mobileOpen: opened,
          mobileClosedAfterLink: !(await page.locator('#app-navigation').isVisible()),
        });
      }
      if ((url === '/app/tables' || url === '/app/orders') && widths.at(-1) <= 360) {
        await page.goto('http://127.0.0.1:5173' + url);
        await page.waitForTimeout(500);
        if (url.endsWith('tables')) await page.locator('.table-card').first().click();
        else await page.locator('.data-table button').first().click();
        await page.waitForTimeout(300);
        interactions.push({
          url,
          modal: await page.locator('.modal-content').evaluate((e) => ({
            width: e.getBoundingClientRect().width,
            viewport: innerWidth,
            role: e.getAttribute('role'),
            tag: e.tagName,
          })),
        });
        await page.screenshot({
          path: path.join(out, 'dialog-' + url.split('/').at(-1) + '-360.png'),
          fullPage: true,
        });
        if (interactiveChecks) {
          const dialog = page.getByRole('dialog');
          const bounds = await dialog.boundingBox();
          if (!bounds || bounds.x < 0 || bounds.x + bounds.width > 360)
            throw Error('Dialog exceeds viewport');
          for (let i = 0; i < 12; i++) {
            await page.keyboard.press('Tab');
            if (!(await dialog.evaluate((e) => e.contains(document.activeElement))))
              throw Error('Focus escaped dialog');
          }
          await page.keyboard.press('Escape');
          if (await dialog.count()) throw Error('Escape did not dismiss dialog');
          const trigger = page
            .locator(url.endsWith('tables') ? '.table-card' : '.data-table button')
            .first();
          if (!(await trigger.evaluate((e) => e === document.activeElement)))
            throw Error('Dialog did not restore focus');
          await trigger.click();
          await page.getByRole('button', { name: 'Đóng hộp thoại' }).click();
          if (await dialog.count()) throw Error('Close button did not dismiss dialog');
          await trigger.click();
          await page.mouse.click(1, 1);
          if (await dialog.count()) throw Error('Backdrop did not dismiss dialog');
          interactions.push({
            url,
            focusContained: true,
            escapeAndReturnFocus: true,
            closeButton: true,
            backdrop: true,
          });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(out, 'results.json'),
    JSON.stringify(
      {
        method:
          'Browser-isolated synthetic data, external requests blocked. Not a live backend test.',
        results,
        errors,
        consoleErrors,
        unmapped,
        interactions,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        checks: results.length,
        overflows: results
          .filter((x) => x.overflow)
          .map((x) => ({ url: x.url, width: x.width, scrollWidth: x.scrollWidth })),
        errors,
        consoleErrors,
        unmapped,
        interactions,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
