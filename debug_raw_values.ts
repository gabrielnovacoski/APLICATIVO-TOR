
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

// EXACT implementation from sheetsService.ts
function parseSheetNumber(value: string | undefined): number {
    if (!value) return 0;
    // Remove tudo que não for dígito, sinal de menos ou vírgula
    const clean = value.replace(/[^0-9,-]/g, '');
    // Substitui vírgula por ponto para o JS entender
    const normalized = clean.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
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

    if (DINHEIRO_COL_IDX === -1) {
        console.error("Column DINHEIRO - R$ not found!");
        return;
    }

    let total = 0;
    console.log(`Analyzing values for 2021 (Column Index: ${DINHEIRO_COL_IDX})...`);

    rows.slice(1).forEach((row, idx) => {
        if (row.length <= 1) return;
        const dateStr = row[0];
        const date = parseGoogleDate(dateStr);

        if (date && date.getFullYear() === 2021) {
            const rawVal = row[DINHEIRO_COL_IDX];
            const parsedVal = parseSheetNumber(rawVal);

            if (parsedVal !== 0 || (rawVal && rawVal.length > 0)) {
                console.log(`Row ${idx + 2} [${dateStr}]: Raw="${rawVal}" => Parsed=${parsedVal}`);
            }
            total += parsedVal;
        }
    });

    console.log(`Total 2021: ${total}`);
}

debug();
