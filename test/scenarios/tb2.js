module.exports = async ({ page, sleep, shot }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); await page.waitForSelector('.ivm canvas', { timeout: 120000 }); await sleep(2500);
  await shot('tb-emergence');
  const C = async (sel, name) => { await page.evaluate(sel => document.querySelector('.ivm ' + sel).click(), sel); await sleep(500); if (name) await shot(name); };
  await C('#vseg button[data-v=emergence]', 'tb-mapopts'); await C('#vseg button[data-v=emergence]');
  await C('#arrbtn', 'tb-arrange'); await C('#arrbtn');
  await C('#filtbtn', 'tb-filter'); await C('#foldbtn', 'tb-filter-folders'); await page.keyboard.press('Escape'); await sleep(300);
  await C('#dispbtn', 'tb-display'); await C('#dispbtn');
  await C('#vmore'); await C('#goshelf'); await sleep(2000); await shot('tb-shelf'); await C('#grpbtn', 'tb-group'); await C('#grpbtn');
  await C('#vcur', 'tb-shelf-opts'); await C('#vcur');
  await C('#vmore'); await C('#gocso'); await sleep(2500); await C('#vcur', 'tb-corona-opts');
  console.log('errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
};
