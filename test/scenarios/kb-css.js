module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(1500);
  console.log(await page.evaluate(() => { document.body.classList.add('is-phone'); const r = document.querySelector('.ivm'); r.classList.add('kb');
    const hd = r.querySelector('header'); const out = [...hd.children].map(c => (c.className || c.tagName) + ':' + getComputedStyle(c).display);
    const tbr = hd.querySelector('.tbr'); const kids = [...tbr.children].map(c => (c.id || c.className) + ':' + getComputedStyle(c).display);
    const vb = [...document.querySelectorAll('.ivm #vseg .vburied')].map(b => getComputedStyle(b).display);
    return out.join(' ') + '\n TBR: ' + kids.join(' ') + '\n vburied: ' + vb.join(','); }));
};
