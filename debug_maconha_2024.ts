
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

// EXACT LOGIC FROM sheetsService.ts (Modified for Fix)
function parseSheetNumber(value: string | undefined): number {
    if (!value) return 0;

    const textToCheck = value.replace(/(R\$|KM|\s)/gi, '');
    if (/[a-zA-Z]/.test(textToCheck)) return 0;

    const clean = value.replace(/[^0-9,.-]/g, '');
    if (clean === '') return 0;

    if (clean.includes(',')) {
        // BR Format: 1.000,00 -> 1000.00
        const normalized = clean.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    } else {
        // No comma. Check for dots.
        if (clean.includes('.')) {
            const parts = clean.split('.');
            // Check if the last part looks like thousands (3 digits)
            // e.g. "150.000" -> "000" (len 3) -> Assume Thousands -> Strip dots -> 150000
            // e.g. "1.5" -> "5" (len 1) -> Assume Decimal -> Keep dots -> 1.5
            if (parts[parts.length - 1].length === 3) {
                const normalized = clean.replace(/\./g, ''); // Strip dots
                return parseFloat(normalized);
            }
        }
        // Default US/Simple Float
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    }
}

function parseCSV(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    const text = csvText.replace(/\r\n/g, '\n');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
            currentCell = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentRow.length > 0 || currentCell.length > 0) {
        currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
        rows.push(currentRow);
    }
    return rows;
}

async function debug() {
    console.log("Fetching CSV...");
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const header = rows[0].map(h => h.toUpperCase().trim());

    let MAC_COL_IDX = header.findIndex(h => h === 'MACONHA (EM GRAMAS)');
    if (MAC_COL_IDX === -1) {
        MAC_COL_IDX = header.findIndex(h => h.includes('MACONHA'));
    }

    console.log(`Maconha Column Index: ${MAC_COL_IDX}`);
    const targetIdx = MAC_COL_IDX !== -1 ? MAC_COL_IDX : 20;

    let total = 0;

    console.log('--- Maconha 2024 (Refined Parsing) ---');

    rows.slice(1).forEach((row, idx) => {
        if (row.length <= 1) return;

        const dateStr = row[0];
        const date = parseGoogleDate(dateStr);

        if (date && date.getFullYear() === 2024) {
            const rawVal = row[targetIdx];
            const parsedVal = parseSheetNumber(rawVal);

            if (parsedVal > 0) {
                console.log(`Row ${idx + 2} [${dateStr}]: Raw="${rawVal}" => Parsed=${parsedVal}`);
                total += parsedVal;
            }
        }
    });

    console.log(`Total Maconha 2024: ${parsedTotal(total)} g`);
}

function parsedTotal(val: number) {
    return val.toLocaleString('pt-BR');
}

debug();
