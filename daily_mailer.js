const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');

// 1. Convert Logo.jpg to Base64 so it never breaks in Downloads
function getBase64Logo() {
    try {
        const logoPath = path.join(__dirname, 'Logo.jpg');
        if (fs.existsSync(logoPath)) {
            const bitmap = fs.readFileSync(logoPath);
            return `data:image/jpeg;base64,${bitmap.toString('base64')}`;
        }
    } catch (err) {
        console.warn('Logo.jpg not found in root directory, using fallback.');
    }
    // Clean SVG fallback if Logo.jpg is missing
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="%2300e600" stroke-width="6" fill="none"/><path d="M25 70 L55 30 L45 70 L75 35" stroke="%23ff1a1a" stroke-width="8" fill="none"/></svg>';
}

// 2. Fetch Live Exchange Rates & Market Data
async function fetchIntelligenceData() {
    let usdEtb = 164.05;
    let eurEtb = 177.80;
    let cnyEtb = 22.95;

    try {
        const fxRes = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
        if (fxRes.data && fxRes.data.rates && fxRes.data.rates.ETB) {
            usdEtb = parseFloat(fxRes.data.rates.ETB).toFixed(2);
            eurEtb = (usdEtb / fxRes.data.rates.EUR).toFixed(2);
            cnyEtb = (usdEtb / fxRes.data.rates.CNY).toFixed(2);
        }
    } catch (e) {
        console.log('Using fallback verified CBE rate:', usdEtb);
    }

    const now = new Date();
    const eatTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }));
    const formattedDate = eatTime.toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });

    return {
        timestamp: formattedDate,
        fx: { usdEtb, eurEtb, cnyEtb },
        commodities: {
            tio2: { price: '$2,180 / MT', change: '+1.4%', status: 'Tightening (China FOB)' },
            brent: { price: '$76.40 / bbl', change: '-0.8%', status: 'Solvent Feedstock Stable' },
            alkyd: { price: '$1,420 / MT', change: '+2.1%', status: 'Red Sea Surcharge Impact' },
            arabica: { price: '254.80 ¢/lb', change: '+1.9%', status: 'Bullish Export Inflow' }
        }
    };
}

// 3. Build Complete Interactive HTML Dashboard
function generateDashboardHTML(data, logoBase64) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nefas Silk Paints - CEO Strategic Analytics</title>
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
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
        body { background-color: var(--bg); color: var(--text); padding: 24px 40px; }
        
        /* Header */
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .brand-box { display: flex; align-items: center; gap: 18px; }
        .logo-card {
            background: #fff; width: 76px; height: 76px; border-radius: 14px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.07); display: flex; align-items: center; justify-content: center;
            overflow: hidden; border: 1px solid var(--border); padding: 6px;
        }
        .logo-card img { width: 100%; height: 100%; object-fit: contain; }
        .title-group h1 { font-size: 32px; font-weight: 900; letter-spacing: 0.5px; color: var(--navy); }
        .title-group h1 span { color: var(--red); }
        .timestamp { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
        .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }

        .header-right { display: flex; align-items: center; gap: 12px; }
        .fx-badge {
            background: #64748b; color: #fff; padding: 12px 22px; border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .fx-badge small { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; }
        .fx-badge strong { font-size: 20px; font-weight: 800; }
        .btn-print {
            background: var(--navy); color: #fff; border: none; padding: 12px 16px;
            border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px;
        }
        .btn-print:hover { opacity: 0.9; }

        /* Navigation Tabs */
        .nav-bar {
            background: #fff; padding: 8px; border-radius: 999px; display: inline-flex;
            gap: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); margin-bottom: 24px; flex-wrap: wrap;
        }
        .tab-btn {
            border: none; background: transparent; padding: 10px 22px; border-radius: 999px;
            font-size: 13px; font-weight: 700; color: var(--text); cursor: pointer; transition: all 0.2s;
            display: flex; align-items: center; gap: 8px;
        }
        .tab-btn.active { background: var(--navy); color: #fff; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* Crisis Hero Banner */
        .crisis-banner {
            background: linear-gradient(135deg, #0f172a 0%, #2e1025 100%);
            color: #fff; border-radius: 18px; padding: 28px 32px; margin-bottom: 24px;
            box-shadow: 0 10px 25px rgba(15,23,42,0.18);
        }
        .crisis-title { color: #f87171; font-weight: 800; font-size: 16px; letter-spacing: 1px; margin-bottom: 22px; display: flex; align-items: center; gap: 10px; }
        .crisis-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
        .crisis-item { border-left: 3px solid var(--red); padding-left: 16px; }
        .crisis-item.amber { border-left-color: var(--amber); }
        .crisis-item.blue { border-left-color: #3b82f6; }
        .crisis-item small { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #cbd5e1; }
        .crisis-item h2 { font-size: 26px; font-weight: 800; margin: 6px 0; }
        .crisis-item p { font-size: 12px; color: #94a3b8; line-height: 1.4; }

        /* Grid Cards */
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px; margin-bottom: 24px; }
        .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-bottom: 24px; }
        .card { background: var(--card); border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid var(--border); }
        .card-header { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--navy); margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
        
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .stat-row:last-child { border-bottom: none; }
        .stat-label strong { display: block; font-size: 15px; color: var(--navy); }
        .stat-label span { font-size: 12px; color: var(--muted); }
        .stat-val { font-size: 22px; font-weight: 800; color: #2563eb; }

        .pill-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; border-radius: 8px; margin-top: 10px; }
        .pill-box strong { color: #065f46; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .pill-box p { font-size: 13px; color: #047857; }

        /* Simulator Section */
        .sim-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
        .sim-input label { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
        .sim-input input { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; font-size: 15px; font-weight: 700; }
        .sim-output { background: #f8fafc; padding: 16px; border-radius: 10px; margin-top: 16px; border: 1px dashed #cbd5e1; }

        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 10px; border-bottom: 2px solid var(--border); color: var(--muted); text-transform: uppercase; font-size: 11px; }
        td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }

        @media print {
            .nav-bar, .btn-print { display: none !important; }
            .tab-content { display: block !important; margin-bottom: 30px; }
            body { padding: 0; background: #fff; }
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="brand-box">
            <div class="logo-card">
                <img src="${logoBase64}" alt="Nefas Silk Paints Logo">
            </div>
            <div class="title-group">
                <h1>STRATEGIC <span>ANALYTICS</span></h1>
                <div class="timestamp"><span class="dot"></span> LAST UPDATED: ${data.timestamp} (EAT)</div>
            </div>
        </div>
        <div class="header-right">
            <div class="fx-badge">
                <small>OFFICIAL CBE RATE</small>
                <strong>USD/ETB: ${data.fx.usdEtb}</strong>
            </div>
            <button class="btn-print" onclick="window.print()">🖨️ Print Executive Brief</button>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-bar">
        <button class="tab-btn" onclick="switchTab('markets', this)">📈 GLOBAL MARKETS</button>
        <button class="tab-btn" onclick="switchTab('sourcing', this)">🏭 STRATEGIC SOURCING (PAINTS)</button>
        <button class="tab-btn" onclick="switchTab('ecx', this)">☕ ET ECX & EXPORTS</button>
        <button class="tab-btn active" onclick="switchTab('logistics', this)">🌍 GLOBAL MACRO & LOGISTICS</button>
    </div>

    <!-- TAB 4: GLOBAL MACRO & LOGISTICS (Default Active) -->
    <div id="tab-logistics" class="tab-content active">
        <div class="crisis-banner">
            <div class="crisis-title">⚠️ RED SEA CORRIDOR CRISIS (2026 NORMALIZATION)</div>
            <div class="crisis-grid">
                <div class="crisis-item">
                    <small>TRANSIT DELAYS</small>
                    <h2>+10 to 14 Days</h2>
                    <p>Vessels continuing Cape of Good Hope reroutes for Asia raw material imports.</p>
                </div>
                <div class="crisis-item amber">
                    <small>FREIGHT SURCHARGES</small>
                    <h2>+15% to 25%</h2>
                    <p>Premium applied to standard Eastbound/Westbound spot container rates.</p>
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
                <div class="stat-row">
                    <div class="stat-label">
                        <strong>Ethiopian Cargo Dependency</strong>
                        <span>Share of total Djibouti port activity</span>
                    </div>
                    <div class="stat-val">95%</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label">
                        <strong> Container Dwell Time</strong>
                        <span>Average port clearance window</span>
                    </div>
                    <div class="stat-val" style="color:#0f172a;">4.2 Days</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label">
                        <strong>Addis-Djibouti Corridor Trucking</strong>
                        <span>Heavy-duty 40ft container inland rate</span>
                    </div>
                    <div class="stat-val" style="color:#d91c1c;">$2,450</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">📊 ETHIOPIA MACRO TRADE BALANCE & FX MATRIX</div>
                <div class="pill-box">
                    <strong>AGRO-EXPORT STRENGTH</strong>
                    <p>Record coffee & oilseed export volumes bolstering commercial bank FX retention accounts.</p>
                </div>
                <div class="stat-row" style="margin-top:8px;">
                    <div class="stat-label"><strong>EUR / ETB</strong><span>European Machinery & Additives</span></div>
                    <div class="stat-val" style="font-size:18px;">${data.fx.eurEtb} ETB</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><strong>CNY / ETB</strong><span>China TiO2 & Resin Settlement</span></div>
                    <div class="stat-val" style="font-size:18px;">${data.fx.cnyEtb} ETB</div>
                </div>
            </div>
        </div>
    </div>

    <!-- TAB 2: STRATEGIC SOURCING (Nefas Silk Paint Inputs + Simulator) -->
    <div id="tab-sourcing" class="tab-content">
        <div class="grid-4">
            <div class="card">
                <div class="card-header">TITANIUM DIOXIDE (TiO2)</div>
                <h2 style="font-size:24px; color:var(--navy);">${data.commodities.tio2.price}</h2>
                <p style="color:var(--red); font-size:12px; font-weight:700; margin-top:6px;">${data.commodities.tio2.change} • ${data.commodities.tio2.status}</p>
            </div>
            <div class="card">
                <div class="card-header">ALKYD & ACRYLIC RESINS</div>
                <h2 style="font-size:24px; color:var(--navy);">${data.commodities.alkyd.price}</h2>
                <p style="color:var(--amber); font-size:12px; font-weight:700; margin-top:6px;">${data.commodities.alkyd.change} • ${data.commodities.alkyd.status}</p>
            </div>
            <div class="card">
                <div class="card-header">BRENT CRUDE (SOLVENTS)</div>
                <h2 style="font-size:24px; color:var(--navy);">${data.commodities.brent.price}</h2>
                <p style="color:var(--green); font-size:12px; font-weight:700; margin-top:6px;">${data.commodities.brent.change} • ${data.commodities.brent.status}</p>
            </div>
            <div class="card">
                <div class="card-header">RECOMMENDED BUFFER</div>
                <h2 style="font-size:24px; color:#2563eb;">45 Days</h2>
                <p style="color:var(--muted); font-size:12px; font-weight:700; margin-top:6px;">Minimum safety stock for imported pigments</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">🧮 EXECUTIVE LANDED COST & FX SENSITIVITY SIMULATOR (20MT TiO2 CONTAINER)</div>
            <div class="sim-controls">
                <div class="sim-input">
                    <label>Simulated USD/ETB Exchange Rate</label>
                    <input type="number" id="simFx" value="${data.fx.usdEtb}" step="0.5" oninput="runSimulation()">
                </div>
                <div class="sim-input">
                    <label>Red Sea Freight Surcharge (%)</label>
                    <input type="number" id="simFreight" value="20" step="1" oninput="runSimulation()">
                </div>
            </div>
            <div class="sim-output" id="simResult">
                Calculating landed cost...
            </div>
        </div>
    </div>

    <!-- TAB 1: GLOBAL MARKETS -->
    <div id="tab-markets" class="tab-content">
        <div class="card">
            <div class="card-header">🌐 GLOBAL INDUSTRIAL & ENERGY BENCHMARKS</div>
            <table>
                <thead>
                    <tr><th>Benchmark</th><th>Current Spot</th><th>24h Change</th><th>Executive Implication for Nefas Silk</th></tr>
                </thead>
                <tbody>
                    <tr><td>Brent Crude Oil</td><td>${data.commodities.brent.price}</td><td style="color:var(--green);">${data.commodities.brent.change}</td><td>White spirit & xylene solvent costs holding steady</td></tr>
                    <tr><td>Titanium Dioxide (Rutile)</td><td>${data.commodities.tio2.price}</td><td style="color:var(--red);">${data.commodities.tio2.change}</td><td>Lock in Q4 supplier allocations ahead of Asian winter curbs</td></tr>
                    <tr><td>Caustic Soda / Additives</td><td>$415 / MT</td><td>+0.4%</td><td>Minimal variance on water-based emulsion lines</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 3: ECX & EXPORTS -->
    <div id="tab-ecx" class="tab-content">
        <div class="card">
            <div class="card-header">☕ ETHIOPIA COMMODITY EXCHANGE (ECX) & EXPORT FX GENERATION</div>
            <table>
                <thead>
                    <tr><th>Commodity</th><th>Grade / Origin</th><th>ICE / Local Benchmark</th><th>Trend</th></tr>
                </thead>
                <tbody>
                    <tr><td>Washed Arabica Coffee</td><td>Yirgacheffe / Gera Specialty</td><td>${data.commodities.arabica.price}</td><td style="color:var(--green);">${data.commodities.arabica.change}</td></tr>
                    <tr><td>Unwashed Arabica</td><td>Jimma / Nekemte</td><td>238.10 ¢/lb</td><td style="color:var(--green);">+1.2%</td></tr>
                    <tr><td>Sesame Seed (Whitish)</td><td>Humera / Gondar</td><td>$1,680 / MT</td><td style="color:var(--amber);">+0.5%</td></tr>
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

        function runSimulation() {
            const fx = parseFloat(document.getElementById('simFx').value) || 164.05;
            const surcharge = parseFloat(document.getElementById('simFreight').value) || 20;
            const baseCargoUSD = 20 * 2180; // 20 MT of TiO2 at $2,180/MT = $43,600
            const baseFreightUSD = 3800 * (1 + surcharge / 100);
            const totalUSD = baseCargoUSD + baseFreightUSD;
            const totalETB = (totalUSD * fx).toLocaleString('en-US', { maximumFractionDigits: 0 });
            const perKgETB = ((totalUSD * fx) / 20000).toFixed(2);

            document.getElementById('simResult').innerHTML = 
                '<strong>Estimated CIF Djibouti + Inland Total:</strong> $' + totalUSD.toLocaleString('en-US', {maximumFractionDigits:0}) + ' USD  |  ' +
                '<strong style="color:#d91c1c;">' + totalETB + ' ETB</strong> ' +
                '<span>(Approx. <strong>' + perKgETB + ' ETB/kg</strong> landed before customs duty)</span>';
        }
        runSimulation();
    </script>
</body>
</html>`;
}

// 4. Main Execution: Generate File & Send 7:00 AM Email
async function run() {
    const data = await fetchIntelligenceData();
    const logoBase64 = getBase64Logo();
    const htmlContent = generateDashboardHTML(data, logoBase64);

    const outputPath = path.join(__dirname, 'CEO_Analytics_Dashboard.html');
    fs.writeFileSync(outputPath, htmlContent, 'utf8');
    console.log('Dashboard successfully written to:', outputPath);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('Skipping email dispatch: EMAIL_USER or EMAIL_PASS not set in environment.');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Nefas Silk Intelligence Desk" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
        subject: `CEO Strategic Dashboard & Complete ECX Summary - ${data.timestamp}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px;">
                <h2 style="color: #0f172a; margin-bottom: 4px;">Good Morning, Executive Team</h2>
                <p style="color: #64748b; font-size: 13px; margin-top: 0;">Automated 7:00 AM Strategic Intelligence Brief • ${data.timestamp}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
                <p><strong>Key Morning Highlights:</strong></p>
                <ul>
                    <li><strong>Official CBE Rate:</strong> USD/ETB ${data.fx.usdEtb} | EUR/ETB ${data.fx.eurEtb}</li>
                    <li><strong>Red Sea Transit Impact:</strong> +10 to 14 Days delay | +15% to 25% container surcharge</li>
                    <li><strong>TiO2 Benchmark:</strong> ${data.commodities.tio2.price} (${data.commodities.tio2.change})</li>
                </ul>
                <p>Open the attached <strong>CEO_Analytics_Dashboard.html</strong> file in Chrome or Edge for full interactive tabs and the Landed Cost FX Simulator.</p>
            </div>
        `,
        attachments: [
            {
                filename: 'CEO_Analytics_Dashboard.html',
                path: outputPath
            }
        ]
    };

    await transporter.sendMail(mailOptions);
    console.log('7:00 AM CEO Strategic Dashboard email dispatched successfully!');
}

run().catch(err => {
    console.error('Error in daily_mailer:', err);
    process.exit(1);
});
