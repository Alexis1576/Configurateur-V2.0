const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Listen to console logs
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Expose a function to capture state
  const result = await page.evaluate(async () => {
    return new Promise(resolve => {
      // Give it a bit of time to ensure 3D is loaded
      setTimeout(() => {
        if (window.captureMiseEnPlanViews) {
          window.captureMiseEnPlanViews(images => {
            resolve(images);
          });
        } else {
          resolve({ error: "captureMiseEnPlanViews not found" });
        }
      }, 2000);
    });
  });

  if (result.error) {
    console.log("Error:", result.error);
  } else {
    console.log("Captured images keys:", Object.keys(result));
    
    // Save images to scratch folder for inspection
    for (const key of Object.keys(result)) {
      if (result[key] && result[key].startsWith('data:image/png;base64,')) {
        const base64Data = result[key].replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(`scratch/test_${key}.png`, base64Data, 'base64');
        console.log(`Saved scratch/test_${key}.png`);
      }
    }
  }

  await browser.close();
})();
