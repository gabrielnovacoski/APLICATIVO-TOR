
import React, { useState, useEffect } from 'react';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { fetchSpreadsheetProductivity, SheetData } from '../services/sheetsService';
import { supabase } from '../lib/supabase';


interface Vehicle {
  id: string;
  odometer: number;
  oil_interval: number;
  last_oil_change_odometer: number;
}


const ProductivityView: React.FC<{ startDate: Date; endDate: Date; isLoggedIn: boolean }> = ({ startDate, endDate, isLoggedIn }) => {

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SheetData | null>(null);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<Vehicle[]>([]);

  const cpmrvCrestUrl = "/cpmrv-crest.png";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchSpreadsheetProductivity(startDate, endDate);
      if (result) setData(result);

      // Carregar alertas de viaturas do Supabase
      const { data: vData } = await supabase.from('vehicles').select('*');
      if (vData) {
        const critical = vData.filter(v => {
          const kmSinceChange = v.odometer - v.last_oil_change_odometer;
          const life = Math.max(0, 100 - (kmSinceChange / v.oil_interval) * 100);
          return life < 15; // Alerta se vida útil do óleo for menor que 15%
        });
        setMaintenanceAlerts(critical);
      }


      setLoading(false);
    };
    loadData();
  }, [startDate, endDate]);



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="size-16 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-slate-900 font-black uppercase tracking-widest">Sincronizando com Google Sheets</p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-tight mt-1">Aguarde a conexão com o banco de dados...</p>
        </div>
      </div>
    );
  }

  const currentData = data || {
    drugs: [],
    seizures: [],
    boletins: [],
    summary: { prisões: '0', mandados: '0', autos: '0', abordagens: '0' }
  };

  const totalBoletins = currentData.boletins.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section>
        <div className="flex flex-col mb-6 border-l-4 border-tor-accent pl-4">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Relatório de Produtividade</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
            Período: <span className="text-tor-blue">{startDate.toLocaleDateString()}</span> até <span className="text-tor-blue">{endDate.toLocaleDateString()}</span>
          </p>
        </div>

        {isLoggedIn && maintenanceAlerts.length > 0 && (
          <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-4 animate-bounce hover:animate-none transition-all">
            <div className="size-12 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-red-700 uppercase tracking-wider">Atenção Especial: Manutenção Necessária</p>
              <p className="text-xs text-red-600 font-bold">
                As viaturas <span className="underline">{maintenanceAlerts.map(v => v.id).join(', ')}</span> atingiram o limite crítico de vida útil do óleo.
              </p>
            </div>
            <span className="material-symbols-outlined text-red-300">chevron_right</span>
          </div>
        )}


        <div className="flex items-center justify-between mb-4 border-l-4 border-slate-200 pl-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Detalhamento de Drogas</h2>

          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Dados da Planilha
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentData.drugs.map((stat) => (
            <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-lg hover:border-tor-accent/20 group">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-tor-accent group-hover:bg-tor-accent group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-xl font-black text-slate-800">{stat.value}</p>
                </div>
              </div>
              {isLoggedIn && stat.trend !== undefined && (
                <div className={`flex flex-col items-end ${stat.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <span className="material-symbols-outlined text-sm">{stat.trend >= 0 ? 'north' : 'south'}</span>
                  <span className="text-[10px] font-black">{Math.abs(stat.trend)}%</span>
                </div>
              )}
            </div>

          ))}

        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4 border-l-4 border-tor-blue pl-3">
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Apreensões</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {currentData.seizures.map((stat) => (
            <div key={stat.label} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden text-center group transition-all hover:shadow-xl hover:-translate-y-1 relative">
              {isLoggedIn && stat.trend !== undefined && (
                <span className={`absolute top-4 right-4 text-[9px] font-black flex items-center gap-0.5 ${stat.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <span className="material-symbols-outlined text-[10px]">{stat.trend >= 0 ? 'north' : 'south'}</span>
                  {Math.abs(stat.trend)}%
                </span>
              )}

              <div className="py-10 flex flex-col items-center px-4">

                <div
                  className="size-20 rounded-full bg-sky-50 text-tor-blue flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-tor-blue group-hover:text-white transition-all duration-500 shadow-inner overflow-hidden"
                >
                  {stat.customIcon ? (
                    <img
                      src={stat.customIcon}
                      alt={stat.label}
                      className="size-10 object-contain transition-all duration-500 [filter:brightness(0)_saturate(100%)_invert(56%)_sepia(97%)_saturate(1012%)_hue-rotate(169deg)_brightness(96%)_contrast(101%)] group-hover:[filter:brightness(0)_invert(1)]"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-4xl">{stat.icon}</span>
                  )}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full">
                  {stat.label}
                </p>
                <p className="text-2xl font-black text-slate-800 tracking-tighter">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Estatísticas de Boletins</h2>
            <span className="material-symbols-outlined text-slate-300">analytics</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-10">
            <div className="size-52 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentData.boletins}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {currentData.boletins.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-slate-800">{totalBoletins}</span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Registros</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-3">

              {currentData.boletins.map((item) => (
                <div key={item.name} className="flex items-center gap-4 group">
                  <div className="size-4 rounded-full shadow-sm shrink-0" style={{ backgroundColor: item.color }}></div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-black text-slate-500 uppercase tracking-[0.15em]">
                      {item.name === 'BO' ? 'BO / ACIDENTES' : item.name}
                    </span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{item.value}</span>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:bg-slate-50/80 group">
            <div className="size-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">front_hand</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pessoas Detidas</p>
            <p className="text-4xl font-black text-slate-900">{currentData.summary.pessoasDetidas}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:bg-slate-50/80 group">
            <div className="size-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">gavel</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mandados Judiciais</p>
            <p className="text-4xl font-black text-slate-900">{currentData.summary.mandados}</p>
          </div>
        </div>

      </div>






      <footer className="bg-tor-dark text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/10">

        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-tor-blue/20 to-transparent skew-x-12 translate-x-40"></div>



        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-6 relative z-10 w-full">
          {[
            { label: 'Autos de Infr.', value: currentData.summary.autos },
            { label: 'ARVC', value: currentData.summary.arvc },
            { label: 'Recusa IGP', value: currentData.summary.recusaIgp },
            { label: 'Ret. CNH/CLA', value: currentData.summary.retencoes },
            { label: 'Abordagens Pess.', value: currentData.summary.abordagens },
            { label: 'Abordagens Veic.', value: currentData.summary.abordagensVeic },
          ].map((item) => (

            <div key={item.label} className="text-center">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.15em] mb-1.5 opacity-90">{item.label}</p>
              <p className="text-2xl font-black text-white">{item.value}</p>
            </div>

          ))}
        </div>




        {/* Resumo Final */}
        <section className="mt-12 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tor-blue/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-tor-blue">summarize</span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Resumo Operacional</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              No período compreendido entre <span className="font-bold text-slate-900">{startDate.toLocaleDateString()}</span> e <span className="font-bold text-slate-900">{endDate.toLocaleDateString()}</span>,
              o efetivo do Tático Ostensivo Rodoviário (TOR) realizou a abordagem de <span className="font-bold text-slate-800">{currentData.summary.abordagens}</span> pessoas
              e <span className="font-bold text-slate-800">{currentData.summary.abordagensVeic}</span> veículos.
              Como resultado das ações de fiscalização e combate ao crime, foram lavrados <span className="font-bold text-slate-800">{currentData.summary.autos}</span> autos de infração
              e efetuadas <span className="font-bold text-slate-800">{currentData.summary.prisoes}</span> prisões em flagrante/detenções,
              além do cumprimento de <span className="font-bold text-slate-800">{currentData.summary.mandados}</span> mandados judiciais.
              A produtividade reflete o compromisso contínuo com a segurança viária e o combate ao crime organizado nas rodovias estaduais.
            </p>
          </div>
        </section>

      </footer>
    </div>

  );
};

export default ProductivityView;
