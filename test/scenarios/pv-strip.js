module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(5000);
  const r = await page.evaluate(async () => { const v = app.workspace.getLeavesOfType('ideaverse-maps')[0].view, el = document.createElement('div'); document.body.appendChild(el);
    const P = ['Calendar/Days/x/2023/2023-03-11.md']; const out = []; for (const p of P) { el.innerHTML = ''; const m = v.map; } return 'ok'; });
  await page.locator('.ivm #q').fill('2023-03 - Trip to England'); await sleep(900); await page.keyboard.press('Enter'); await sleep(5000);
  console.log('pv', await page.evaluate(() => [...document.querySelectorAll('.ivm-pvl .ivm-pv')].map(e => e.querySelector('.pvt').textContent + ' :: ' + (e.querySelector('.callout, .block-language-dataview, .bases-view') ? 'HAS EMBED' : 'clean') + ' :: ' + e.querySelector('.pvb').textContent.slice(0, 60).replace(/\n/g, ' ')).join('\n')));
  await shot('pvs');
};
