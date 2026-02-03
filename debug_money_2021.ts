
import fetch from 'node-fetch';

const CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vR9zW7vYbeCkhZ1AjDL8vNyM6Usfr-OpHak6EbODijojb_S7JxJTHMYT7DaSJiXRcQ-AsCff48QEVX-/pub?output=csv`;

function parseGoogleDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
        const [datePart] = dateStr.trim().split(' ');
        const parts = datePart.split('/');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
        return new Date(year, month - 1, day, 12, 0, 0);
    } catch (e) {
        return null;
    }
}

function parseCSV(csvText: string): string[][] {
    return csvText.split('\n').map(row => {
        const columns = [];
        let current = '';
        let inQuotes = false;
        for (let char of row) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                columns.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        columns.push(current.trim().replace(/^"|"$/g, ''));
        return columns;
    });
}

async function debug() {
    console.log("Fetching CSV...");
    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    const rows = parseCSV(csvText);
    const header = rows[0].map(h => h.toUpperCase().trim());
    const DINHEIRO_COL_IDX = header.findIndex(h => h.includes('DINHEIRO - R$'));

    let totalOldLogic = 0;
    let totalNewLogic = 0;

    rows.slice(1).forEach((row, idx) => {
        if (row.length <= 1) return;
        const dateStr = row[0];
        const date = parseGoogleDate(dateStr);

        if (date && date.getFullYear() === 2021) {
            const rawVal = row[DINHEIRO_COL_IDX];

            // OLD LOGIC
            const cleanValOld = rawVal?.replace(/\./g, '').replace(',', '.') || '0';
            const valOld = parseFloat(cleanValOld);

            // NEW LOGIC PROPOSED
            // Remove everything that is NOT a digit, a comma, or a minus sign.
            // Then replace comma with dot.
            // Handle "R$ 1.500,00" -> "1500,00" -> "1500.00"
            // Handle "1.500,00" -> "1500,00" -> "1500.00"
            const cleanValNew = rawVal?.replace(/[^0-9,-]/g, '').replace(',', '.') || '0';
            const valNew = parseFloat(cleanValNew);

            if (!isNaN(valOld) && valOld > 0) {
                console.log(`[OLD HIT] Row ${idx + 2}: Raw="${rawVal}" => Parsed=${valOld}`);
                totalOldLogic += valOld;
            }

            if (!isNaN(valNew) && valNew > 0) {
                // console.log(`[NEW HIT] Row ${idx+2}: Raw="${rawVal}" => Parsed=${valNew}`);
                totalNewLogic += valNew;
            }
        }
    });

    console.log("--- Summary 2021 ---");
    console.log(`Total (Current Code): ${totalOldLogic}`);
    console.log(`Total (Proposed Fix): ${totalNewLogic}`);
}

debug();
