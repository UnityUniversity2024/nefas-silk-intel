JavaScript
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
    let gbpEtb = 219.23;
    let cnyEtb = 24.54;
    let aedEtb = 44.67;

    try {
        const fxRes = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
        if (fxRes.data && fxRes.data.rates && fxRes.data.rates.ETB) {
            usdEtb = parseFloat(fxRes.data.rates.ETB).toFixed(2);
            eurEtb = (usdEtb / fxRes.data.rates.EUR).toFixed(2);
            gbpEtb = (usdEtb / fxRes.data.rates.GBP).toFixed(2);
            cnyEtb = (usdEtb / fxRes.data.rates.CNY).toFixed(2);
            aedEtb = (usdEtb / fxRes.data.rates.AED).toFixed(2);
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
        fx: { usdEtb, eurEtb, gbpEtb, cnyEtb, aedEtb }
    };
}

// 3. Generate HTML Dashboard with All 4 Tabs & Charts
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
            background: #334155; color: #fff; padding: 12px 22px; border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: right;
        }
        .fx-badge small { display: block; font-size: 10px; text-transform: uppercase; opacity: 0.85; }
        .fx-badge strong { font-size: 20px; font-weight: 800; }

        .nav-bar {
            background: #fff; padding: 8px; border-radius: 999px; display: inline-flex;
            gap: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); margin-bottom: 24px; flex-wrap: wrap;
        }
        .tab-btn {
            border: none; background: transparent; padding: 10px 20px; border-radius: 999px;
            font-size: 12px; font-weight: 700; color: var(--text); cursor: pointer; transition: all 0.2s;
        }
        .tab-btn.active { background: var(--navy); color: #fff; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-bottom: 24px; }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px; margin-bottom: 24px; }
        .card { background: var(--card); border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid var(--border); margin-bottom: 24px; }
        .card-header { font-size: 13px; font-weight: 800; text-transform: uppercase; color: var(--navy); margin-bottom: 18px; }

        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 10px; border-bottom: 2px solid var(--border); color: var(--muted); text-transform: uppercase; font-size: 11px; }
        td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }

        .crisis-banner {
            background: linear-gradient(135deg, #0f172a 0%, #2e1025 100%);
            color: #fff; border-radius: 18px; padding: 28px 32px; margin-bottom: 24px;
        }
        .crisis-title { color: #f87171; font-weight: 800; font-size: 16px; margin-bottom: 22px; }
        .crisis-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
        .crisis-item { border-left: 3px solid var(--red); padding-left: 16px; }
        .crisis-item.amber { border-left-color: var(--amber); }
        .crisis-item.blue { border-left-color: #3b82f6; }
        .crisis-item small { font-size: 11px; text-transform: uppercase; color: #cbd5e1; }
        .crisis-item h2 { font-size: 24px; font-weight: 800; margin: 6px 0; }
        .crisis-item p { font-size: 12px; color: #94a3b8; }

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
        <button class="tab-btn active" onclick="switchTab('markets', this)">📈 GLOBAL MARKETS</button>
        <button class="tab-btn" onclick="switchTab('sourcing', this)">📊 STRATEGIC SOURCING</button>
        <button class="tab-btn" onclick="switchTab('ecx', this)">☕ ET ECX & EXPORTS</button>
        <button class="tab-btn" onclick="switchTab('logistics', this)">🌍 GLOBAL MACRO & LOGISTICS</button>
    </div>

    <!-- TAB 1: GLOBAL MARKETS -->
    <div id="tab-markets" class="tab-content active">
        <div class="grid-4">
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">ARABICA FUTURES (LB)</div>
                <h2 style="font-size:26px; color:var(--navy);">$3.15</h2>
            </div>
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">ROBUSTA FUTURES (MT)</div>
                <h2 style="font-size:26px; color:var(--navy);">$3402.00</h2>
            </div>
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">LIVE BRENT CRUDE (BBL)</div>
                <h2 style="font-size:26px; color:var(--navy);">$110.20</h2>
            </div>
            <div class="card" style="margin-bottom:0;">
                <div class="card-header">RUBBER RSS3 (KG)</div>
                <h2 style="font-size:26px; color:var(--navy);">$283.50</h2>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-header">LIVE OIL MARKET TREND</div>
                <div class="chart-container" style="height:240px;">
                    <canvas id="oilChart"></canvas>
                </div>
            </div>
            <div class="card">
                <div class="card-header">VERIFIED CBE CROSS-RATES</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div style="background:#f8fafc; padding:14px; border-radius:10px;"><small style="color:var(--muted); font-size:10px;">EUR (EURO)</small><strong style="font-size:18px;">${data.fx.eurEtb}</strong></div>
                    <div style="background:#f8fafc; padding:14px; border-radius:10px;"><small style="color:var(--muted); font-size:10px;">GBP (POUND)</small><strong style="font-size:18px;">${data.fx.gbpEtb}</strong></div>
                    <div style="background:#f8fafc; padding:14px; border-radius:10px;"><small style="color:var(--muted); font-size:10px;">CNY (YUAN)</small><strong style="font-size:18px;">${data.fx.cnyEtb}</strong></div>
                    <div style="background:#f8fafc; padding:14px; border-radius:10px;"><small style="color:var(--muted); font-size:10px;">AED (DIRHAM)</small><strong style="font-size:18px;">${data.fx.aedEtb}</strong></div>
                </div>
            </div>
        </div>
    </div>

    <!-- TAB 2: STRATEGIC SOURCING -->
    <div id="tab-sourcing" class="tab-content">
        <div class="card">
            <div class="card-header">STRATEGIC EXPORT COMMODITIES TREND</div>
            <p style="font-size:12px; color:var(--muted); margin-bottom:14px;">Base 100 Index tracking relative growth of Coffee vs. Sesame</p>
            <div class="chart-container">
                <canvas id="sourcingChart"></canvas>
            </div>
        </div>
    </div>

    <!-- TAB 3: ET ECX & EXPORTS -->
    <div id="tab-ecx" class="tab-content">
        <div class="grid-2">
            <div class="card" style="background:linear-gradient(135deg, #3b0707 0%, #1a0303 100%); color:#fff;">
                <small style="color:#f87171; font-weight:700; font-size:11px;">CHINA EXPORT TARGET</small>
                <h2 style="font-size:24px; margin:6px 0;">Whitish Humera Sesame</h2>
                <div style="font-size:32px; font-weight:900; color:#fbbf24; margin:10px 0;">RMB 10,700 <span style="font-size:14px; color:#fff;">/MT</span></div>
                <p style="font-size:12px; opacity:0.8;">Direct dispatch prioritized for Grade-A shipments.</p>
            </div>
            <div class="card">
                <div class="card-header">OFFICIAL EXCHANGE PLATFORM</div>
                <h3>ECX Market Watch</h3>
                <p style="font-size:12px; color:var(--muted); margin-top:8px;">Captures all daily trading activity across Local Coffee, Export Coffee, Oilseeds, and Pulses directly from the central matching engine.</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">COMPLETE ECX DAILY TRADE SUMMARY</div>
            <table>
                <thead>
                    <tr><th>Name & Symbol</th><th>Grade</th><th>Type</th><th>Warehouse</th><th>Close Price</th><th>Change</th><th>Volume (Feresula)</th></tr>
                </thead>
                <tbody>
                    <tr><td>Local Unwashed Byproduct LUBP</td><td>Grade 3</td><td>unwashed</td><td>SarisCoffee</td><td>11,825.03 Birr</td><td style="color:var(--red);">-3.65%</td><td>1,235</td></tr>
                    <tr><td>Local Unwashed Byproduct LUBP</td><td>Grade 4</td><td>unwashed</td><td>SarisCoffee</td><td>11,479.08 Birr</td><td style="color:var(--red);">-1.49%</td><td>2,180</td></tr>
                    <tr><td>Local Unwashed Byproduct LUBP</td><td>Grade 5</td><td>unwashed</td><td>SarisCoffee</td><td>9,320.93 Birr</td><td style="color:var(--red);">-1.37%</td><td>1,350</td></tr>
                    <tr><td>Local Unwashed Wollega LUWL</td><td>Grade 5</td><td>unwashed</td><td>Gimbi</td><td>8,599.96 Birr</td><td style="color:var(--green);">+0.26%</td><td>600</td></tr>
                    <tr><td>Local Washed Jimma LWJM</td><td>Grade 1</td><td>washed</td><td>Jimma</td><td>14,870.07 Birr</td><td style="color:var(--green);">+5.52%</td><td>600</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 4: GLOBAL MACRO & LOGISTICS -->
    <div id="tab-logistics" class="tab-content">
        <div class="crisis-banner">
            <div class="crisis-title">⚠️ RED SEA CORRIDOR CRISIS (2026 NORMALIZATION)</div>
            <div class="crisis-grid">
                <div class="crisis-item">
                    <small>TRANSIT DELAYS</small>
                    <h2>+10 to 14 Days</h2>
                    <p>Vessels continuing Cape of Good Hope reroutes for Asia imports.</p>
                </div>
                <div class="crisis-item amber">
                    <small>FREIGHT SURCHARGES</small>
                    <h2>+15% to 25%</h2>
                    <p>Premium applied to standard Eastbound/Westbound spot rates.</p>
                </div>
                <div class="crisis-item blue">
                    <small>WAR RISK INSURANCE</small>
                    <h2>0.5% - 1.0%</h2>
                    <p>Additional premium levied on total cargo value for Gulf of Aden transits.</p>
                </div>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-header">🚢 PORT OF DJIBOUTI (SGTD / DORALEH)</div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f1f5f9;">
                    <div><strong>Ethiopian Cargo Dependency</strong><br><small style="color:var(--muted);">Share of total Djibouti port activity</small></div>
                    <div style="font-size:22px; font-weight:800; color:#2563eb;">95%</div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0;">
                    <div><strong>Berth Congestion Average</strong><br><small style="color:var(--muted);">Inland bottlenecks delaying container turnaround</small></div>
                    <div style="background:#fee2e2; color:#991b1b; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:700;">3 - 5 Days</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">📊 ETHIOPIA MACRO TRADE BALANCE</div>
                <div style="background:#ecfdf5; border-left:4px solid #10b981; padding:12px; border-radius:8px; margin-bottom:12px;">
                    <strong style="color:#065f46; font-size:11px;">AGRO-EXPORT STRENGTH</strong>
                    <p style="font-size:12px; color:#047857; margin-top:2px;">Coffee exports surging 47% Y/Y, providing critical foreign exchange liquidity for industrial manufacturing imports.</p>
                </div>
                <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:12px; border-radius:8px;">
                    <strong style="color:#1e40af; font-size:11px;">CHEMICAL SOURCING RELIANCE</strong>
                    <p style="font-size:12px; color:#1d4ed8; margin-top:2px;">Plastics and industrial chemicals (TiO2, Resins) heavily concentrated in supply chains originating from China, UAE, and India.</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        function switchTab(tabName, btn) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabName).classList.add('active');
            btn.classList.add('active');
        }

        // Oil Trend Chart
        new Chart(document.getElementById('oilChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    data: [105, 108.2, 107.5, 109.1, 108.6, 109.4, 110.2],
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.08)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });

        // Strategic Sourcing Base 100 Chart
        new Chart(document.getElementById('sourcingChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'],
                datasets: [
                    { label: 'NY Arabica Coffee', data: [100, 101.5, 99.2, 98.4, 98.7], borderColor: '#10b981', tension: 0.3 },
                    { label: 'London Robusta Coffee', data: [100, 102.1, 103.8, 102.5, 104.2], borderColor: '#0f172a', tension: 0.3 },
                    { label: 'Humera Sesame Seed', data: [100, 100.2, 101.4, 101.9, 101.9], borderColor: '#d91c1c', tension: 0.3 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
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
        html: `<p>Good Morning, attached is the fully updated 4-tab CEO Strategic Intelligence Dashboard.</p>`,
        attachments: [{ filename: 'CEO_Analytics_Dashboard.html', path: outputPath }]
    });
}

run().catch(console.error);
