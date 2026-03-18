import { useMemo, useState } from 'react';
import { Search, MoreHorizontal, Phone, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isDemoMode } from '@/lib/demoMode';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type UIStage =
  | 'novo'
  | 'qualificando'
  | 'proposta'
  | 'follow-up'
  | 'ganhou'
  | 'perdido';

type LeadUI = {
  id: string;
  name: string;
  phone: string;
  stage: UIStage;
  source?: string | null;
  score?: number | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  responsible?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const stageColors: Record<UIStage, string> = {
  novo: 'bg-info/10 text-info border-info/30',
  qualificando: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  proposta: 'bg-warning/10 text-warning border-warning/30',
  'follow-up': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  ganhou: 'bg-success/10 text-success border-success/30',
  perdido: 'bg-destructive/10 text-destructive border-destructive/30',
};

const stageLabels: Record<UIStage, string> = {
  novo: 'Novo',
  qualificando: 'Qualificando',
  proposta: 'Proposta',
  'follow-up': 'Follow-up',
  ganhou: 'Ganhou',
  perdido: 'Perdido',
};

function statusToStage(statusRaw: any): UIStage {
  const s = String(statusRaw || '').trim().toLowerCase();
  if (s === 'novo') return 'novo';
  if (s === 'qualificando' || s === 'qualificado' || s === 'em atendimento') return 'qualificando';
  if (s === 'proposta') return 'proposta';
  if (s === 'follow-up' || s === 'follow up' || s === 'followup' || s === 'agendado') return 'follow-up';
  if (s === 'fechado' || s === 'ganhou' || s === 'convertido' || s === 'vendido') return 'ganhou';
  if (s === 'perdido') return 'perdido';
  return 'novo';
}

export default function Leads() {
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const { data: rawLeads = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leads', currentWorkspace?.id],
    queryFn: async () => {
      if (isDemoMode) return [];
      const r = await api.leads();
      if (!r.ok) throw new Error(r.error);
      return r.data ?? [];
    },
    enabled: Boolean(currentWorkspace?.id),
    staleTime: 10_000,
    retry: 1,
  });

  const allLeads: LeadUI[] = useMemo(() => {
    return (rawLeads as any[]).map((l) => ({
      id: String(l?.id),
      name: String(l?.name || '').trim() || 'Sem nome',
      phone: String(l?.phone || '').trim() || '-',
      stage: statusToStage(l?.status ?? l?.stage ?? 'Novo'),
      status: String(l?.status || ''),
      created_at: l?.created_at ?? null,
      source: l?.source ?? null,
      score: l?.score ?? null,
      lastMessage: l?.last_message ?? l?.lastMessage ?? null,
      lastMessageAt: l?.last_message_at ?? l?.lastMessageAt ?? null,
      responsible: l?.responsible ?? null,
    }));
  }, [rawLeads]);

  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(lead.phone || '').includes(searchQuery);
      const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [allLeads, searchQuery, stageFilter]);

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((l) => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      ) as any,
      className: 'w-12',
      render: (item: LeadUI) => (
        <Checkbox
          checked={selectedLeads.includes(item.id)}
          onCheckedChange={() => toggleSelect(item.id)}
        />
      ),
    },
    {
      key: 'name',
      header: 'Lead',
      render: (item: LeadUI) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {item.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {item.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Estágio',
      render: (item: LeadUI) => (
        <Badge variant="outline" className={cn('border', stageColors[item.stage])}>
          {stageLabels[item.stage]}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Origem',
      render: (item: LeadUI) => (
        <span className="text-muted-foreground text-sm">{item.source || '-'}</span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (item: LeadUI) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                (item.score ?? 0) >= 80 ? 'bg-success' : (item.score ?? 0) >= 50 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${Math.max(0, Math.min(100, Number(item.score ?? 0)))}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground">{Number(item.score ?? 0)}</span>
        </div>
      ),
    },
    {
      key: 'lastMessage',
      header: 'Última Mensagem',
      render: (item: LeadUI) => (
        <div className="max-w-[200px]">
          <p className="text-sm text-foreground truncate">{item.lastMessage || '-'}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: LeadUI) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
            <DropdownMenuItem>Iniciar Follow-up</DropdownMenuItem>
            <DropdownMenuItem>Mover para Pipeline</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Carregando...' : `${filteredLeads.length} leads encontrados`}
          </p>
          {isError && (
            <div className="mt-2 text-sm text-destructive">
              Falhou ao carregar leads: {String((error as any)?.message || 'erro')}
              <button className="ml-2 underline" onClick={() => refetch()}>
                tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Filtrar por estágio" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="qualificando">Qualificando</SelectItem>
            <SelectItem value="proposta">Proposta</SelectItem>
            <SelectItem value="follow-up">Follow-up</SelectItem>
            <SelectItem value="ganhou">Ganhou</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>

        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selectedLeads.length} selecionados</span>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
              Iniciar Follow-up
            </Button>
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
              Mover Estágio
            </Button>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={filteredLeads} keyField="id" />
    </div>
  );
}
