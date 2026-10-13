module.exports = async ({ page, sleep, shot }) => {
  const r = await page.evaluate(async () => { const t = app.setting.pluginTabs.find(t => t.id === 'ideaverse-maps'); try { t.display(); } catch (e) { return 'ERR ' + e.message; }
    document.body.appendChild(t.containerEl); t.containerEl.style.cssText = 'position:fixed;inset:40px 200px;background:var(--background-primary);z-index:999;overflow:auto;padding:20px';
    return [...t.containerEl.querySelectorAll('.setting-item-name')].map(e => e.textContent).join(' | '); });
  console.log('settings:', r); await sleep(500); await shot('r-settings');
};
