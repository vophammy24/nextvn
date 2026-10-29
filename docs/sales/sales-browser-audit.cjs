// Visual-only browser preview. Every API response is intercepted; no database is touched.
const { chromium } = require('../../../ui-audit-tools/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'browser-captures');
fs.mkdirSync(out, { recursive: true });
const branch = '11111111-1111-4111-8111-111111111111';
const business = '22222222-2222-4222-8222-222222222222';
const area = '33333333-3333-4333-8333-333333333333';
const table = '44444444-4444-4444-8444-444444444444';
const order = '55555555-5555-4555-8555-555555555555';
const shift = '66666666-6666-4666-8666-666666666666';
const menu = '77777777-7777-4777-8777-777777777777';
const now = '2026-10-28T08:00:00.000Z';
const orderRow = {
  id: order,
  branchId: branch,
  tableId: table,
  shiftId: shift,
  cashierId: 'user',
  orderType: 'DINE_IN',
  orderingMode: 'TABLE',
  status: 'OPEN',
  subtotal: 45000,
  discount: 0,
  total: 45000,
  note: null,
  revision: 1,
  requestKey: null,
  createdAt: now,
  updatedAt: now,
  items: [
    {
      id: 'line',
      orderId: order,
      menuItemId: menu,
      name: 'Cà phê sữa',
      unitPrice: 45000,
      quantity: 1,
      total: 45000,
      note: null,
      modifierKeys: [],
    },
  ],
  payments: [],
};
const tableRows = [
  {
    id: table,
    branchId: branch,
    areaId: area,
    name: 'Bàn 01',
    seats: 4,
    isActive: true,
    effectiveStatus: 'OCCUPIED',
    status: 'OCCUPIED',
    currentOrder: { id: order, total: 45000, createdAt: now },
    inconsistent: false,
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    branchId: branch,
    areaId: area,
    name: 'Bàn 02',
    seats: 2,
    isActive: true,
    effectiveStatus: 'AVAILABLE',
    status: 'AVAILABLE',
    currentOrder: null,
    inconsistent: false,
  },
];
let checkoutRequests = 0;
function reply(url, request, role = 'MANAGER') {
  const pathname = new URL(url).pathname;
  if (pathname.endsWith('/checkout') && request.method() === 'POST') {
    const body = request.postDataJSON();
    if (
      body.expectedTotal !== 45000 ||
      body.paymentTiming !== 'NOW' ||
      body.method !== 'CASH' ||
      body.confirmed !== true ||
      !body.requestKey
    )
      throw new Error('Invalid checkout preview request');
    checkoutRequests++;
    return {
      data: {
        ...orderRow,
        tableId: null,
        orderingMode: 'COUNTER',
        orderType: 'TAKEAWAY',
        status: 'PAID',
        requestKey: body.requestKey,
        payments: [{ id: 'payment', method: 'CASH', amount: 45000 }],
      },
    };
  }
  if (pathname.endsWith('/workspace'))
    return {
      user: {
        id: 'user',
        fullName: role === 'OWNER' ? 'Chủ quán thử nghiệm' : 'Nhân viên thử nghiệm',
      },
      business: { id: business, name: 'Quán minh họa' },
      ...(role === 'OWNER' ? {} : { branch: { id: branch, name: 'Chi nhánh 1' } }),
      role,
    };
  if (pathname.endsWith('/owner/branches'))
    return { data: [{ id: branch, name: 'Chi nhánh 1', isActive: true }] };
  if (pathname.endsWith('/settings'))
    return {
      data: {
        serviceType: 'BOTH',
        counterPaymentPolicy: 'STAFF_CHOICE',
        dineInOrderingMode: 'BOTH',
      },
    };
  if (pathname.endsWith('/catalog'))
    return {
      data: [
        {
          id: menu,
          categoryId: 'coffee',
          name: 'Cà phê sữa',
          price: 45000,
          description: null,
          imageUrl: null,
          modifiers: [],
        },
      ],
    };
  if (pathname.endsWith('/areas'))
    return {
      data: [{ id: area, branchId: branch, name: 'Tầng 1', isActive: true, displayOrder: 0 }],
    };
  if (pathname.endsWith('/tables')) return { data: tableRows };
  if (pathname.endsWith('/active'))
    return {
      data: {
        id: shift,
        branchId: branch,
        staffId: 'user',
        status: 'ACTIVE',
        startedAt: now,
        endedAt: null,
      },
    };
  if (pathname.endsWith('/summary'))
    return {
      data: {
        shift: { id: shift, status: 'ACTIVE', startedAt: now, staffId: 'user' },
        summary: {
          totalOrders: 1,
          paidOrders: 0,
          unpaidOrders: 1,
          cancelledOrders: 0,
          collectedRevenue: 0,
          cashReceived: 0,
          bankTransferReceived: 0,
          occupiedTables: 1,
        },
        recentTransactions: [],
      },
    };
  if (pathname.endsWith('/orders'))
    return {
      data: { data: [orderRow], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    };
  if (pathname.endsWith('/orders/' + order)) return { data: orderRow };
  throw new Error('Unexpected preview API: ' + pathname);
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const failures = [];
  try {
    for (const width of [1920, 1366, 1024, 768, 390, 360]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
      });
      await context.addInitScript(() =>
        localStorage.setItem('access_token', 'visual-preview-only'),
      );
      const page = await context.newPage();
      page.on('pageerror', (error) => failures.push(`${width}: ${error.message}`));
      await page.route('**/api/**', async (route) => {
        try {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(reply(route.request().url(), route.request())),
          });
        } catch (error) {
          failures.push(`${width}: ${error.message}`);
          await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        }
      });
      for (const [name, pathname] of [
        ['pos', '/app/pos'],
        ['tables', '/app/tables'],
        ['orders', '/app/orders'],
        ['shift', '/app/shift'],
        ['settings', '/app/sales-settings'],
      ]) {
        await page.goto('http://127.0.0.1:5173' + pathname);
        await page.locator('.page-content h1').first().waitFor();
        await page.waitForTimeout(250);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        if (overflow) failures.push(`${name}-${width}: horizontal overflow`);
        if (name === 'pos' && width === 1366) {
          await page.getByRole('button', { name: 'Thêm món' }).click();
          await page.getByRole('button', { name: 'Xác nhận thu tiền' }).click();
          await page
            .getByRole('dialog', { name: 'Xác nhận thu tiền ngay' })
            .getByRole('button', { name: 'Đã nhận tiền' })
            .click();
          await page
            .getByRole('status', { name: '' })
            .filter({ hasText: 'Đã xác nhận thu tiền và hoàn tất đơn.' })
            .waitFor();
        }
      }
      await context.close();
    }
    const ownerContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await ownerContext.addInitScript(() =>
      localStorage.setItem('access_token', 'visual-preview-only'),
    );
    const ownerPage = await ownerContext.newPage();
    ownerPage.on('pageerror', (error) => failures.push(`owner: ${error.message}`));
    await ownerPage.route('**/api/**', async (route) => {
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(reply(route.request().url(), route.request(), 'OWNER')),
        });
      } catch (error) {
        failures.push(`owner: ${error.message}`);
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      }
    });
    for (const [name, pathname] of [
      ['owner-settings', '/app/sales-settings'],
      ['owner-tables', `/app/tables?branchId=${branch}`],
    ]) {
      await ownerPage.goto('http://127.0.0.1:5173' + pathname);
      await ownerPage.locator('.page-content h1').first().waitFor();
      if (name === 'owner-settings')
        await ownerPage.getByRole('combobox', { name: 'Chi nhánh' }).selectOption(branch);
      if (name === 'owner-tables')
        await ownerPage.getByRole('combobox', { name: 'Chi nhánh' }).waitFor();
      await ownerPage.waitForTimeout(250);
      await ownerPage.evaluate(() => scrollTo(0, 0));
      await ownerPage.screenshot({ path: path.join(out, `${name}-1366.png`), fullPage: true });
      if (await ownerPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
        failures.push(`${name}: horizontal overflow`);
    }
    await ownerContext.close();
  } finally {
    await browser.close();
  }
  if (checkoutRequests !== 1)
    failures.push(`Expected one checkout request, received ${checkoutRequests}`);
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      'Visual preview PASS: 5 routes × 6 widths, no page errors or horizontal overflow. Screenshots in docs/sales/browser-captures.',
    );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
