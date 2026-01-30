
import React, { useState, useEffect } from 'react';
import { fetchSpreadsheetReports, DailyReport } from '../services/sheetsService';

const ReportsView: React.FC<{ startDate: Date; endDate: Date }> = ({ startDate, endDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const data = await fetchSpreadsheetReports(startDate, endDate);
      setReports(data);
      setLoading(false);
    };
    loadReports();
  }, [startDate, endDate]);

  const filteredReports = reports.filter(r =>
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vtr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estatísticas Dinâmicas
  const totalReports = reports.length;
  const totalApps = reports.reduce((acc, r) => acc + r.totalSeizures, 0);
  const avgDrugs = reports.length > 0 ? (reports.reduce((acc, r) => acc + r.totalDrugs, 0) / reports.length).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="size-12 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Relatórios Oficiais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Total de Relatórios Diários</p>
            <div className="p-2 bg-sky-50 rounded-lg">
              <span className="material-symbols-outlined text-tor-blue filled-icon text-lg">description</span>
            </div>
          </div>
          <p className="text-slate-900 text-3xl font-black mt-2">{totalReports}</p>
          <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase">No período selecionado</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Média de Drogas / Dia</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <span className="material-symbols-outlined text-emerald-500 text-lg">analytics</span>
            </div>
          </div>
          <p className="text-slate-900 text-3xl font-black mt-2">{avgDrugs}g/unid</p>
          <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase">Volume médio por equipe</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Total Apreensões Gerais</p>
            <div className="p-2 bg-orange-50 rounded-lg">
              <span className="material-symbols-outlined text-orange-500 text-lg">inventory_2</span>
            </div>
          </div>
          <p className="text-slate-900 text-3xl font-black mt-2">{totalApps}</p>
          <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase">Items apreendidos no total</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center bg-white gap-4">
          <div>
            <h3 className="text-slate-900 text-lg font-black uppercase tracking-tight">Histórico de Produção Diária</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Cada linha representa 1 carimbo da planilha</p>
          </div>
          <div className="relative w-full sm:w-80">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue transition-all"
              placeholder="Buscar por equipe, VTR ou ID..."
              type="text"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificador</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Carimbo Data/Hora</th>

                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">VTR / KM</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length > 0 ? filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-tor-blue uppercase bg-tor-blue/5 px-2 py-1 rounded-md">{report.id}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-900 font-bold">{report.timestamp}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs text-slate-600 font-medium">
                      <span className="font-bold text-slate-800">{report.vtr}</span>
                      <span className="text-[10px]">{report.km} KM Final</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {report.totalDrugs > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[9px] font-black uppercase">Drogas: {report.totalDrugs}</span>}
                      {report.totalSeizures > 0 && <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-[9px] font-black uppercase">Apreensões: {report.totalSeizures}</span>}
                      {report.totalDrugs === 0 && report.totalSeizures === 0 && <span className="text-slate-300 text-[9px] font-bold uppercase">Apenas Fiscalização</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-tor-blue hover:text-white rounded-lg text-slate-400 transition-all">
                      <span className="material-symbols-outlined text-lg">download</span>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-400 font-bold uppercase text-xs">Nenhum registro encontrado para este período ou busca.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;

