
export enum ViewType {
  PRODUCTIVITY = 'productivity',
  REPORTS = 'reports',
  OPERATIONAL = 'operational',
  SETTINGS = 'settings'
}

export interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  colorClass: string;
  bgClass: string;
}

export interface Report {
  id: string;
  dateTime: string;
  type: 'Incidente' | 'Manutenção' | 'Operacional';
  team: string;
  location: string;
  status: 'Concluído' | 'Em Aberto' | 'Em Revisão';
}

export interface OperationalTeam {
  name: string;
  sector: string;
  status: 'Patrulhamento' | 'Ocorrência';
  members: { name: string; role: string; icon: string }[];
  color: string;
}
export interface PersonnelAbsence {
  id: string;
  personnel_id: string;
  type: string;
  start_date: string;
  end_date: string;
  description?: string;
  created_at: string;
  personnel?: {
    name: string;
    graduation: string;
  };
}
