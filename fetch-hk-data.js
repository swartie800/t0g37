/**
 * Run this script locally to fetch HK data and save to data/hk-data.json
 * Usage: node fetch-hk-data.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Helper function to fetch URL content
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        protocol.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Parse HK Pools data from tabelsemalam.com
async function fetchHKPoolsData() {
    console.log('Fetching HK Pools data from tabelsemalam.com...');

    try {
        const html = await fetchUrl('https://tabelsemalam.com/');

        const data = [];

        // Find table inside div#all
        const allDivMatch = html.match(/<div[^>]*id=["']all["'][^>]*>([\s\S]*?)<\/div>/i);
        if (!allDivMatch) {
            console.log('Could not find div#all');
            return data;
        }

        const tableContent = allDivMatch[1];

        // Find all rows in tbody
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
            const row = rowMatch[1];

            // Extract td cells
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells = [];
            let cellMatch;

            while ((cellMatch = cellRegex.exec(row)) !== null) {
                // Strip HTML tags and trim
                const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
                cells.push(text);
            }

            if (cells.length >= 2 && cells[0] && cells[1]) {
                data.push({
                    tanggal: cells[0],
                    hasil: cells[1]
                });
            }
        }

        console.log(`Found ${data.length} HK Pools entries`);
        return data;

    } catch (error) {
        console.error('Error fetching HK Pools:', error.message);
        return [];
    }
}

// Parse HK Lotto data from masterlive.net
async function fetchHKLottoData() {
    console.log('Fetching HK Lotto data from masterlive.net...');

    try {
        const html = await fetchUrl('https://masterlive.net/pengeluaran-hk-tercepat.php');

        const data = [];

        // Find table with class TableKeluaran
        const tableMatch = html.match(/<table[^>]*class=["'][^"']*TableKeluaran[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
        if (!tableMatch) {
            console.log('Could not find table.TableKeluaran');
            return data;
        }

        const tableContent = tableMatch[1];

        // Find all rows
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
            const row = rowMatch[1];

            // Skip banner rows
            if (row.includes('Keluaran_Banner_Body') || row.includes('colspan="4"')) {
                continue;
            }

            // Extract td cells
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells = [];
            let cellMatch;

            while ((cellMatch = cellRegex.exec(row)) !== null) {
                const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
                cells.push(text);
            }

            // Keep 2nd (TANGGAL) and 4th (NOMOR/HASIL) columns
            if (cells.length >= 4 && cells[1] && cells[3]) {
                data.push({
                    tanggal: cells[1],
                    hasil: cells[3]
                });
            }
        }

        console.log(`Found ${data.length} HK Lotto entries`);
        return data;

    } catch (error) {
        console.error('Error fetching HK Lotto:', error.message);
        return [];
    }
}

// Main function
async function main() {
    console.log('='.repeat(50));
    console.log('HK Data Fetcher');
    console.log('='.repeat(50));

    const hkPools = await fetchHKPoolsData();
    const hkLotto = await fetchHKLottoData();

    const data = {
        lastUpdated: new Date().toISOString(),
        hkPools: hkPools,
        hkLotto: hkLotto
    };

    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to file
    const outputPath = path.join(dataDir, 'hk-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log('='.repeat(50));
    console.log(`Data saved to: ${outputPath}`);
    console.log(`Last updated: ${data.lastUpdated}`);
    console.log(`HK Pools entries: ${hkPools.length}`);
    console.log(`HK Lotto entries: ${hkLotto.length}`);
    console.log('='.repeat(50));
    console.log('\nNow run these commands to push to GitHub:');
    console.log('  git add data/hk-data.json');
    console.log('  git commit -m "Update HK data"');
    console.log('  git push origin main');
}

main().catch(console.error);
