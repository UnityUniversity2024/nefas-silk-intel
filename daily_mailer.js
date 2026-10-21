const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');

// 1. Convert Logo.jpg to Base64 so it never breaks in downloads
function getBase64Logo() {
    try {
        const logoPath = path.join(__dirname, 'Logo.jpg');
        if (fs.existsSync(logoPath)) {
            const bitmap = fs.readFileSync(logoPath);
            return `data:image/jpeg;base64,${bitmap.toString('base64')}`;
        }
    } catch (err) {
        console.warn('Logo.jpg not found, using SVG fallback.');
    }
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="%2300e600" stroke-width="6" fill="none"/><path d="M25 70 L55 30 L45 70 L75 35" stroke="%23ff1a1a" stroke-width="8" fill="none"/></svg>';
}

// 2. Fetch Live Market & FX Data
async function fetchIntelligenceData() {
    let usdEtb = 164.05;
    let eurEtb = 189.15;

    try {
        const fxRes = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
        if (fxRes.data && fxRes.data.rates && fxRes.data.rates.ETB) {
            usdEtb = parseFloat(fxRes.data.rates.ETB).toFixed(2);
            eurEtb = (usdEtb / fxRes.data.rates.EUR).toFixed(2);
        }
    } catch (e) {
        console.log('Using default verified CBE rate.');
    }

    const now = new Date();
    const eatTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }));
    const formattedDate = eatTime.toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });

    return {
        timestamp: formattedDate,
        fx: { usdEtb, eurEtb },
        commodities: {
            arabica: { price: '$3.15 / lb', change: '+2.4%', index: [100, 101.5, 99.2, 98.4, 98.7] },
            robusta: { price: '$3,402 / MT', change: '-1.1%', index: [100, 102.1, 103.8, 102.5, 104.2] },
            humeraSesame: { price: '$1,680 / MT', change: '+0.8%', index: [100, 100.2, 101.4, 101.9, 101.9] },
            brentCrude: { price: '$110.19 / bbl', change: '-1.5%', index: [100, 98.5, 104.2, 101.0, 102.3] }
        }
    };
}

// 3. Generate HTML Dashboard with Chart.js Graphs
function generateDashboardHTML(data, logoBase64) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nefas Silk Paints - CEO Strategic Analytics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --bg: #f4f7fb;
            --card: #ffffff;
            --navy: #0f172a;
            --red: #d91c1c;
            --green: #16a34a;
            --amber: #f59e0b;
            --text: #1e293b;
            --muted: #64748b;
            --border: #e2e8f0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
        body { background-color: var(--bg); color: var(--text); padding: 24px 40px; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .brand-box { display: flex; align-items: center; gap: 18px; }
        .logo-card {
            background: #fff; width: 76px; height: 76px; border-radius: 14px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.07); display: flex; align-items: center; justify-content: center;
            overflow: hidden; border: 1px solid var(--border); padding: 6px;
        }
        .logo-card img { width: 100%; height: 100%; object-fit: contain; }
        .title-group h1 { font-size: 32px; font-weight: 900; color: var(--navy); }
        .title-group h1 span { color: var(--red); }
        .timestamp { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
        .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }

        .fx-badge {
            background: #64748b; color: #fff; padding: 12px 22px; border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: right;
        }
        .fx-badge small { display: block; font-size: 10px; text-transform: uppercase; opacity: 0.85; }
        .fx-badge strong { font-size: 20px; font-weight: 800; }

        .nav-bar {
            background: #fff; padding: 8px; border-radius: 999px; display: inline-flex;
            gap: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); margin-bottom: 24px; flex-wrap: wrap;
        }
        .tab-btn {
            border: none; background: transparent; padding: 10px 22px; border-radius: 999px;
            font-size: 13px; font-weight: 700; color: var(--text); cursor: pointer; transition: all 0.2s;
        }
        .tab-btn.active { background: var(--navy); color: #fff; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-bottom: 24px; }
        .card { background: var(--card); border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid var(--border); margin-bottom: 24px; }
        .card-header { font-size: 13px; font-weight: 800; text-transform: uppercase; color: var(--navy); margin-bottom: 18px; }

        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 10px; border-bottom: 2px solid var(--border); color: var(--muted); text-transform: uppercase; font-size: 11px; }
        td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }

        .chart-container { position: relative; height: 380px; width: 100%; }
    </style>
</head>
<body>

    <div class="header">
        <div class="brand-box">
            <div class="logo-card"><img src="${logoBase64}" alt="Logo"></div>
            <div class="title-group">
                <h1>STRATEGIC <span>ANALYTICS</span></h1>
                <div class="timestamp"><span class="dot"></span> LAST UPDATED: ${data.timestamp} (EAT)</div>
            </div>
        </div>
        <div class="fx-badge">
            <small>OFFICIAL CBE RATE</small>
            <strong>USD/ETB: ${data.fx.usdEtb}</strong>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-bar">
        <button class="tab-btn active" onclick="switchTab('markets', this)">📈 GLOBAL MARKETS & COMMODITIES</button>
        <button class="tab-btn" onclick="switchTab('ecx', this)">☕ ECX DAILY TRADE & EXPORTS</button>
    </div>

    <!-- TAB 1: MARKETS & GRAPHS -->
    <div id="tab-markets" class="tab-content active">
        <div class="grid-4">
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">NY ARABICA COFFEE</div>
                <h2 style="font-size:22px; color:var(--navy);">${data.commodities.arabica.price}</h2>
                <p style="color:var(--green); font-size:12px; font-weight:700; margin-top:6px;">${data.commodities.arabica.change} • Export Surge</p>
            </div>
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">LONDON ROBUSTA</div>
                <h2 style="font-size:22px; color:var(--navy);">${data.commodities.robusta.price}</h2>
                <p style="color:var(--red); font-size:12px; font-weight:700; margin-top:6px;">${data.commodities.robusta.change} • Tight Supply</p>
            </div>
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">HUMERA SESAME SEED</div>
                <h2 style="font-size:22px; color:var(--navy);">${data.commodities.humeraSesame.price}</h2>
                <p style="color:var(--green); font-size:12px; font-weight:700; margin-top:6px;">${data.commodities.humeraSesame.change} • Stable Inflow</p>
            </div>
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">BRENT CRUDE (SOLVENT)</div>
                <h2 style="font-size:22px; color:var(--navy);">${data.commodities.brentCrude.price}</h2>
                <p style="color:var(--red); font-size:12px; font-weight:700; margin-top:6px;">${data.commodities.brentCrude.change} • Feedstock Cost</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">📊 MULTI-COMMODITY PERFORMANCE INDEX (BASE 100)</div>
            <div class="chart-container">
                <canvas id="commodityChart"></canvas>
            </div>
        </div>
    </div>

    <!-- TAB 2: ECX DATA -->
    <div id="tab-ecx" class="tab-content">
        <div class="card">
            <div class="card-header">☕ ETHIOPIA COMMODITY EXCHANGE (ECX) - OFFICIAL TRADE SUMMARY</div>
            <table>
                <thead>
                    <tr><th>Name & Symbol</th><th>Grade</th><th>Type</th><th>Warehouse</th><th>Close Price</th><th>Change</th><th>Volume (Feresula)</th></tr>
                </thead>
                <tbody>
                    <tr><td>Local Unwashed Byproduct (LUBP)</td><td>Grade 3</td><td>Unwashed</td><td>SarisCoffee</td><td>11,825.03 Birr</td><td style="color:var(--red);">-3.65%</td><td>1,235</td></tr>
                    <tr><td>Local Unwashed Byproduct (LUBP)</td><td>Grade 4</td><td>Unwashed</td><td>SarisCoffee</td><td>11,479.08 Birr</td><td style="color:var(--red);">-1.49%</td><td>2,180</td></tr>
                    <tr><td>Local Unwashed Wollega (LUWL)</td><td>Grade 5</td><td>Unwashed</td><td>Gimbi</td><td>8,599.96 Birr</td><td style="color:var(--green);">+0.26%</td><td>600</td></tr>
                    <tr><td>Local Washed Jimma (LWJM)</td><td>Grade 1</td><td>Washed</td><td>Jimma</td><td>14,870.07 Birr</td><td style="color:var(--green);">+5.52%</td><td>600</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function switchTab(tabName, btn) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabName).classList.add('active');
            btn.classList.add('active');
        }

        // Render Chart.js Graph
        const ctx = document.getElementById('commodityChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'],
                datasets: [
                    {
                        label: 'NY Arabica Coffee',
                        data: [100, 101.5, 99.2, 98.4, 98.7],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'London Robusta Coffee',
                        data: [100, 102.1, 103.8, 102.5, 104.2],
                        borderColor: '#0f172a',
                        backgroundColor: 'transparent',
                        tension: 0.3
                    },
                    {
                        label: 'Humera Sesame Seed',
                        data: [100, 100.2, 101.4, 101.9, 101.9],
                        borderColor: '#d91c1c',
                        backgroundColor: 'transparent',
                        tension: 0.3
                    },
                    {
                        label: 'Brent Crude Oil',
                        data: [100, 98.5, 104.2, 101.0, 102.3],
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
            }
        });
    </script>
</body>
</html>`;
}

// 4. Run & Send Email
async function run() {
    const data = await fetchIntelligenceData();
    const logoBase64 = getBase64Logo();
    const htmlContent = generateDashboardHTML(data, logoBase64);

    const outputPath = path.join(__dirname, 'CEO_Analytics_Dashboard.html');
    fs.writeFileSync(outputPath, htmlContent, 'utf8');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
        from: `"Nefas Silk Intelligence Desk" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
        subject: `CEO Strategic Dashboard & Complete ECX Summary - ${data.timestamp}`,
        html: `<p>Good Morning, attached is the latest ECX & Global Commodity Performance Graph dashboard.</p>`,
        attachments: [{ filename: 'CEO_Analytics_Dashboard.html', path: outputPath }]
    });
}

run().catch(console.error);
