
/**
 * Serviço de Integração com Google Sheets para o Dashboard TOR
 * Utiliza a exportação CSV para evitar necessidade de chaves de API complexas
 */


const CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vR9zW7vYbeCkhZ1AjDL8vNyM6Usfr-OpHak6EbODijojb_S7JxJTHMYT7DaSJiXRcQ-AsCff48QEVX-/pub?output=csv`;




export interface SheetData {
  drugs: { label: string; value: string; icon: string; trend?: number }[];
  seizures: { label: string; value: string; icon: string; customIcon?: string; trend?: number }[];
  boletins: { name: string; value: number; color: string }[];
  summary: {
    prisões: string;
    mandados: string;
    autos: string;
    abordagens: string;
    abordagensVeic: string;
    pessoasDetidas: string;
    acidentes: string;
    arvc: string;
    retencoes: string;
    recusaIgp: string;
    multaAdm: string;
    moedaEstrangeira: string;
    trends?: Record<string, number>;
  };
  timeline: { month: string; value: number }[];
}


export interface DailyReport {
  id: string;
  timestamp: string;
  team: string;
  vtr: string;
  km: string;
  totalDrugs: number;
  totalSeizures: number;
  status: 'Concluído';
}



/**
 * Converte string de data do Google (DD/MM/YYYY HH:MM:SS ou similar) para objeto Date
 * Garante que a comparação ignore a hora para o filtro de dias
 */
function parseGoogleDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    // O Google Sheets costuma mandar "DD/MM/YYYY HH:MM:SS" ou apenas "DD/MM/YYYY"
    const [datePart] = dateStr.trim().split(' ');
    const parts = datePart.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    // Criar data ao meio-dia para evitar problemas de fuso horário na comparação
    return new Date(year, month - 1, day, 12, 0, 0);
  } catch (e) {
    return null;
  }
}


/**
 * Helper para limpar e converter valores numéricos da planilha
 * Remove R$, pontos de milhar, e converte vírgula decimal
 */
function parseSheetNumber(value: string | undefined): number {
  if (!value) return 0;

  // 1. Remove tudo que NÃO for dígito, ponto, vírgula ou sinal de menos
  const clean = value.replace(/[^0-9,.-]/g, '');

  if (clean === '') return 0;

  // 2. Detecção de formato baseada na presença de vírgula (comum em R$)
  if (clean.includes(',')) {
    // Formato BR (1.000,00): Remove pontos (milhar) e troca vírgula por ponto (decimal)
    // Ex: "10.000,00" -> "10000,00" -> "10000.00"
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  } else {
    // Formato US ou sem separador de milhar (528.00 ou 528)
    // Mantém o ponto como decimal se existir
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

export async function fetchSpreadsheetProductivity(startDate?: Date, endDate?: Date): Promise<SheetData | null> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error('Falha ao buscar dados da planilha');

    const csvText = await response.text();
    const rows = parseCSV(csvText);


    const header = rows[0].map(h => h.toUpperCase().trim());

    // Helper para buscar índice por texto no cabeçalho
    const findCol = (name: string, fallback: number) => {
      const idx = header.findIndex(h => h.includes(name.toUpperCase()));
      return idx === -1 ? fallback : idx;
    };

    // Mapeamento Dinâmico de Colunas
    const COL = {
      TIMESTAMP: 0,
      PA: findCol('PA', 8),
      TC: findCol('TC', 9),
      COP: findCol('COP', 10),
      BO: findCol('BO E ACIDENTES', 11),
      ACIDENTES: findCol('BO E ACIDENTES', 11),
      AUTOS: findCol('AUTOS DE INFRAÇÕES', 12),
      ARVC: findCol('ARVC', 13),
      RETENCOES: findCol('RETENÇÕES DE CLA', 14),
      RECUSA_IGP: findCol('RECUSA IGP', 15),
      VEIC_ABORDADOS: findCol('VEÍCULOS ABORDADOS', 16),
      PESS_ABORDADAS: findCol('PESSOAS ABORDADOS', 17),
      MANDADOS: findCol('CUMPRIMENTOS DE MANDADOS', 18),
      PESS_DETIDAS: findCol('PESSOAS DETIDAS', 19),
      MACONHA: findCol('MACONHA', 20),
      HAXIXE: findCol('HAXIXE', 21),
      SKANK: findCol('SKANK', 22),
      COCAINA: findCol('COCAÍNA', 23),
      ECSTASY: findCol('ECSTASY', 24),
      LSD: findCol('LSD', 25),
      MDMA: findCol('MDMA', 26),
      CRACK: findCol('CRACK', 27),
      OUTRAS_DROGAS: findCol('OUTRAS DROGAS', 28),
      ARMAS: findCol('ARMAS', 30),
      MUNICOES: findCol('MUNIÇÕES', 31),
      VEIC_RECUP: findCol('VEÍCULOS RECUPERADOS', 32),
      DINHEIRO: findCol('DINHEIRO - R$', 33),
      MOEDA_ESTRANG: findCol('MOEDA ESTRANGEIRA', 34),
      MERC_ILEGAIS: findCol('MERCADORIAS ILEGAIS', 36),
      CIGARROS: findCol('CIGARROS', 37),
      MULTA_ADM: findCol('MULTA ADMINISTRATIVA', 39)
    };

    const dataRows = rows.slice(1).filter(r => r.length > 1 && r[0] !== '');






    // Datas para comparação (Ano Anterior)
    const prevStartDate = startDate ? new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate()) : null;
    const prevEndDate = endDate ? new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate()) : null;

    // Filtragem por data (Período Atual)
    const filteredRows = dataRows.filter((row) => {
      const rowDate = parseGoogleDate(row[COL.TIMESTAMP]);
      if (!rowDate) return false;
      const rowTimestamp = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate()).getTime();
      const startTimestamp = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() : null;
      const endTimestamp = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() : null;
      if (startTimestamp && rowTimestamp < startTimestamp) return false;
      if (endTimestamp && rowTimestamp > endTimestamp) return false;
      return true;
    });

    // Filtragem por data (Ano Anterior)
    const prevRows = dataRows.filter((row) => {
      const rowDate = parseGoogleDate(row[COL.TIMESTAMP]);
      if (!rowDate) return false;
      const rowTimestamp = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate()).getTime();
      const startTimestamp = prevStartDate ? new Date(prevStartDate.getFullYear(), prevStartDate.getMonth(), prevStartDate.getDate()).getTime() : null;
      const endTimestamp = prevEndDate ? new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), prevEndDate.getDate()).getTime() : null;
      if (startTimestamp && rowTimestamp < startTimestamp) return false;
      if (endTimestamp && rowTimestamp > endTimestamp) return false;
      return true;
    });

    // Função para somar valores de uma coluna em um conjunto de linhas
    const sumColsInRange = (rows: string[][], index: number) => {
      return rows.reduce((acc, row) => {
        return acc + parseSheetNumber(row[index]);
      }, 0);
    };

    // Cálculo de Timeline (Agrupado por Mês)
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const timelineMap: Record<string, number> = {};

    filteredRows.forEach(row => {
      const date = parseGoogleDate(row[COL.TIMESTAMP]);
      if (date) {
        const key = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
        // Somamos Boletins como métrica de volume na timeline
        const volume = [COL.PA, COL.TC, COL.COP, COL.BO].reduce((acc, c) => {
          return acc + parseSheetNumber(row[c]);
        }, 0);
        timelineMap[key] = (timelineMap[key] || 0) + volume;
      }
    });

    const timeline = Object.entries(timelineMap).map(([month, value]) => ({ month, value }));

    // Função para calcular tendência (Trend %)
    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const getFormattedAndTrend = (index: number) => {
      const current = sumColsInRange(filteredRows, index);
      const prev = sumColsInRange(prevRows, index);
      return {
        value: current >= 1000 ? current.toLocaleString('pt-BR') : current.toString(),
        trend: calcTrend(current, prev)
      };
    };

    const maconhas = getFormattedAndTrend(COL.MACONHA);
    const skanks = getFormattedAndTrend(COL.SKANK);
    const haxixe = getFormattedAndTrend(COL.HAXIXE);
    const cocaina = getFormattedAndTrend(COL.COCAINA);
    const lsd = getFormattedAndTrend(COL.LSD);
    const crack = getFormattedAndTrend(COL.CRACK);
    const ecstasy = getFormattedAndTrend(COL.ECSTASY);

    const armas = getFormattedAndTrend(COL.ARMAS);
    const municoes = getFormattedAndTrend(COL.MUNICOES);
    const veicRecup = getFormattedAndTrend(COL.VEIC_RECUP);
    const dinheiro = getFormattedAndTrend(COL.DINHEIRO);
    const mercadorias = getFormattedAndTrend(COL.MERC_ILEGAIS);
    const cigarros = getFormattedAndTrend(COL.CIGARROS);

    const result: SheetData = {
      drugs: [
        { label: 'Maconha - G', value: maconhas.value, icon: 'psychiatry', trend: maconhas.trend },
        { label: 'Skank - G', value: skanks.value, icon: 'spa', trend: skanks.trend },
        { label: 'Haxixe - G', value: haxixe.value, icon: 'grain', trend: haxixe.trend },
        { label: 'Cocaína - G', value: cocaina.value, icon: 'science', trend: cocaina.trend },
        { label: 'LSD - Unid.', value: lsd.value, icon: 'mood', trend: lsd.trend },
        { label: 'Crack - G', value: crack.value, icon: 'layers', trend: crack.trend },
        { label: 'Ecstasy - Unid.', value: ecstasy.value, icon: 'pill', trend: ecstasy.trend },
      ],
      seizures: [
        { label: 'Armas', value: armas.value, icon: 'swords', customIcon: '/armas-icon.png', trend: armas.trend },
        { label: 'Munições', value: municoes.value, icon: 'target', customIcon: '/municoes-icon.png', trend: municoes.trend },
        { label: 'Veículos Recup.', value: veicRecup.value, icon: 'local_shipping', trend: veicRecup.trend },
        { label: 'Dinheiro (R$)', value: dinheiro.value, icon: 'payments', trend: dinheiro.trend },
        { label: 'Mercadorias (R$)', value: mercadorias.value, icon: 'inventory_2', trend: mercadorias.trend },
        { label: 'Cigarros (Maços)', value: cigarros.value, icon: 'smoking_rooms', trend: cigarros.trend },
      ],
      boletins: [
        { name: 'PA', value: sumColsInRange(filteredRows, COL.PA), color: '#f59e0b' },
        { name: 'TC', value: sumColsInRange(filteredRows, COL.TC), color: '#ef4444' },
        { name: 'COP', value: sumColsInRange(filteredRows, COL.COP), color: '#8b5cf6' },
        { name: 'BO', value: sumColsInRange(filteredRows, COL.BO), color: '#10b981' },
      ],
      summary: {
        prisões: getFormattedAndTrend(COL.PESS_DETIDAS).value,
        mandados: getFormattedAndTrend(COL.MANDADOS).value,
        autos: getFormattedAndTrend(COL.AUTOS).value,
        abordagens: getFormattedAndTrend(COL.PESS_ABORDADAS).value,
        abordagensVeic: getFormattedAndTrend(COL.VEIC_ABORDADOS).value,
        pessoasDetidas: getFormattedAndTrend(COL.PESS_DETIDAS).value,
        acidentes: getFormattedAndTrend(COL.ACIDENTES).value,
        arvc: getFormattedAndTrend(COL.ARVC).value,
        retencoes: getFormattedAndTrend(COL.RETENCOES).value,
        recusaIgp: getFormattedAndTrend(COL.RECUSA_IGP).value,
        multaAdm: getFormattedAndTrend(COL.MULTA_ADM).value,
        moedaEstrangeira: getFormattedAndTrend(COL.MOEDA_ESTRANG).value,
        trends: {
          prisoes: getFormattedAndTrend(COL.PESS_DETIDAS).trend,
          abordagens: getFormattedAndTrend(COL.PESS_ABORDADAS).trend,
          veic: getFormattedAndTrend(COL.VEIC_RECUP).trend
        }
      },
      timeline: timeline.sort((a, b) => {
        const [mA, yA] = a.month.split('/');
        const [mB, yB] = b.month.split('/');
        if (yA !== yB) return parseInt(yA) - parseInt(yB);
        return months.indexOf(mA) - months.indexOf(mB);
      })
    };

    return result;

  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    return null;
  }
}



export async function fetchSpreadsheetReports(startDate?: Date, endDate?: Date): Promise<DailyReport[]> {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    const rows = parseCSV(csvText);


    const dataRows = rows.slice(1).filter(r => r.length > 1 && r[0] !== '');
    const header = rows[0].map(h => h.toUpperCase().trim());
    const findCol = (name: string, fallback: number) => {
      const idx = header.findIndex(h => h.includes(name.toUpperCase()));
      return idx === -1 ? fallback : idx;
    };

    const COL = {
      MACONHA: findCol('MACONHA', 20),
      HAXIXE: findCol('HAXIXE', 21),
      SKANK: findCol('SKANK', 22),
      COCAINA: findCol('COCAÍNA', 23),
      ECSTASY: findCol('ECSTASY', 24),
      LSD: findCol('LSD', 25),
      MDMA: findCol('MDMA', 26),
      CRACK: findCol('CRACK', 27),
      OUTRAS_DROGAS: findCol('OUTRAS DROGAS', 28),
      ARMAS: findCol('ARMAS', 30),
      MUNICOES: findCol('MUNIÇÕES', 31),
      VEIC_RECUP: findCol('VEÍCULOS RECUPERADOS', 32),
      DINHEIRO: findCol('DINHEIRO - R$', 33),
      MOEDA_ESTRANG: findCol('MOEDA ESTRANGEIRA', 34),
      MERC_ILEGAIS: findCol('MERCADORIAS ILEGAIS', 36),
      CIGARROS: findCol('CIGARROS', 37),
      MULTA_ADM: findCol('MULTA ADMINISTRATIVA', 39)
    };

    // Mapeamento simplificado para a lista de relatórios
    const reports: DailyReport[] = dataRows.map((row, idx) => {
      const rowDate = parseGoogleDate(row[0]);

      // Filtro de data
      if (rowDate) {
        const d = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate()).getTime();
        const start = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() : null;
        const end = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() : null;

        if (start && d < start) return null;
        if (end && d > end) return null;
      }

      // Soma básica de apreensões para dar um "score" ao relatório
      const drugsSum = [
        COL.MACONHA, COL.HAXIXE, COL.SKANK, COL.COCAINA,
        COL.ECSTASY, COL.LSD, COL.MDMA, COL.CRACK, COL.OUTRAS_DROGAS
      ].reduce((acc, col) => acc + parseSheetNumber(row[col]), 0);

      const seizuresSum = [
        COL.ARMAS, COL.MUNICOES, COL.VEIC_RECUP, COL.DINHEIRO,
        COL.MOEDA_ESTRANG, COL.MERC_ILEGAIS, COL.CIGARROS, COL.MULTA_ADM
      ].reduce((acc, col) => acc + parseSheetNumber(row[col]), 0);

      return {
        id: `TOR-${row[0].split(' ')[0].replace(/\//g, '')}-${idx}`,
        timestamp: row[0],
        team: row[1] || 'Equipe TOR',
        vtr: row[2] || 'VTR',
        km: row[3] || '0',
        totalDrugs: parseFloat(drugsSum.toFixed(1)),
        totalSeizures: seizuresSum,
        status: 'Concluído'
      };
    }).filter(r => r !== null) as DailyReport[];

    return reports.reverse(); // Mais recentes primeiro
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    return [];
  }
}


export async function fetchLatestVehicleKm(vehicleId: string): Promise<number | null> {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) return null;

    const header = rows[0].map(h => h.toUpperCase().trim());

    // Buscar índices dinamicamente pelo nome da coluna que o usuário informou
    let vtrCol = header.findIndex(h => h.includes('VTR UTILIZADA') || h.includes('VTR'));
    let kmCol = header.findIndex(h => h.includes('KM FINAL') || h.includes('QUILOMETRAGEM FINAL'));

    // Fallback para índices manuais 2 e 3 se não encontrar pelo nome exato
    if (vtrCol === -1) vtrCol = 2;
    if (kmCol === -1) kmCol = 3;

    // Percorrer de trás para frente para pegar o registro mais recente inserido
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      if (row.length <= Math.max(vtrCol, kmCol)) continue;

      const vtrEntry = row[vtrCol];
      // Verifica se a célula da vtr contém o ID (ex: "TOR 0003")
      if (vtrEntry && vtrEntry.toLowerCase().includes(vehicleId.toLowerCase())) {
        const rawKm = row[kmCol];
        const kmValue = parseSheetNumber(rawKm);
        if (kmValue > 0) return kmValue;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar KM da vtr:', error);
    return null;
  }
}


