module.exports = async ({ page, sleep, shot }) => {
  await page.evaluate(() => app.emulateMobile(false)); await sleep(2500);
  for (let t = 0; t < 12; t++) { await page.evaluate(() => app.commands.executeCommandById('ideaverse-maps:open')); try { await page.waitForSelector('.ivm canvas', { timeout: 60000 }); break; } catch (e) {} }
  await sleep(5000); await page.evaluate(() => document.querySelector('.ivm #vmore').click()); await sleep(800);
  console.log('rows', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')].slice(0, 5).map(c => c.innerText.replace(/\s+/g, ' ').trim()).join(' | ')));
  console.log('sr in menu', await page.evaluate(() => document.querySelectorAll('.ivm #vmorepop .ivm-sr').length), 'labels kept', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop .chip[aria-label]')].length));
  const r = await page.evaluate(() => document.querySelector('.ivm #vmorepop').getBoundingClientRect().toJSON()); await page.screenshot({ path: process.env.SHOTS + '/mapsmenu.png', clip: { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 600) } });
  console.log('html', await page.evaluate(() => [...document.querySelectorAll('.ivm #vmorepop > .chip')][1].outerHTML.slice(0, 600)));
  console.log('tip still on toolbar', await page.evaluate(() => document.querySelectorAll('.ivm header > * [data-tip], .ivm header [data-tip]').length));
};
