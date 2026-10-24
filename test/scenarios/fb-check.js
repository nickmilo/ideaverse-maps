module.exports = async ({ page, sleep }) => {
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2000);
  console.log(await page.evaluate(() => { const b = document.querySelector('.ivm #follownote'); const r = b.getBoundingClientRect(); return `w${Math.round(r.width)} hidden=${b.hidden} disp=${getComputedStyle(b).display} html=${b.innerHTML.slice(0, 200)} parent=${b.parentElement.className}`; }));
};
