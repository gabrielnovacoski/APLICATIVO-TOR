
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

// Current parser logic
// NEW parser logic matching sheetsService.ts
function parseSheetNumber(value: string | undefined): number {
    if (!value) return 0;

    // 1. Remove tudo que NÃO for dígito, ponto, vírgula ou sinal de menos
    const clean = value.replace(/[^0-9,.-]/g, '');

    if (clean === '') return 0;

    // 2. Detecção de formato baseada na presença de vírgula (comum em R$)
    if (clean.includes(',')) {
        // Formato BR (1.000,00): Remove pontos (milhar) e troca vírgula por ponto (decimal)
        const normalized = clean.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    } else {
        // Formato US ou sem separador de milhar (528.00 ou 528)
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
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

    // Find Merchandise Column
    const MERC_COL_IDX = header.findIndex(h => h.includes('MERCADORIAS ILEGAIS'));
    console.log(`Column 'MERCADORIAS ILEGAIS' found at index: ${MERC_COL_IDX}`);

    if (MERC_COL_IDX === -1) {
        console.log("trying falback index 36");
    }
    const TARGET_COL = MERC_COL_IDX !== -1 ? MERC_COL_IDX : 36;

    let total = 0;
    let count = 0;

    console.log('--- Mercadorias Rows for 2021 ---');
    rows.slice(1).forEach((row, idx) => {
        if (row.length <= 1) return;
        const dateStr = row[0];
        const date = parseGoogleDate(dateStr);

        if (date && date.getFullYear() === 2021) {
            const rawVal = row[TARGET_COL];
            const val = parseSheetNumber(rawVal);

            if (val > 0) {
                console.log(`Row ${idx + 2}: ${dateStr} | Raw="${rawVal}" => Parsed=${val}`);
                total += val;
                count++;
            }
        }
    });

    console.log('--- Summary 2021 ---');
    console.log(`Total Records: ${count}`);
    console.log(`Total Value: R$ ${total.toLocaleString('pt-BR')}`);
}

debug();
