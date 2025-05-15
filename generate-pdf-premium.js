const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs =require('fs').promises;
const path = require('path');

// --- Handlebars Helpers ---
handlebars.registerHelper('formatCurrency', function (value) {
    if (value === null || typeof value === 'undefined') return ''; // Handle null/undefined
    if (typeof value !== 'number') {
        // Versuche, es in eine Zahl umzuwandeln, falls es ein String ist
        const numValue = parseFloat(String(value).replace('.', '').replace(',', '.'));
        if (isNaN(numValue)) return value; // Wenn immer noch keine Zahl, gib Original zurück
        value = numValue;
    }
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

handlebars.registerHelper('formatCurrencyPositive', function (value) {
    if (value === null || typeof value === 'undefined') return ''; // Handle null/undefined
    if (typeof value !== 'number') {
        const numValue = parseFloat(String(value).replace('.', '').replace(',', '.'));
        if (isNaN(numValue)) return value;
        value = numValue;
    }
    const num = Math.abs(value);
    return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

// Hilfsfunktion: not equal (ne) - KORRIGIERT ZU INLINE HELPER
handlebars.registerHelper('ne', function (v1, v2) {
    return v1 !== v2; // Gibt true oder false zurück
});

// Hilfsfunktion: greater than (gt) - KORRIGIERT ZU INLINE HELPER
handlebars.registerHelper('gt', function (v1, v2) {
    return v1 > v2; // Gibt true oder false zurück
});


async function generatePremiumPdf() {
    try {
        const dataBuffer = await fs.readFile(path.join(__dirname, 'data-premium.json'));
        const data = JSON.parse(dataBuffer.toString());

        const templateHtml = await fs.readFile(path.join(__dirname, 'template-premium.html'), 'utf8');
        const cssContent = await fs.readFile(path.join(__dirname, 'styles-premium.css'), 'utf8');

        const template = handlebars.compile(templateHtml);
        const renderedHtml = template(data);

        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });
        await page.addStyleTag({ content: cssContent });

        const footerDate = data.dokument.generierungsdatum || new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const vermieterNameShort = data.vermieter.name.substring(0, 30);

        const pdfPath = path.join(__dirname, 'nebenkostenabrechnung-premium.pdf');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            },
            displayHeaderFooter: true,
            footerTemplate: `
                <div style="font-size: 7pt; width: 100%; padding: 0 10mm; box-sizing: border-box; display: flex; justify-content: space-between; color: #777; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <span>${vermieterNameShort} - PDF generiert am: ${footerDate}</span>
                    <div>
                        Seite <span class="pageNumber"></span> von <span class="totalPages"></span>
                    </div>
                </div>
            `,
            headerTemplate: '<div style="font-size: 7pt; width: 100%; text-align:center; color: #ccc; font-family: Arial, sans-serif;"></div>'
        });

        console.log(`Premium PDF erfolgreich generiert: ${pdfPath}`);
        await browser.close();

    } catch (error) {
        console.error("Fehler bei der Premium PDF-Generierung:", error);
    }
}

generatePremiumPdf();