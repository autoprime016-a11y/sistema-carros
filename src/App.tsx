import React, { useEffect, useMemo, useState } from "react";
import {
  Car, DollarSign, LayoutDashboard, PlusCircle, ShieldCheck,
  Search, Wrench, Store, TrendingUp, ClipboardList, CalendarClock,
  Eye, CheckCircle2, CircleDollarSign, FileSpreadsheet, Share2,
  LogIn, UserCircle2, Bell, Settings, LogOut, Calculator,
  AlertTriangle, Trophy, Pencil, Megaphone, Target, Calendar,
  Gauge, Fuel, Palette, Package, MapPin, FileText, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "./lib/supabase";
import { APP_VERSION, VERSION_HISTORY } from "./version";

const BRAND_OPTIONS = [
  "Agrale","Alfa Romeo","Aston Martin","Audi","BMW","BYD","Caoa Chery","Chevrolet",
  "Chrysler","Citroën","Dodge","Effa","Ferrari","Fiat","Ford","Foton","GAC","GM","GWM",
  "Honda","Hyundai","Jaguar","Jeep","JAC","Kia","Lamborghini","Land Rover","Lexus",
  "Lifan","Mahindra","Maserati","Mercedes-Benz","Mini","Mitsubishi","Nissan","Peugeot",
  "Porsche","RAM","Renault","Rolls-Royce","Subaru","Suzuki","Tesla","Toyota","Troller",
  "Volkswagen","Volvo",
];

const TIPO_DESPESA_OPTIONS = [
  "Oficina","Funilaria","Documentação","Lavagem","Elétrica","Pneus","Acessórios",
  "Mecânica","Troca de óleo","Combustível","Comissão","Regularização","Outros",
];

// Possíveis despesas duplicadas: mesmo carro, mesma data e mesmo valor.
// "forte" quando também a categoria é igual; "atencao" quando as categorias diferem (pode ser coincidência).
type GrupoDuplicado = { chave: string; nivel: "forte" | "atencao"; itens: Expense[] };
// Assinatura de um grupo conferido: os ids das despesas, em ordem. Se entrar outra despesa igual, a assinatura muda e o alerta volta.
const assinaturaGrupo = (g: GrupoDuplicado) => g.itens.map((e) => Number(e.id)).sort((a, b) => a - b).join("-");
const chaveDuplicidade = (veiculoId: number | string, data: string, valor: number | string) =>
  `${veiculoId}|${(data || "").slice(0, 10)}|${Number(valor || 0).toFixed(2)}`;
function encontrarDuplicadas(expenses: Expense[]): GrupoDuplicado[] {
  const grupos = new Map<string, Expense[]>();
  expenses.forEach((e) => {
    const k = chaveDuplicidade(e.veiculoId, e.data, e.valor);
    grupos.set(k, [...(grupos.get(k) || []), e]);
  });
  return [...grupos.entries()]
    .filter(([, itens]) => itens.length > 1)
    .map(([chave, itens]) => {
      const categorias = itens.map((i) => i.categoria);
      const nivel: "forte" | "atencao" = new Set(categorias).size < categorias.length ? "forte" : "atencao";
      return { chave, nivel, itens };
    })
    .sort((a, b) => (a.nivel === b.nivel ? (b.itens[0].data || "").localeCompare(a.itens[0].data || "") : a.nivel === "forte" ? -1 : 1));
}

// Despesas operacionais da loja (estrutura de DRE): grupos e categorias
const GRUPOS_DESPESA_OPERACIONAL: { grupo: string; categorias: string[] }[] = [
  { grupo: "Pessoal", categorias: ["Salários", "Encargos (INSS/FGTS)", "Benefícios (VT, VR, saúde)", "Pró-labore"] },
  { grupo: "Administrativas", categorias: ["Aluguel", "Energia", "Água", "IPTU", "Internet e telefone", "Contador", "Sistemas e assinaturas", "Manutenção da loja", "Limpeza e escritório", "Seguros"] },
  { grupo: "Comerciais", categorias: ["Marketing e anúncios", "Portais de anúncio", "Brindes e eventos"] },
  { grupo: "Financeiras", categorias: ["Tarifas bancárias", "Juros e IOF", "Taxas de cartão"] },
  { grupo: "Impostos", categorias: ["Impostos sobre faturamento", "IRPJ e CSLL", "Taxas e alvarás", "Outros impostos"] },
  { grupo: "Outras", categorias: ["Outras despesas"] },
];
const GRUPO_DA_CATEGORIA: Record<string, string> = Object.fromEntries(
  GRUPOS_DESPESA_OPERACIONAL.flatMap(({ grupo, categorias }) => categorias.map((c) => [c, grupo])),
);
const grupoDespesaOperacional = (categoria: string) => GRUPO_DA_CATEGORIA[categoria] || "Outras";

type CustoOperacional = {
  id: number;
  competencia: string; // AAAA-MM
  categoria: string;
  descricao: string;
  valor: number;
  data_pagamento: string | null;
};
type StatusCustos = "ok" | "faltando" | "erro";

// Origem do carro e divisão do lucro
const ORIGEM_OPTIONS = ["Próprio", "Troca", "Consignado Família Carlesci", "Consignado Givaldo", "Consignado (outros)"];
type GrupoLucro = "loja" | "carlesci" | "givaldo" | "outros" | "definir";
const GRUPO_POR_ORIGEM: Record<string, GrupoLucro> = {
  "Próprio": "loja",
  "Troca": "loja",
  "Consignado Família Carlesci": "carlesci",
  "Consignado Givaldo": "givaldo",
  "Consignado (outros)": "outros",
};
// Qualquer origem fora da lista (ex.: o "Consignado" antigo, sem proprietário) fica "a definir"
const grupoDaOrigem = (origem?: string): GrupoLucro => GRUPO_POR_ORIGEM[origem || ""] || "definir";
const NOME_GRUPO: Record<GrupoLucro, string> = {
  loja: "Loja", carlesci: "Família Carlesci", givaldo: "Givaldo", outros: "Consignado (outros)", definir: "A definir",
};
// Pista do proprietário pelas observações/modelo (ex.: "FAMILIA CARLESCI", "GIVA")
const pistaProprietario = (v: { observacao?: string; modelo?: string }): string | null => {
  const texto = `${v.observacao || ""} ${v.modelo || ""}`;
  if (/CARLESCI/i.test(texto)) return "Consignado Família Carlesci";
  if (/\bGIVA/i.test(texto)) return "Consignado Givaldo";
  return null;
};

const COMPLEMENTO_OPTIONS = ["Completo","Compl - Ar","Apenas AR","Basico"];

const currency = (value: number | string | undefined | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

// Data de hoje no horário LOCAL (toISOString usa UTC e depois das 21h já devolvia o dia seguinte)
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Converte "AAAA-MM-DD" em dias absolutos, sem fuso horário
const isoToDayNumber = (dateStr?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
};

// Exibe "AAAA-MM-DD" como "DD/MM/AAAA" sem passar por new Date (que mostrava o dia anterior)
const formatDateBR = (dateStr?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

const monthKey = (dateStr?: string) => {
  if (!dateStr) return "sem-data";
  // Datas "AAAA-MM-DD" são lidas direto do texto para não sofrer com o fuso horário
  // (new Date("2026-10-01") vira 30/09 no horário de Brasília).
  const iso = /^(\d{4})-(\d{2})/.exec(dateStr);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "sem-data";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key: string) => {
  if (!key || key === "todos") return "Todos";
  if (key === "sem-data") return "Sem data";
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const texto = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const diffDays = (dateStr?: string, endDate?: string) => {
  const start = isoToDayNumber(dateStr);
  const end = isoToDayNumber(endDate || todayISO());
  if (start === null || end === null) return 0;
  return Math.max(0, Math.round(end - start));
};

const addDays = (dateStr: string, days: number) => {
  const start = isoToDayNumber(dateStr);
  if (start === null) return todayISO();
  return new Date((start + days) * 86400000).toISOString().slice(0, 10);
};

// Dias de pátio: para carro vendido, conta só até a data da venda
const diasPatio = (v: { dataCompra: string; dataVenda?: string; status: string }) =>
  diffDays(v.dataCompra, v.status === "Vendido" && v.dataVenda ? v.dataVenda : undefined);

const patioBadge = (days: number) => {
  if (days > 30) return "bg-red-500 text-white";
  if (days >= 15) return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
};

type Vehicle = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  km: number;
  cambio: string;
  combustivel: string;
  origem: string;
  completo: string;
  cor: string;
  compra: number;
  vendaPrevista: number; // preço pedido (nunca é sobrescrito pela venda)
  valorVenda?: number;   // valor pelo qual o carro foi vendido (tabela vendas)
  status: "Em estoque" | "Vendido" | "Reservado";
  dataCompra: string;
  dataVenda?: string;
  garantiaFim?: string;
  observacao?: string;
  telefoneAnuncio?: string;
};

type Expense = {
  id: number;
  veiculoId: number;
  placa: string;
  categoria: string;
  valor: number;
  data: string;
  descricao: string;
};

type VehicleRow = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  km: number | null;
  cambio: string | null;
  combustivel: string | null;
  origem: string | null;
  completo: string | null;
  cor: string | null;
  compra: number | null;
  venda_prevista: number | null;
  status: string | null;
  data_compra: string | null;
  observacao: string | null;
  telefone_anuncio: string | null;
  created_at: string;
};

type ExpenseRow = {
  id: number;
  veiculo_id: number;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  created_at: string;
};

type SaleRow = {
  id: number;
  veiculo_id: number;
  valor_venda: number;
  data_venda: string;
  observacao: string | null;
  created_at: string;
};

type WarrantyRow = {
  id: number;
  veiculo_id: number;
  venda_id: number | null;
  data_inicio: string;
  data_fim: string;
  status: string | null;
  observacao: string | null;
  created_at: string;
};

function mapVehicleRow(row: VehicleRow, salesMap: Map<number, SaleRow>, warrantyMap: Map<number, WarrantyRow>): Vehicle {
  const sale = salesMap.get(row.id);
  const warranty = warrantyMap.get(row.id);
  return {
    id: String(row.id),
    placa: row.placa || "",
    marca: row.marca || "",
    modelo: row.modelo || "",
    ano: Number(row.ano || 0),
    km: Number(row.km || 0),
    cambio: row.cambio || "Manual",
    combustivel: row.combustivel || "Flex",
    origem: row.origem || "Próprio",
    completo: row.completo || "Completo",
    cor: row.cor || "",
    compra: Number(row.compra || 0),
    vendaPrevista: Number(row.venda_prevista || 0),
    valorVenda: sale?.valor_venda != null ? Number(sale.valor_venda) : undefined,
    status: ((row.status || "Em estoque") as Vehicle["status"]),
    dataCompra: row.data_compra || todayISO(),
    dataVenda: sale?.data_venda || undefined,
    garantiaFim: warranty?.data_fim || undefined,
    observacao: row.observacao || "",
    telefoneAnuncio: row.telefone_anuncio || "",
  };
}

function mapExpenseRow(row: ExpenseRow, vehicleMap: Map<number, VehicleRow>): Expense {
  const vehicle = vehicleMap.get(row.veiculo_id);
  return {
    id: row.id,
    veiculoId: row.veiculo_id,
    placa: vehicle?.placa || "",
    categoria: row.categoria || "Outros",
    valor: Number(row.valor || 0),
    data: row.data,
    descricao: row.descricao || "",
  };
}

const statusClass: Record<string, string> = {
  "Em estoque": "bg-blue-50 text-blue-700 border-blue-200",
  Vendido: "bg-slate-100 text-slate-700 border-slate-200",
  Reservado: "bg-amber-50 text-amber-700 border-amber-200",
};

function LoginScreen({ onEnter }: { onEnter: (user: { name: string; email: string }) => void }) {
  const [email, setEmail] = useState("contato@autoprime.com.br");
  const [password, setPassword] = useState("123456");
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-7xl items-center gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="rounded-2xl bg-blue-600 p-2.5"><Store className="h-5 w-5" /></div>
            <div>
              <div className="font-semibold">Auto Prime Multimarcas</div>
              <div className="text-sm text-slate-300">Sistema online de gestão</div>
            </div>
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-tight md:text-5xl">
            Controle sua loja com um sistema bonito, rápido e pensado para operação real.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
            Cadastro de veículos, estoque, despesas, vendas, garantia, anúncio, meta e mostruário premium em uma única plataforma.
          </p>
        </div>
        <Card className="rounded-[32px] border border-white/10 bg-white text-slate-900 shadow-2xl shadow-blue-950/30">
          <CardHeader>
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-600 p-3 text-white"><LogIn className="h-5 w-5" /></div>
              <div>
                <CardTitle>Acessar sistema</CardTitle>
                <CardDescription>Versão demonstrativa pronta para evolução.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input data-testid="input-email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input data-testid="input-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button
              data-testid="button-login"
              onClick={() => onEnter({ name: "Administrador Auto Prime", email })}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              Entrar no painel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AppSidebar({
  active, setActive, user, onLogout,
}: {
  active: string;
  setActive: (tab: string) => void;
  user: { name: string; email: string };
  onLogout: () => void;
}) {
  const items = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["resultado", "Resultado do mês", CircleDollarSign],
    ["cadastro", "Cadastrar veículo", PlusCircle],
    ["estoque", "Estoque", Car],
    ["despesas", "Despesas", Wrench],
    ["gastos", "Gastos com carros", BarChart3],
    ["custos", "Despesas operacionais", ClipboardList],
    ["consulta-custo", "Consulta custo", Calculator],
    ["vendas", "Registrar venda", DollarSign],
    ["garantia", "Garantia", ShieldCheck],
    ["anuncio", "Anúncio", Megaphone],
    ["mostruario", "Mostruário", Eye],
  ] as const;

  return (
    <aside className="border-r border-slate-800 bg-slate-950 text-white flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-600/30">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Auto Prime</h1>
            <p className="text-sm text-slate-400">Sistema Web Completo</p>
            <p className="text-xs text-slate-500" data-testid="app-version">Versão {APP_VERSION}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-2"><UserCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-6 flex-1 overflow-y-auto">
        {items.map(([id, label, Icon]) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              data-testid={`nav-${id}`}
              onClick={() => setActive(id)}
              className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-300 hover:bg-slate-900"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-300 hover:bg-slate-900">
            <Bell className="h-5 w-5" /><span className="font-medium">Notificações</span>
          </button>
          <button
            data-testid="nav-configuracoes"
            onClick={() => setActive("configuracoes")}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${active === "configuracoes" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-300 hover:bg-slate-900"}`}
          >
            <Settings className="h-5 w-5" /><span className="font-medium">Configurações</span>
          </button>
          <button
            data-testid="button-logout"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-300 hover:bg-slate-900"
          >
            <LogOut className="h-5 w-5" /><span className="font-medium">Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function StatCard({
  title, value, subtitle, icon: Icon, onClick, active = false, valueClass = "text-slate-950",
}: {
  valueClass?: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
}) {
  const conteudo = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          {onClick && (
            <p className="mt-2 text-xs font-semibold text-blue-600">{active ? "Ocultar lista ▲" : "Ver carros ▼"}</p>
          )}
        </div>
        <div className="rounded-2xl bg-blue-600 p-3 text-white"><Icon className="h-5 w-5" /></div>
      </div>
    </CardContent>
  );
  if (!onClick) {
    return <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">{conteudo}</Card>;
  }
  return (
    <button type="button" onClick={onClick} aria-expanded={active} className="text-left">
      <Card className={`h-full rounded-3xl border-0 shadow-md shadow-slate-200/60 transition hover:ring-2 hover:ring-blue-300 ${active ? "ring-2 ring-blue-500" : ""}`}>
        {conteudo}
      </Card>
    </button>
  );
}

// Lista dos carros vendidos no período do filtro do dashboard
function SoldList({
  vehicles, custoVeiculo, onSelect,
}: {
  vehicles: Vehicle[];
  custoVeiculo: (v: Vehicle) => number;
  onSelect: (v: Vehicle) => void;
}) {
  const ordenados = [...vehicles].sort((a, b) => (b.dataVenda || "").localeCompare(a.dataVenda || ""));
  return (
    <Card className="mt-4 rounded-3xl border-0 shadow-md shadow-slate-200/60" data-testid="sold-list">
      <CardHeader>
        <CardTitle>Carros vendidos</CardTitle>
        <CardDescription>Toque num carro para abrir a ficha completa.</CardDescription>
      </CardHeader>
      <CardContent>
        {ordenados.length === 0 && <p className="text-sm text-slate-500">Nenhum carro vendido neste período.</p>}
        <div className="space-y-3">
          {ordenados.map((v) => {
            const valor = Number(v.valorVenda ?? v.vendaPrevista ?? 0);
            const lucro = valor - custoVeiculo(v);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{v.marca} {v.modelo}</p>
                  <p className="text-sm text-slate-500">
                    {v.placa} • vendido em {formatDateBR(v.dataVenda)} • {diasPatio(v)} dias no pátio
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{currency(valor)}</p>
                  <p className={`text-sm font-medium ${lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {lucro >= 0 ? "Lucro" : "Prejuízo"} {currency(lucro)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleForm({
  onSave, editingVehicle, onCancelEdit,
}: {
  onSave: (data: Record<string, string>) => void;
  editingVehicle: Vehicle | null;
  onCancelEdit: () => void;
}) {
  const baseState = {
    placa: "", marca: "", modelo: "", ano: "", km: "", cambio: "Manual",
    combustivel: "Flex", origem: "Próprio", completo: "Completo", cor: "",
    compra: "", vendaPrevista: "", dataCompra: todayISO(), observacao: "",
    telefoneAnuncio: "1633924002",
  };
  const [form, setForm] = useState(baseState);

  useEffect(() => {
    if (editingVehicle) {
      setForm({
        placa: editingVehicle.placa,
        marca: editingVehicle.marca,
        modelo: editingVehicle.modelo,
        ano: String(editingVehicle.ano ?? ""),
        km: String(editingVehicle.km ?? ""),
        cambio: editingVehicle.cambio,
        combustivel: editingVehicle.combustivel,
        origem: editingVehicle.origem,
        completo: editingVehicle.completo,
        cor: editingVehicle.cor,
        compra: String(editingVehicle.compra ?? ""),
        vendaPrevista: String(editingVehicle.vendaPrevista ?? ""),
        dataCompra: editingVehicle.dataCompra || todayISO(),
        observacao: editingVehicle.observacao || "",
        telefoneAnuncio: editingVehicle.telefoneAnuncio || "1633924002",
      });
    } else {
      setForm(baseState);
    }
  }, [editingVehicle]);

  const change = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    if (!form.placa || !form.marca || !form.modelo) return;
    onSave(form);
    if (!editingVehicle) setForm(baseState);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">{editingVehicle ? "Editar veículo" : "Cadastrar veículo"}</h2>
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{editingVehicle ? "Editar veículo" : "Cadastrar veículo"}</CardTitle>
              <CardDescription>Cadastro principal com dados para estoque, anúncio e gestão financeira.</CardDescription>
            </div>
            {editingVehicle && (
              <Button variant="outline" className="rounded-2xl" onClick={onCancelEdit}>
                Cancelar edição
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input data-testid="input-placa" value={form.placa} onChange={(e) => change("placa", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={form.marca} onValueChange={(value) => change("marca", value)}>
                <SelectTrigger data-testid="select-marca"><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">{BRAND_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input data-testid="input-modelo" value={form.modelo} onChange={(e) => change("modelo", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input data-testid="input-ano" type="number" value={form.ano} onChange={(e) => change("ano", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>KM</Label>
              <Input data-testid="input-km" type="number" value={form.km} onChange={(e) => change("km", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input data-testid="input-cor" value={form.cor} onChange={(e) => change("cor", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data da compra</Label>
              <Input data-testid="input-dataCompra" type="date" value={form.dataCompra} onChange={(e) => change("dataCompra", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone anúncio</Label>
              <Input data-testid="input-telefone" value={form.telefoneAnuncio} onChange={(e) => change("telefoneAnuncio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Câmbio</Label>
              <Select value={form.cambio} onValueChange={(value) => change("cambio", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Automático">Automático</SelectItem>
                  <SelectItem value="CVT">CVT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Combustível</Label>
              <Select value={form.combustivel} onValueChange={(value) => change("combustivel", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  <SelectItem value="Flex">Flex</SelectItem>
                  <SelectItem value="Gasolina">Gasolina</SelectItem>
                  <SelectItem value="Álcool">Álcool</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Elétrico">Elétrico</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={form.origem} onValueChange={(value) => change("origem", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {!ORIGEM_OPTIONS.includes(form.origem) && form.origem && (
                    <SelectItem value={form.origem}>{form.origem} (escolha o proprietário)</SelectItem>
                  )}
                  {ORIGEM_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pacote</Label>
              <Select value={form.completo} onValueChange={(value) => change("completo", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {COMPLEMENTO_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor de compra (R$)</Label>
              <Input data-testid="input-compra" type="number" value={form.compra} onChange={(e) => change("compra", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Venda prevista (R$)</Label>
              <Input data-testid="input-vendaPrevista" type="number" value={form.vendaPrevista} onChange={(e) => change("vendaPrevista", e.target.value)} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Observações</Label>
            <Textarea
              data-testid="input-observacao"
              value={form.observacao}
              onChange={(e) => change("observacao", e.target.value)}
              className="rounded-2xl"
              rows={3}
            />
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              data-testid="button-save-vehicle"
              onClick={save}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              {editingVehicle ? "Salvar alterações" : "Cadastrar veículo"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesPanel({
  expenses,
  vehicles,
  onSaveExpense,
  onDeleteExpense,
  initialPlate,
  editingExpense,
  onStartEdit,
  onClearEditing,
  validadas,
  onValidar,
}: {
  expenses: Expense[];
  vehicles: Vehicle[];
  validadas: Set<string>;
  onValidar: (assinatura: string) => Promise<void>;
  onSaveExpense: (data: Record<string, string>, id?: number) => Promise<boolean>;
  onDeleteExpense: (expense: Expense) => void;
  initialPlate?: string;
  editingExpense: Expense | null;
  onStartEdit: (expense: Expense) => void;
  onClearEditing: () => void;
}) {
  const emptyForm = () => ({
    placa: initialPlate || "", categoria: TIPO_DESPESA_OPTIONS[0], valor: "", data: todayISO(), descricao: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (initialPlate) setForm((prev) => ({ ...prev, placa: initialPlate }));
  }, [initialPlate]);

  // Ao clicar em "Corrigir", carrega a despesa no formulário
  useEffect(() => {
    if (editingExpense) {
      setForm({
        placa: editingExpense.placa,
        categoria: editingExpense.categoria,
        valor: String(editingExpense.valor),
        data: editingExpense.data.slice(0, 10),
        descricao: editingExpense.descricao || "",
      });
      setAviso("");
    }
  }, [editingExpense]);

  const cancelar = () => {
    onClearEditing();
    setForm(emptyForm());
    setAviso("");
  };

  const save = async () => {
    if (!form.placa) { setAviso("Selecione a placa do veículo."); return; }
    if (!Number(form.valor)) { setAviso("Informe o valor da despesa."); return; }
    setAviso("");
    const ok = await onSaveExpense(form, editingExpense?.id);
    if (ok) {
      onClearEditing();
      setForm(emptyForm());
    }
  };

  const duplicadas = useMemo(() => encontrarDuplicadas(expenses).filter((g) => !validadas.has(assinaturaGrupo(g))), [expenses, validadas]);
  const fortes = duplicadas.filter((g) => g.nivel === "forte").length;

  return (
    <div className="space-y-6">
      {duplicadas.length > 0 && (
        <Card className={`rounded-3xl border-0 shadow-md shadow-slate-200/60 ring-2 ${fortes ? "bg-red-50 ring-red-200" : "bg-amber-50 ring-amber-300"}`} data-testid="duplicate-expenses">
          <CardContent className="space-y-3 p-5">
            <div className={`flex items-center gap-2 font-semibold ${fortes ? "text-red-800" : "text-amber-800"}`}>
              <AlertTriangle className="h-5 w-5" />
              {duplicadas.length === 1 ? "1 possível lançamento duplicado" : `${duplicadas.length} possíveis lançamentos duplicados`}
            </div>
            <p className="text-sm text-slate-600">Mesmo carro, mesma data e mesmo valor. <strong className="text-red-700">Vermelho</strong>: também a mesma categoria, quase sempre é duplicada. <strong className="text-amber-700">Amarelo</strong>: categorias diferentes, pode ser coincidência. Confira e corrija ou exclua se for o caso. Se estiver tudo certo, toque em <strong>Manter as duas</strong> e o aviso some.</p>
            <div className="space-y-3">
              {duplicadas.map((g) => (
                <div key={g.chave} className={`rounded-2xl border bg-white p-3 ${g.nivel === "forte" ? "border-red-200" : "border-amber-200"}`}>
                  <p className="text-sm font-semibold">
                    <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold text-white ${g.nivel === "forte" ? "bg-red-600" : "bg-amber-500"}`}>{g.nivel === "forte" ? "Provável duplicada" : "Atenção"}</span>
                    {g.itens[0].placa} • {formatDateBR(g.itens[0].data)} • {currency(g.itens[0].valor)} cada
                  </p>
                  <div className="mt-2 space-y-1">
                    {g.itens.map((e) => (
                      <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <span>{e.categoria}{e.descricao ? ` — ${e.descricao}` : ""}</span>
                        <span className="flex gap-3 font-medium">
                          <button className="text-blue-600 hover:underline" onClick={() => { onStartEdit(e); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Corrigir</button>
                          <button className="text-red-600 hover:underline" onClick={() => { if (confirm(`Excluir a despesa de ${currency(e.valor)} (${e.categoria}) do veículo ${e.placa}?`)) onDeleteExpense(e); }}>Excluir</button>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      onClick={() => onValidar(assinaturaGrupo(g))}
                    >
                      ✓ {g.itens.length === 2 ? "Manter as duas (não é duplicada)" : `Manter as ${g.itens.length} (não é duplicada)`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className={`rounded-3xl border-0 shadow-md shadow-slate-200/60 ${editingExpense ? "ring-2 ring-amber-300" : ""}`}>
          <CardHeader>
            <CardTitle>{editingExpense ? "Corrigir despesa" : "Lançar despesa"}</CardTitle>
            <CardDescription>{editingExpense ? "Altere os campos e salve. A despesa original será substituída." : "Controle de custos por veículo."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Placa</Label>
              <Select value={form.placa} onValueChange={(value) => setForm({ ...form, placa: value })}>
                <SelectTrigger data-testid="select-placa-expense"><SelectValue placeholder="Selecione a placa" /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {vehicles.map((v) => (
                    <SelectItem key={v.placa} value={v.placa}>{v.placa} - {v.marca} {v.modelo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(value) => setForm({ ...form, categoria: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {TIPO_DESPESA_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input data-testid="input-valor-expense" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input data-testid="input-descricao-expense" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            {aviso && <p className="text-sm font-medium text-red-600">{aviso}</p>}
            <Button data-testid="button-save-expense" onClick={save} className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700">
              {editingExpense ? "Salvar correção" : "Lançar despesa"}
            </Button>
            {editingExpense && (
              <Button variant="outline" onClick={cancelar} className="w-full rounded-2xl">
                Cancelar correção
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardHeader><CardTitle>Histórico de despesas</CardTitle></CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-slate-500">Nenhuma despesa lançada.</p>
            ) : (
              <div className="space-y-3">
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    data-testid={`expense-row-${e.id}`}
                    className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${editingExpense?.id === e.id ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-slate-50"}`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{e.placa} — {e.categoria}</p>
                      <p className="text-sm text-slate-500">{formatDateBR(e.data)}{e.descricao ? ` • ${e.descricao}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-lg font-semibold text-red-500">{currency(e.valor)}</p>
                      <div className="flex gap-3 text-sm font-medium">
                        <button className="text-blue-600 hover:underline" onClick={() => { onStartEdit(e); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          Corrigir
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => {
                            if (confirm(`Excluir a despesa de ${currency(e.valor)} (${e.categoria}) do veículo ${e.placa}?`)) onDeleteExpense(e);
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CostLookupPanel({ vehicles, expenses }: { vehicles: Vehicle[]; expenses: Expense[] }) {
  const [selectedPlate, setSelectedPlate] = useState("");
  const [plateInput, setPlateInput] = useState("");
  const normalizedInput = plateInput.trim().toUpperCase();

  useEffect(() => {
    if (!normalizedInput) return;
    const found = vehicles.find((v) => String(v.placa || "").toUpperCase() === normalizedInput);
    if (found) setSelectedPlate(found.placa);
  }, [normalizedInput, vehicles]);

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.placa === selectedPlate), [vehicles, selectedPlate]);
  const vehicleExpenses = useMemo(() => expenses.filter((e) => e.placa === selectedPlate), [expenses, selectedPlate]);
  const totalExpenses = vehicleExpenses.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const totalCost = Number(selectedVehicle?.compra || 0) + totalExpenses;
  const vendido = selectedVehicle?.status === "Vendido" && selectedVehicle?.valorVenda != null;
  const lucroPrevisto = Number((vendido ? selectedVehicle?.valorVenda : selectedVehicle?.vendaPrevista) || 0) - totalCost;

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader>
          <CardTitle>Consulta de custo por placa</CardTitle>
          <CardDescription>Digite a placa ou selecione o veículo para ver compra, custos e total.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar por placa</Label>
            <Input
              data-testid="input-placa-lookup"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              placeholder="Ex.: FKA-2A14"
            />
          </div>
          <div className="space-y-2">
            <Label>Ou selecione a placa</Label>
            <Select value={selectedPlate} onValueChange={(value) => { setSelectedPlate(value); setPlateInput(value); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a placa" /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {vehicles.map((v) => <SelectItem key={v.placa} value={v.placa}>{v.placa} - {v.marca} {v.modelo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedVehicle && (
            <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Compra</span><span className="font-medium">{currency(selectedVehicle.compra)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Despesas</span><span className="font-medium text-red-500">+{currency(totalExpenses)}</span></div>
              <div className="border-t" />
              <div className="flex justify-between text-base font-bold"><span>Custo total</span><span>{currency(totalCost)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">{vendido ? "Preço pedido" : "Venda prevista"}</span><span className="font-medium">{currency(selectedVehicle.vendaPrevista)}</span></div>
              {vendido && (
                <div className="flex justify-between text-sm"><span className="text-slate-500">Vendido por</span><span className="font-medium">{currency(selectedVehicle.valorVenda)}</span></div>
              )}
              <div className="flex justify-between text-base font-bold"><span>{vendido ? "Lucro realizado" : "Lucro previsto"}</span><span className={lucroPrevisto >= 0 ? "text-emerald-600" : "text-red-600"}>{currency(lucroPrevisto)}</span></div>

            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader><CardTitle>{selectedVehicle ? `Despesas — ${selectedVehicle.marca} ${selectedVehicle.modelo}` : "Selecione um veículo"}</CardTitle></CardHeader>
        <CardContent>
          {!selectedVehicle && <p className="text-slate-500">Selecione uma placa para visualizar as despesas.</p>}
          {selectedVehicle && vehicleExpenses.length === 0 && <p className="text-slate-500">Nenhuma despesa lançada para este veículo.</p>}
          {vehicleExpenses.map((e) => (
            <div key={e.id} className="mb-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="font-semibold">{e.categoria}</p>
                <p className="text-sm text-slate-500">{formatDateBR(e.data)} • {e.descricao}</p>
              </div>
              <p className="text-lg font-semibold text-red-500">{currency(e.valor)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SalesPanel({
  stockVehicles, onRegisterSale, initialPlate,
}: {
  stockVehicles: Vehicle[];
  onRegisterSale: (data: { placa: string; valorVenda: string; dataVenda: string }) => void;
  initialPlate?: string;
}) {
  const [form, setForm] = useState({ placa: initialPlate || "", valorVenda: "", dataVenda: todayISO() });

  useEffect(() => {
    if (initialPlate) setForm((prev) => ({ ...prev, placa: initialPlate }));
  }, [initialPlate]);

  const save = () => {
    if (!form.placa || !form.valorVenda) return;
    onRegisterSale(form);
    setForm({ placa: initialPlate || "", valorVenda: "", dataVenda: todayISO() });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader>
          <CardTitle>Registrar venda</CardTitle>
          <CardDescription>Altera status para vendido e mantém garantia de 90 dias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Placa</Label>
            <Select value={form.placa} onValueChange={(value) => setForm({ ...form, placa: value })}>
              <SelectTrigger data-testid="select-placa-sale"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {stockVehicles.map((v) => <SelectItem key={v.placa} value={v.placa}>{v.placa} - {v.marca} {v.modelo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor da venda</Label>
            <Input data-testid="input-valor-sale" type="number" value={form.valorVenda} onChange={(e) => setForm({ ...form, valorVenda: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Data da venda</Label>
            <Input type="date" value={form.dataVenda} onChange={(e) => setForm({ ...form, dataVenda: e.target.value })} />
          </div>
          <Button data-testid="button-confirm-sale" onClick={save} className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700">
            Confirmar venda
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader><CardTitle>Veículos prontos para venda</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {stockVehicles.map((v) => (
              <div key={v.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-bold">{v.marca} {v.modelo}</p>
                <p className="text-sm text-slate-500">{v.placa} • {v.ano}</p>
                <p className="mt-2 text-lg font-semibold text-emerald-700">{currency(v.vendaPrevista)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VehicleDetailPage({
  vehicle, expenses, onBack, onEditVehicle, onOpenExpense, onOpenSale, onDeleteVehicle, onUndoSale, onEditExpense, onUpdateSale, backLabel,
}: {
  backLabel?: string;
  onUpdateSale: (vehicle: Vehicle, dados: { dataVenda: string; valorVenda: number }) => Promise<boolean>;
  vehicle: Vehicle;
  expenses: Expense[];
  onBack: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onOpenExpense: (plate: string) => void;
  onOpenSale: (plate: string) => void;
  onDeleteVehicle: (id: string) => void;
  onUndoSale: (vehicle: Vehicle) => void;
  onEditExpense: (expense: Expense) => void;
}) {
  const vehicleExpenses = expenses.filter((e) => e.placa === vehicle.placa);
  const totalExpenses = vehicleExpenses.reduce((sum, e) => sum + Number(e.valor || 0), 0);
  const totalCost = Number(vehicle.compra || 0) + totalExpenses;
  const vendido = vehicle.status === "Vendido" && vehicle.valorVenda != null;
  const valorBase = vendido ? Number(vehicle.valorVenda) : Number(vehicle.vendaPrevista || 0);
  const lucro = valorBase - totalCost;
  const desconto = vendido ? Number(vehicle.vendaPrevista || 0) - Number(vehicle.valorVenda) : 0;

  // Corrigir venda: data e valor (a garantia de 90 dias acompanha a nova data)
  const [corrigindoVenda, setCorrigindoVenda] = useState(false);
  const [formVenda, setFormVenda] = useState({ dataVenda: "", valorVenda: "" });
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const abrirCorrecaoVenda = () => {
    setFormVenda({ dataVenda: (vehicle.dataVenda || "").slice(0, 10), valorVenda: String(vehicle.valorVenda ?? "") });
    setCorrigindoVenda(true);
  };
  const salvarCorrecaoVenda = async () => {
    const valor = Number(formVenda.valorVenda);
    if (!formVenda.dataVenda) { alert("Informe a data da venda."); return; }
    if (!valor) { alert("Informe o valor da venda."); return; }
    const avisos: string[] = [];
    if (vehicle.dataCompra && formVenda.dataVenda < vehicle.dataCompra.slice(0, 10)) avisos.push(`A data da venda (${formatDateBR(formVenda.dataVenda)}) é anterior à data da compra (${formatDateBR(vehicle.dataCompra)}).`);
    if (formVenda.dataVenda > todayISO()) avisos.push("A data da venda está no futuro.");
    const mesAntigo = monthKey(vehicle.dataVenda);
    if (vehicle.dataVenda && monthKey(formVenda.dataVenda) !== mesAntigo) avisos.push(`A venda vai sair de ${monthLabel(mesAntigo)} e entrar em ${monthLabel(monthKey(formVenda.dataVenda))}: o Resultado do mês e o extrato dos dois meses mudam.`);
    if (avisos.length && !confirm(`${avisos.join("\n\n")}\n\nSalvar mesmo assim?`)) return;
    setSalvandoVenda(true);
    const ok = await onUpdateSale(vehicle, { dataVenda: formVenda.dataVenda, valorVenda: valor });
    setSalvandoVenda(false);
    if (ok) setCorrigindoVenda(false);
  };

  const confirmarExclusao = () => {
    const partes = [
      vehicleExpenses.length > 0 && `${vehicleExpenses.length} despesa(s)`,
      vehicle.status === "Vendido" && "a venda e a garantia",
    ].filter(Boolean).join(" e ");
    const msg = `Excluir ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})?` +
      (partes ? `\n\nTambém serão apagadas: ${partes}.` : "") +
      "\n\nEssa ação não pode ser desfeita.";
    if (confirm(msg)) onDeleteVehicle(vehicle.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{vehicle.marca} {vehicle.modelo}</h2>
          <p className="mt-1 text-slate-500">{vehicle.placa} • {vehicle.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" className="rounded-2xl" onClick={confirmarExclusao}>
            Excluir
          </Button>
          {vehicle.status === "Vendido" && (
            <Button
              variant="outline"
              className="rounded-2xl"
              data-testid="button-undo-sale"
              onClick={() => {
                if (confirm(`Desfazer a venda de ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})?\n\nO carro volta para o estoque e a venda e a garantia são apagadas.`)) {
                  onUndoSale(vehicle);
                }
              }}
            >
              Desfazer venda
            </Button>
          )}
          {vendido && (
            <Button variant="outline" className="rounded-2xl" onClick={abrirCorrecaoVenda} data-testid="button-edit-sale">
              <Pencil className="mr-2 h-4 w-4" /> Corrigir venda
            </Button>
          )}
          <Button variant="outline" className="rounded-2xl" onClick={onBack} data-testid="button-back-stock">
            {backLabel || "Voltar para estoque"}
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => onEditVehicle(vehicle)} data-testid="button-edit-vehicle">
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700" onClick={() => onOpenExpense(vehicle.placa)} data-testid="button-add-expense">
            Adicionar despesas
          </Button>
          {vehicle.status !== "Vendido" && (
            <Button variant="outline" className="rounded-2xl" onClick={() => onOpenSale(vehicle.placa)} data-testid="button-mark-sold">
              Marcar como vendido
            </Button>
          )}
        </div>
      </div>

      {corrigindoVenda && (
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60 ring-2 ring-amber-300" data-testid="edit-sale-card">
          <CardHeader>
            <CardTitle>Corrigir venda</CardTitle>
            <CardDescription>A garantia de 90 dias passa a contar da nova data. O carro continua vendido.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Data da venda</Label>
              <Input type="date" value={formVenda.dataVenda} onChange={(e) => setFormVenda({ ...formVenda, dataVenda: e.target.value })} data-testid="input-edit-sale-date" />
            </div>
            <div className="space-y-2">
              <Label>Valor da venda (R$)</Label>
              <Input type="number" value={formVenda.valorVenda} onChange={(e) => setFormVenda({ ...formVenda, valorVenda: e.target.value })} data-testid="input-edit-sale-value" />
            </div>
            <div className="flex gap-2">
              <Button onClick={salvarCorrecaoVenda} disabled={salvandoVenda} className="rounded-2xl bg-blue-600 hover:bg-blue-700" data-testid="button-save-sale">{salvandoVenda ? "Salvando..." : "Salvar"}</Button>
              <Button variant="outline" onClick={() => setCorrigindoVenda(false)} className="rounded-2xl">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.9fr_0.95fr]">
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardHeader><CardTitle>Ficha Técnica</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="space-y-8">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><Calendar className="h-4 w-4" /> Ano</div>
                  <p className="text-2xl font-semibold">{vehicle.ano}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><Fuel className="h-4 w-4" /> Combustível</div>
                  <p className="text-2xl font-semibold">{vehicle.combustivel}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><MapPin className="h-4 w-4" /> Origem</div>
                  <p className="text-2xl font-semibold">{vehicle.origem}</p>
                </div>
              </div>
              <div className="space-y-8">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><Gauge className="h-4 w-4" /> Quilometragem</div>
                  <p className="text-2xl font-semibold">{Number(vehicle.km || 0).toLocaleString("pt-BR")} km</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><Palette className="h-4 w-4" /> Cor</div>
                  <p className="text-2xl font-semibold">{vehicle.cor}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><CalendarClock className="h-4 w-4" /> Data da Compra</div>
                  <p className="text-2xl font-semibold">{formatDateBR(vehicle.dataCompra)}</p>
                </div>
              </div>
              <div className="space-y-8">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><Settings className="h-4 w-4" /> Câmbio</div>
                  <p className="text-2xl font-semibold">{vehicle.cambio}</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-slate-500"><Package className="h-4 w-4" /> Pacote</div>
                  <p className="text-2xl font-semibold">{vehicle.completo}</p>
                </div>
                {vehicle.status === "Vendido" && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-slate-500"><DollarSign className="h-4 w-4" /> Data da Venda</div>
                    <p className="text-2xl font-semibold">{vehicle.dataVenda ? formatDateBR(vehicle.dataVenda) : "—"}</p>
                    {vehicle.dataVenda && <p className="text-sm text-slate-500">{diffDays(vehicle.dataCompra, vehicle.dataVenda)} dias de pátio</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 border-t pt-8">
              <div className="mb-2 flex items-center gap-2 text-slate-500"><FileText className="h-4 w-4" /> Observações</div>
              <p className="text-xl font-medium">{vehicle.observacao || "Sem observações."}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
              <CardDescription>Custos e projeção de lucro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between text-xl">
                <span className="text-slate-500">Valor de Compra</span>
                <span className="font-semibold">{currency(vehicle.compra)}</span>
              </div>
              <div className="flex items-center justify-between text-xl">
                <span className="text-slate-500">Total de Despesas</span>
                <span className="font-semibold text-red-500">+{currency(totalExpenses)}</span>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between text-2xl font-bold">
                <span>Custo Total</span><span>{currency(totalCost)}</span>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between text-xl">
                <span className="text-slate-500">{vendido ? "Preço pedido" : "Venda Prevista"}</span>
                <span className="font-semibold">{currency(vehicle.vendaPrevista)}</span>
              </div>
              {vendido && (
                <>
                  <div className="flex items-center justify-between text-xl">
                    <span className="text-slate-500">Vendido por</span>
                    <span className="font-semibold">{currency(vehicle.valorVenda)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base">
                    <span className="text-slate-500">Data da venda</span>
                    <span className="font-semibold">{vehicle.dataVenda ? formatDateBR(vehicle.dataVenda) : "—"}</span>
                  </div>
                  {desconto !== 0 && (
                    <div className="flex items-center justify-between text-base">
                      <span className="text-slate-500">{desconto > 0 ? "Desconto dado" : "Vendido acima do pedido"}</span>
                      <span className={desconto > 0 ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>{currency(Math.abs(desconto))}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between text-2xl font-bold">
                <span>{vendido ? "Lucro realizado" : lucro >= 0 ? "Lucro previsto" : "Prejuízo previsto"}</span>
                <span className={lucro >= 0 ? "text-emerald-600" : "text-red-600"}>{currency(lucro)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Despesas</CardTitle>
                <Button variant="outline" className="rounded-2xl" onClick={() => onOpenExpense(vehicle.placa)}>Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {vehicleExpenses.length > 0 ? vehicleExpenses.map((item) => (
                  <div key={item.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-semibold">{item.categoria}</p>
                        <p className="text-sm text-slate-500">{formatDateBR(item.data)}{item.descricao ? ` • ${item.descricao}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-red-500">{currency(item.valor)}</p>
                        <button className="text-sm font-medium text-blue-600 hover:underline" onClick={() => onEditExpense(item)}>
                          Corrigir
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-500">Nenhuma despesa lançada para este veículo.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StockPage({ vehicles, onSelectVehicle }: { vehicles: Vehicle[]; onSelectVehicle: (vehicle: Vehicle) => void }) {
  const [query, setQuery] = useState("");
  // Ao abrir o Estoque, mostra por padrão só os carros que estão no pátio
  const [statusFilter, setStatusFilter] = useState("Em estoque");
  // Botão "Só próprios": mostra apenas os carros da loja (Próprio e Troca), sem os consignados
  const [soProprios, setSoProprios] = useState(false);

  const filtered = useMemo(() => {
    return vehicles
      .filter((v) => statusFilter === "Todos" || v.status === statusFilter)
      .filter((v) => {
        const q = query.toLowerCase();
        return !q || [v.id, v.placa, v.marca, v.modelo].some((x) => String(x).toLowerCase().includes(q));
      })
      .filter((v) => !soProprios || grupoDaOrigem(v.origem) === "loja")
      .sort((a, b) => a.marca.localeCompare(b.marca, "pt-BR") || a.modelo.localeCompare(b.modelo, "pt-BR"));
  }, [vehicles, query, statusFilter, soProprios]);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Estoque</CardTitle>
              <CardDescription>{filtered.length} {filtered.length === 1 ? "carro" : "carros"}{soProprios ? " próprios (Próprio e Troca)" : ""}{statusFilter !== "Todos" ? ` • ${statusFilter.toLowerCase()}` : ""}</CardDescription>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  data-testid="input-stock-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar veículo"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] rounded-2xl" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {["Todos", "Em estoque", "Vendido", "Reservado"].map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                data-testid="button-only-own"
                aria-pressed={soProprios}
                onClick={() => setSoProprios((x) => !x)}
                title="Mostra só os carros da loja (Próprio e Troca), sem os consignados"
                className={`flex h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${soProprios ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"}`}
              >
                {soProprios ? <CheckCircle2 className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                Só próprios
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {filtered.map((v) => {
              const days = diasPatio(v);
              return (
                <button
                  key={v.id}
                  data-testid={`vehicle-card-${v.id}`}
                  onClick={() => onSelectVehicle(v)}
                  className="w-full rounded-[24px] border border-slate-200 bg-white p-6 text-left shadow-md shadow-slate-200/60 transition hover:border-blue-300 hover:shadow-lg"
                >
                  <div className="grid items-center gap-5 lg:grid-cols-[96px_1.4fr_1fr_220px_110px]">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Car className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">{v.marca} {v.modelo}</h3>
                      <p className="mt-1 text-sm text-slate-500">{v.ano} • {Number(v.km || 0).toLocaleString("pt-BR")} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Placa</p>
                      <p className="font-semibold">{v.placa}</p>
                      <p className="mt-1 text-xs text-slate-500">{v.cambio} • {v.combustivel}</p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${COR_GRUPO[grupoDaOrigem(v.origem)]}`}
                        data-testid={`vehicle-origin-${v.id}`}
                      >
                        {grupoDaOrigem(v.origem) === "definir" ? `${v.origem || "Origem"} (definir proprietário)` : v.origem}
                      </span>
                    </div>
                    <div>
                      {v.status === "Vendido" && v.valorVenda != null ? (
                        <>
                          <p className="text-xs text-slate-500">Vendido por</p>
                          <p className="text-xl font-bold text-slate-950">{currency(v.valorVenda)}</p>
                          <p className="mt-1 text-xs text-slate-500">Pedido: {currency(v.vendaPrevista)} • Compra: {currency(v.compra)}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500">Venda prevista</p>
                          <p className="text-xl font-bold text-slate-950">{currency(v.vendaPrevista)}</p>
                          <p className="mt-1 text-xs text-slate-500">Compra: {currency(v.compra)}</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${statusClass[v.status]} rounded-2xl border px-3 py-1 text-xs font-medium`}>
                        {v.status}
                      </Badge>
                      {v.status === "Vendido" ? (
                        <Badge className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          Vendido em {days}d
                        </Badge>
                      ) : (
                        <Badge className={`${patioBadge(days)} rounded-2xl px-3 py-1 text-xs font-medium`}>
                          {days}d pátio
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-500">Nenhum veículo encontrado com os filtros selecionados.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WarrantyPanel({ soldVehicles }: { soldVehicles: Vehicle[] }) {
  // Compara as datas como texto (AAAA-MM-DD) para a garantia que vence hoje ainda contar como ativa
  const hoje = todayISO();
  const diasRestantes = (fim?: string) => diffDays(hoje, fim);
  const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
  const active = soldVehicles
    .filter((v) => v.garantiaFim && v.garantiaFim >= hoje)
    .sort((a, b) => diasRestantes(a.garantiaFim) - diasRestantes(b.garantiaFim));
  const closed = soldVehicles.filter((v) => v.garantiaFim && v.garantiaFim < hoje);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader><CardTitle>Garantias ativas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {active.length === 0 && <p className="text-sm text-slate-500">Nenhuma garantia ativa.</p>}
          {active.map((v) => {
            const total = 90;
            const restantes = diasRestantes(v.garantiaFim);
            const used = total - restantes;
            const progress = Math.max(0, Math.min(100, (used / total) * 100));
            const corDias = restantes <= 15 ? "text-amber-600" : "text-slate-900";
            return (
              <div key={v.id} data-testid={`warranty-active-${v.id}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{v.marca} {v.modelo}</p>
                    <p className="text-sm text-slate-500">{v.placa} • garantia até {dataBR(v.garantiaFim)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className={`text-sm font-semibold ${corDias}`}>
                      {restantes === 0 ? "Vence hoje" : restantes === 1 ? "Falta 1 dia" : `Faltam ${restantes} dias`}
                    </p>
                    <Badge className="border border-emerald-200 bg-emerald-500/15 text-emerald-700">Ativa</Badge>
                  </div>
                </div>
                <div className="mt-4"><Progress value={progress} /></div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader><CardTitle>Garantias encerradas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {closed.length === 0 && <p className="text-sm text-slate-500">Nenhuma garantia encerrada.</p>}
          {closed.map((v) => (
            <div key={v.id} data-testid={`warranty-closed-${v.id}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{v.marca} {v.modelo}</p>
                  <p className="text-sm text-slate-500">{v.placa} • encerrada em {dataBR(v.garantiaFim)}</p>
                </div>
                <Badge className="border border-slate-200 bg-slate-500/15 text-slate-700">Encerrada</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ShowroomPanel({ stockVehicles, expenseByPlate }: { stockVehicles: Vehicle[]; expenseByPlate: (plate: string) => number }) {
  const [shareMessage, setShareMessage] = useState("");
  const ordered = [...stockVehicles].sort((a, b) => a.marca.localeCompare(b.marca, "pt-BR") || a.modelo.localeCompare(b.modelo, "pt-BR"));

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#mostruario`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Link do mostruário copiado.");
      setTimeout(() => setShareMessage(""), 2500);
    } catch {
      setShareMessage("Não foi possível copiar automaticamente.");
      setTimeout(() => setShareMessage(""), 2500);
    }
  };

  return (
    <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Mostruário Auto Prime</CardTitle>
          <CardDescription>Visão pronta para consulta rápida e uso comercial.</CardDescription>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <Button data-testid="button-share-showroom" onClick={handleShare} className="rounded-2xl bg-blue-600 hover:bg-blue-700">
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar mostruário
          </Button>
          {shareMessage && <span className="text-sm text-slate-500">{shareMessage}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <FileSpreadsheet className="h-4 w-4" /> Base ordenada por marca e apenas com carros em estoque
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((v) => {
            const custoAtual = Number(v.compra || 0) + expenseByPlate(v.placa);
            const lucroPrevisto = Number(v.vendaPrevista || 0) - custoAtual;
            const margem = custoAtual > 0 ? (lucroPrevisto / custoAtual) * 100 : 0;
            const patioDias = diffDays(v.dataCompra);
            const telefone = String(v.telefoneAnuncio || "").replace(/\D/g, "");
            const whatsappHref = `https://wa.me/55${telefone}?text=${encodeURIComponent(`Olá! Tenho interesse no ${v.marca} ${v.modelo} (${v.placa}).`)}`;

            return (
              <div key={v.id} data-testid={`showroom-card-${v.id}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/60">
                <div className="mb-4 flex h-32 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Car className="h-14 w-14" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-slate-950">{v.marca} {v.modelo}</p>
                    <Badge className={`${patioBadge(patioDias)} rounded-xl px-2 py-0.5 text-xs`}>{patioDias}d</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{v.ano} • {Number(v.km || 0).toLocaleString("pt-BR")} km • {v.cor}</p>
                  <p className="text-sm text-slate-500">{v.cambio} • {v.combustivel} • {v.completo}</p>
                  <p className="text-sm text-slate-400">{v.placa}</p>
                </div>
                <div className="mt-4 border-t pt-4">
                  <p className="text-2xl font-bold text-slate-950">{currency(v.vendaPrevista)}</p>
                  <p className="mt-1 text-sm text-emerald-600">Margem: {margem.toFixed(1)}%</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-2xl border border-slate-200 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        {ordered.length === 0 && (
          <div className="py-12 text-center text-slate-500">Nenhum veículo em estoque para exibir.</div>
        )}
      </CardContent>
    </Card>
  );
}

// Gastos com carros: despesas dos veículos por mês (data da despesa), separadas em Em estoque × Pós-venda
type FiltroDono = "todos" | "loja" | "consignados";
function CarSpendingPanel({
  expenses, vehicles, onOpenVehicle,
}: {
  expenses: Expense[];
  vehicles: Vehicle[];
  onOpenVehicle: (v: Vehicle) => void;
}) {
  const porId = useMemo(() => new Map(vehicles.map((v) => [Number(v.id), v])), [vehicles]);
  const [filtro, setFiltro] = useState<FiltroDono>("todos");

  // Cada despesa com o carro, a fase e a categoria de análise
  const itens = useMemo(() => expenses
    .map((e) => {
      const v = porId.get(Number(e.veiculoId));
      return { e, v, mes: monthKey(e.data), fase: faseDaDespesa(e, v), cat: categoriaGasto(e.categoria), valor: Number(e.valor || 0) };
    })
    .filter((x) => x.mes && x.mes !== "sem-data")
    .filter((x) => filtro === "todos" || (filtro === "loja" ? grupoDaOrigem(x.v?.origem) === "loja" : grupoDaOrigem(x.v?.origem) !== "loja")),
  [expenses, porId, filtro]);

  const meses = useMemo(() => {
    const set = new Set(expenses.map((e) => monthKey(e.data)).filter((k) => k && k !== "sem-data"));
    set.add(monthKey(todayISO()));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [expenses]);
  const [mes, setMes] = useState(monthKey(todayISO()));

  const doMes = itens.filter((x) => x.mes === mes);
  const soma = (lista: typeof itens) => lista.reduce((a, x) => a + x.valor, 0);
  const total = soma(doMes);
  const emEstoque = doMes.filter((x) => x.fase === "Em estoque");
  const custoVenda = doMes.filter((x) => x.fase === "Custo da venda");
  const posVenda = doMes.filter((x) => x.fase === "Pós-venda");
  const carrosNoMes = new Set(doMes.map((x) => x.e.veiculoId)).size;
  const carrosPos = new Set(posVenda.map((x) => x.e.veiculoId)).size;

  // Comparação com a média dos 3 meses anteriores
  const anteriores = [mesAnterior(mes), mesAnterior(mesAnterior(mes)), mesAnterior(mesAnterior(mesAnterior(mes)))];
  const mediaAnterior = anteriores.reduce((a, m) => a + soma(itens.filter((x) => x.mes === m)), 0) / 3;
  const variacao = mediaAnterior > 0 ? ((total - mediaAnterior) / mediaAnterior) * 100 : null;

  // Por categoria (maior para menor), com a divisão estoque × pós-venda
  const categorias = [...new Set(doMes.map((x) => x.cat))]
    .map((cat) => {
      const daCat = doMes.filter((x) => x.cat === cat);
      return { cat, total: soma(daCat), estoque: soma(daCat.filter((x) => x.fase === "Em estoque")), venda: soma(daCat.filter((x) => x.fase === "Custo da venda")), pos: soma(daCat.filter((x) => x.fase === "Pós-venda")), qtd: daCat.length };
    })
    .sort((a, b) => b.total - a.total);
  const maiorCat = categorias[0]?.total || 1;

  // Últimos 12 meses até o mês escolhido
  const ultimos: string[] = [];
  let m = mes;
  for (let i = 0; i < 12; i++) { ultimos.unshift(m); m = mesAnterior(m); }
  const serie = ultimos.map((mm) => {
    const doM = itens.filter((x) => x.mes === mm);
    return { mes: mm, estoque: soma(doM.filter((x) => x.fase === "Em estoque")), venda: soma(doM.filter((x) => x.fase === "Custo da venda")), pos: soma(doM.filter((x) => x.fase === "Pós-venda")) };
  });
  const maiorMes = Math.max(1, ...serie.map((x) => x.estoque + x.venda + x.pos));
  const mesCurto = (mm: string) => {
    const [a, n] = mm.split("-");
    return `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(n) - 1]}/${a.slice(2)}`;
  };

  // Carros que mais gastaram no mês
  const porCarro = [...new Set(doMes.map((x) => x.e.veiculoId))]
    .map((id) => {
      const doCarro = doMes.filter((x) => x.e.veiculoId === id);
      return { v: doCarro[0].v, placa: doCarro[0].e.placa, total: soma(doCarro), pos: soma(doCarro.filter((x) => x.fase === "Pós-venda")), qtd: doCarro.length };
    })
    .sort((a, b) => b.total - a.total);

  const pct = (parte: number) => (total ? Math.round((parte / total) * 100) : 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 bg-blue-50 shadow-md shadow-slate-200/60 ring-2 ring-blue-300">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Gastos com carros</p>
            <p className="text-lg font-semibold text-slate-900">{monthLabel(mes)} • {currency(total)}</p>
            <p className="text-xs text-slate-500">Despesas lançadas nos carros, pela data da despesa. Depois da venda: conserto = pós-venda; comissão, cartório, transferência etc. = custo da venda.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex rounded-2xl border border-blue-200 bg-white p-1 text-sm font-medium">
              {([["todos", "Todos"], ["loja", "Só da loja"], ["consignados", "Consignados"]] as const).map(([k, rot]) => (
                <button key={k} type="button" onClick={() => setFiltro(k)} className={`rounded-xl px-3 py-1.5 transition ${filtro === k ? "bg-blue-600 text-white" : "text-slate-600 hover:text-blue-700"}`}>{rot}</button>
              ))}
            </div>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-full rounded-2xl border-blue-300 bg-white sm:w-[220px]" data-testid="select-spending-month"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {meses.map((mm) => <SelectItem key={mm} value={mm}>{monthLabel(mm)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60"><CardContent className="p-5">
          <p className="text-sm text-slate-500">Total gasto no mês</p>
          <p className="mt-1 text-2xl font-bold">{currency(total)}</p>
          <p className="text-xs text-slate-500">
            {doMes.length} lançamento(s) em {carrosNoMes} carro(s) • média {currency(carrosNoMes ? total / carrosNoMes : 0)} por carro
            {variacao !== null && <span className={variacao > 0 ? "text-red-600" : "text-emerald-600"}> • {variacao > 0 ? "+" : ""}{Math.round(variacao)}% vs média dos 3 meses anteriores</span>}
          </p>
        </CardContent></Card>
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60"><CardContent className="p-5">
          <p className="text-sm text-slate-500">Em estoque</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{currency(soma(emEstoque))}</p>
          <p className="text-xs text-slate-500">{pct(soma(emEstoque))}% do mês • preparação e manutenção no pátio</p>
        </CardContent></Card>
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60"><CardContent className="p-5">
          <p className="text-sm text-slate-500">Pós-venda</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{currency(soma(posVenda))}</p>
          <p className="text-xs text-slate-500">{pct(soma(posVenda))}% do mês • consertos em {carrosPos} carro(s) já vendido(s)</p>
        </CardContent></Card>
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60"><CardContent className="p-5">
          <p className="text-sm text-slate-500">Custo da venda</p>
          <p className="mt-1 text-2xl font-bold text-violet-700">{currency(soma(custoVenda))}</p>
          <p className="text-xs text-slate-500">{pct(soma(custoVenda))}% do mês • comissão, cartório, transferência e outros depois da venda</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardHeader>
            <CardTitle>Onde mais gastamos</CardTitle>
            <CardDescription>Por categoria, em {monthLabel(mes)}. <span className="text-blue-700">Azul</span> = em estoque, <span className="text-violet-700">roxo</span> = custo da venda, <span className="text-orange-600">laranja</span> = pós-venda. Oficina e Mecânica somadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorias.length === 0 && <p className="text-sm text-slate-500">Nenhuma despesa de carro lançada neste mês.</p>}
            {categorias.map((c) => (
              <div key={c.cat}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{c.cat} <span className="text-xs font-normal text-slate-400">({c.qtd})</span></span>
                  <span className="font-semibold tabular-nums">{currency(c.total)} <span className="text-xs font-normal text-slate-400">{pct(c.total)}%</span></span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" style={{ width: `${Math.max(4, (c.total / maiorCat) * 100)}%` }}>
                  <div className="h-full bg-blue-600" style={{ width: `${(c.estoque / c.total) * 100}%` }} />
                  <div className="h-full bg-violet-500" style={{ width: `${(c.venda / c.total) * 100}%` }} />
                  <div className="h-full bg-orange-500" style={{ width: `${(c.pos / c.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardHeader>
            <CardTitle>Evolução — últimos 12 meses</CardTitle>
            <CardDescription>Total gasto por mês. Toque numa barra para ver o mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 items-end gap-1.5">
              {serie.map((x) => {
                const tot = x.estoque + x.venda + x.pos;
                return (
                  <button key={x.mes} type="button" onClick={() => setMes(x.mes)} title={`${monthLabel(x.mes)}: ${currency(tot)} (estoque ${currency(x.estoque)}, custo da venda ${currency(x.venda)}, pós-venda ${currency(x.pos)})`}
                    className={`group flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg ${x.mes === mes ? "bg-blue-50" : ""}`}>
                    <span className="text-[10px] tabular-nums text-slate-500">{tot ? `${Math.round(tot / 1000)}k` : ""}</span>
                    <div className="flex w-full max-w-[34px] flex-col justify-end overflow-hidden rounded-t-md" style={{ height: `${(tot / maiorMes) * 80}%` }}>
                      <div className="w-full bg-orange-500" style={{ height: `${tot ? (x.pos / tot) * 100 : 0}%` }} />
                      <div className="w-full bg-violet-500" style={{ height: `${tot ? (x.venda / tot) * 100 : 0}%` }} />
                      <div className={`w-full flex-1 ${x.mes === mes ? "bg-blue-700" : "bg-blue-500 group-hover:bg-blue-600"}`} />
                    </div>
                    <span className={`text-[10px] ${x.mes === mes ? "font-bold text-blue-700" : "text-slate-500"}`}>{mesCurto(x.mes)}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardHeader>
            <CardTitle>Pós-venda do mês</CardTitle>
            <CardDescription>Consertos em carros já vendidos (garantia). Nos consignados, metade sai da parte da loja e metade da parte do proprietário.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {posVenda.length === 0 && <p className="text-sm text-slate-500">Nenhum conserto de pós-venda neste mês.</p>}
            {[...posVenda].sort((a, b) => b.valor - a.valor).map((x) => (
              <button key={x.e.id} type="button" onClick={() => x.v && onOpenVehicle(x.v)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-3 text-left hover:border-orange-300">
                <div className="min-w-0">
                  <p className="font-semibold">{x.v ? `${x.v.marca} ${x.v.modelo}` : x.e.placa} <span className="text-xs font-normal text-slate-500">{x.e.placa}</span></p>
                  <p className="text-xs text-slate-500">
                    {x.e.categoria}{x.e.descricao ? ` — ${x.e.descricao}` : ""} • {formatDateBR(x.e.data)}
                    {x.v?.dataVenda ? ` • ${diffDays(x.v.dataVenda, x.e.data)} dias após a venda` : ""}
                    {x.v && grupoDaOrigem(x.v.origem) !== "loja" ? ` • ${x.v.origem}` : ""}
                  </p>
                </div>
                <p className="font-semibold text-orange-600 tabular-nums">{currency(x.valor)}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardHeader>
            <CardTitle>Carros que mais gastaram no mês</CardTitle>
            <CardDescription>Toque no carro para abrir a ficha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {porCarro.length === 0 && <p className="text-sm text-slate-500">Nenhum gasto neste mês.</p>}
            {porCarro.slice(0, 10).map((c, i) => (
              <button key={c.placa + i} type="button" onClick={() => c.v && onOpenVehicle(c.v)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-300">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.v ? `${c.v.marca} ${c.v.modelo}` : c.placa}</p>
                    <p className="text-xs text-slate-500">{c.placa} • {c.qtd} lançamento(s){c.v ? ` • ${c.v.status}` : ""}{c.pos ? ` • pós-venda ${currency(c.pos)}` : ""}</p>
                  </div>
                </div>
                <p className="font-semibold tabular-nums">{currency(c.total)}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Resultado do mês: vendidos, lucro e divisão entre a loja e os proprietários
type DivisaoLucro = Record<GrupoLucro, number>;
const divisaoVazia = (): DivisaoLucro => ({ loja: 0, carlesci: 0, givaldo: 0, outros: 0, definir: 0 });

// Próprio/Troca: 100% loja. Consignado com lucro: 50/50. Consignado com prejuízo: tudo do proprietário.
// "A definir": consignado sem proprietário escolhido (o lucro todo fica separado até corrigir).
// Pós-venda de consignado (despesa com data depois da venda): 50% sai da parte da loja e 50% da parte do proprietário.
// "lucro" já vem com todas as despesas descontadas (inclusive pós-venda); "posVenda" é só a parte depois da venda.
function dividirLucro(grupo: GrupoLucro, lucro: number, posVenda = 0): DivisaoLucro {
  const d = divisaoVazia();
  if (grupo === "loja" || grupo === "definir") { d[grupo] = lucro; return d; }
  const base = lucro + posVenda; // lucro até a entrega do carro
  if (base > 0) { d.loja = base / 2; d[grupo] = base / 2; }
  else d[grupo] = base;
  d.loja -= posVenda / 2;
  d[grupo] -= posVenda / 2;
  return d;
}

// Fase da despesa:
// - "Em estoque": até a data da venda (ou carro ainda no pátio)
// - "Pós-venda": conserto depois da venda (garantia) — Mecânica/Oficina, Funilaria, Elétrica, Pneus, Troca de óleo, Acessórios
// - "Custo da venda": demais gastos depois da venda (comissão, cartório, transferência, vistoria, tanque cheio, lavagem...)
// Nos consignados, só o "Pós-venda" é dividido 50/50; o custo da venda continua por conta do proprietário.
type FaseDespesa = "Em estoque" | "Custo da venda" | "Pós-venda";
const CATEGORIAS_CONSERTO = ["Mecânica", "Oficina", "Funilaria", "Elétrica", "Pneus", "Troca de óleo", "Acessórios"];
const faseDaDespesa = (e: Expense, v?: Vehicle): FaseDespesa => {
  const depoisDaVenda = v && v.status === "Vendido" && v.dataVenda && (e.data || "").slice(0, 10) > v.dataVenda.slice(0, 10);
  if (!depoisDaVenda) return "Em estoque";
  return CATEGORIAS_CONSERTO.includes(e.categoria) ? "Pós-venda" : "Custo da venda";
};
// Na análise de gastos, "Oficina" e "Mecânica" contam juntas
const categoriaGasto = (c: string) => (c === "Oficina" ? "Mecânica" : c || "Outros");

const COR_GRUPO: Record<GrupoLucro, string> = {
  loja: "bg-blue-600", carlesci: "bg-violet-600", givaldo: "bg-teal-600", outros: "bg-slate-500", definir: "bg-amber-500",
};

// Extrato de um proprietário no mês: carros vendidos, parte no lucro e repasse
// O proprietário paga as despesas, então o repasse = venda − parte da loja (= valor do carro + despesas + parte dele)
function OwnerStatement({
  dono, mes, linhas, emEstoque, onClose,
}: {
  dono: GrupoLucro;
  mes: string;
  linhas: { v: Vehicle; lucro: number; parte: number; valor: number; despesas: number; posVenda: number }[];
  emEstoque: Vehicle[];
  onClose?: () => void;
}) {
  const [aviso, setAviso] = useState("");
  const ordenadas = [...linhas].sort((a, b) => (a.v.dataVenda || "").localeCompare(b.v.dataVenda || ""));
  // Repasse = valor do carro + despesas pagas pelo proprietário (antes da venda) + parte dele no lucro.
  // O pós-venda é pago pela loja e já está descontado 50/50 no lucro de cada um.
  const repasse = (l: { v: Vehicle; despesas: number; parte: number }) => Number(l.v.compra || 0) + l.despesas + l.parte;
  const temPosVenda = linhas.some((l) => l.posVenda > 0);
  const soma = (f: (l: (typeof linhas)[number]) => number) => ordenadas.reduce((a, l) => a + f(l), 0);
  const nome = NOME_GRUPO[dono];

  // Gera o PDF do extrato e baixa o arquivo (bibliotecas carregadas só quando o botão é usado)
  const [gerando, setGerando] = useState(false);
  const gerarPdf = async () => {
    setGerando(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      // Fontes padrão do PDF: troca espaço especial do R$ e símbolos fora do padrão
      const t = (x: string) => x.replace(/\u00a0|\u202f/g, " ").replace(/[—–]/g, "-").replace(/•/g, "|");
      const brl = (n: number) => t(currency(n));
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const largura = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Auto Prime Multimarcas", 14, 16);
      doc.setFontSize(13);
      doc.text(t(`Extrato - ${nome}`), 14, 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(t(`${monthLabel(mes)} | ${ordenadas.length} ${ordenadas.length === 1 ? "carro vendido" : "carros vendidos"}`), 14, 30);
      doc.text(t(`Gerado em ${formatDateBR(todayISO())}`), largura - 14, 16, { align: "right" });
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 36,
        head: [["Carro", "Placa", "Venda em", "Venda", "Valor do carro", "Despesas", "Pós-venda", "Lucro", "Parte do proprietário", "Repasse"]],
        body: ordenadas.map((l) => [
          t(`${l.v.marca} ${l.v.modelo}`), l.v.placa, formatDateBR(l.v.dataVenda),
          brl(l.valor), brl(Number(l.v.compra || 0)), brl(l.despesas), brl(l.posVenda), brl(l.lucro), brl(l.parte), brl(repasse(l)),
        ]),
        foot: [["Total", "", "", brl(soma((l) => l.valor)), brl(soma((l) => Number(l.v.compra || 0))), brl(soma((l) => l.despesas)),
          brl(soma((l) => l.posVenda)), brl(soma((l) => l.lucro)), brl(soma((l) => l.parte)), brl(soma(repasse))]],
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
        columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right", fontStyle: "bold" } },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let y = ((doc as any).lastAutoTable?.finalY || 40) + 8;
      doc.setFontSize(9);
      doc.setTextColor(90);
      const notas = [
        "Repasse = valor do carro + despesas pagas pelo proprietário (antes da venda) + parte dele no lucro.",
        "Lucro = venda - valor do carro - despesas - pós-venda. Até a venda: com lucro, 50% para a loja e 50% para o proprietário; com prejuízo, o valor fica com o proprietário.",
        "Pós-venda (gastos depois da venda, pagos pela loja): 50% descontado da parte da loja e 50% da parte do proprietário.",
      ];
      if (emEstoque.length) notas.push(`Em estoque: ${emEstoque.map((v) => `${v.modelo} (${v.placa})`).join(", ")}`);
      notas.forEach((n) => {
        const linhasTexto = doc.splitTextToSize(t(n), largura - 28);
        doc.text(linhasTexto, 14, y);
        y += linhasTexto.length * 4.5;
      });

      const arquivo = `extrato-${nome}-${mes}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
      doc.save(`${arquivo}.pdf`);
      setAviso("PDF gerado. Confira a pasta de downloads.");
    } catch (error) {
      console.error(error);
      setAviso("Não foi possível gerar o PDF. Tente de novo.");
    } finally {
      setGerando(false);
      setTimeout(() => setAviso(""), 4000);
    }
  };

  return (
    <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60 ring-2 ring-blue-200" data-testid="owner-statement">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Extrato — {nome}</CardTitle>
            <CardDescription>
              <span>{monthLabel(mes)}</span> • {ordenadas.length} {ordenadas.length === 1 ? "carro vendido" : "carros vendidos"} • {emEstoque.length} em estoque
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {aviso && <span className="text-sm font-medium text-emerald-700">{aviso}</span>}
            <Button onClick={gerarPdf} disabled={ordenadas.length === 0 || gerando} className="rounded-2xl bg-blue-600 hover:bg-blue-700" data-testid="button-statement-pdf">{gerando ? "Gerando PDF..." : "Gerar PDF"}</Button>
            {onClose && <Button variant="outline" onClick={onClose} className="rounded-2xl">Fechar</Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ordenadas.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum carro de {nome} vendido neste mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs text-slate-500">
                  <th className="py-2 pr-2 text-left font-semibold">Carro</th>
                  <th className="px-2 py-2 font-semibold">Venda</th>
                  <th className="px-2 py-2 font-semibold">Valor do carro</th>
                  <th className="px-2 py-2 font-semibold">Despesas</th>
                  {temPosVenda && <th className="px-2 py-2 font-semibold">Pós-venda</th>}
                  <th className="px-2 py-2 font-semibold">Lucro</th>
                  <th className="px-2 py-2 font-semibold">Parte do proprietário</th>
                  <th className="py-2 pl-2 font-semibold">Repasse</th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((l) => (
                  <tr key={l.v.id} className="border-b text-right tabular-nums">
                    <td className="py-2 pr-2 text-left">
                      <p className="font-semibold">{l.v.marca} {l.v.modelo}</p>
                      <p className="text-xs text-slate-500">{l.v.placa} • vendido em {formatDateBR(l.v.dataVenda)}</p>
                    </td>
                    <td className="px-2 py-2">{currency(l.valor)}</td>
                    <td className="px-2 py-2">{currency(l.v.compra)}</td>
                    <td className="px-2 py-2">{currency(l.despesas)}</td>
                    {temPosVenda && <td className="px-2 py-2 text-orange-600">{l.posVenda ? currency(l.posVenda) : "—"}</td>}
                    <td className={`px-2 py-2 ${l.lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}>{currency(l.lucro)}</td>
                    <td className="px-2 py-2">{currency(l.parte)}</td>
                    <td className="py-2 pl-2 font-bold">{currency(repasse(l))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-right font-bold tabular-nums">
                  <td className="py-2 pr-2 text-left">Total</td>
                  <td className="px-2 py-2">{currency(soma((l) => l.valor))}</td>
                  <td className="px-2 py-2">{currency(soma((l) => Number(l.v.compra || 0)))}</td>
                  <td className="px-2 py-2">{currency(soma((l) => l.despesas))}</td>
                  {temPosVenda && <td className="px-2 py-2">{currency(soma((l) => l.posVenda))}</td>}
                  <td className="px-2 py-2">{currency(soma((l) => l.lucro))}</td>
                  <td className="px-2 py-2">{currency(soma((l) => l.parte))}</td>
                  <td className="py-2 pl-2">{currency(soma(repasse))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Repasse = valor do carro + despesas pagas pelo proprietário (antes da venda) + parte dele no lucro. As despesas saem do lucro antes da divisão; com prejuízo até a venda, a loja não fica com nada. Pós-venda (gasto depois da venda, pago pela loja): metade sai da parte da loja e metade da parte do proprietário.
        </p>
        {emEstoque.length > 0 && (
          <p className="text-xs text-slate-500"><strong>Em estoque:</strong> {emEstoque.map((v) => `${v.modelo} (${v.placa})`).join(", ")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultPanel({
  vehicles, custoVeiculo, posVendaVeiculo, onEditVehicle, onOpenVehicle, custos, statusCustos,
}: {
  custos: CustoOperacional[];
  statusCustos: StatusCustos;
  vehicles: Vehicle[];
  custoVeiculo: (v: Vehicle) => number;
  posVendaVeiculo: (v: Vehicle) => number;
  onEditVehicle: (v: Vehicle) => void;
  onOpenVehicle: (v: Vehicle) => void;
}) {
  const vendidos = useMemo(() => vehicles.filter((v) => v.status === "Vendido" && v.dataVenda), [vehicles]);
  const meses = useMemo(
    () => [...new Set([...vendidos.map((v) => monthKey(v.dataVenda)), ...custos.map((c) => c.competencia)])].sort((a, b) => b.localeCompare(a)),
    [vendidos, custos],
  );
  const mesAtual = monthKey(todayISO());
  const [mes, setMes] = useState(meses.includes(mesAtual) ? mesAtual : meses[0] || "todos");
  const [dono, setDono] = useState<GrupoLucro | null>(null);

  const doMes = vendidos
    .filter((v) => mes === "todos" || monthKey(v.dataVenda) === mes)
    .sort((a, b) => (b.dataVenda || "").localeCompare(a.dataVenda || ""));

  const valorVenda = (v: Vehicle) => Number(v.valorVenda ?? v.vendaPrevista ?? 0);
  const linhas = doMes.map((v) => {
    const grupo = grupoDaOrigem(v.origem);
    const lucro = valorVenda(v) - custoVeiculo(v);
    const posVenda = posVendaVeiculo(v);
    return { v, grupo, lucro, posVenda, div: dividirLucro(grupo, lucro, posVenda) };
  });
  const total = divisaoVazia();
  linhas.forEach(({ div }) => (Object.keys(total) as GrupoLucro[]).forEach((k) => { total[k] += div[k]; }));
  const lucroTotal = linhas.reduce((a, l) => a + l.lucro, 0);
  const faturamento = doMes.reduce((a, v) => a + valorVenda(v), 0);

  // Carros (de todos os meses, inclusive em estoque) com proprietário a conferir
  const aConferir = vehicles
    .map((v) => {
      const grupo = grupoDaOrigem(v.origem);
      const pista = pistaProprietario(v);
      if (grupo === "definir") return { v, motivo: `Origem "${v.origem || "vazia"}", sem proprietário definido`, sugestao: pista || "Consignado (outros)" };
      if (pista && v.origem !== pista) return { v, motivo: `Origem "${v.origem}", mas a observação cita ${pista.replace("Consignado ", "")}`, sugestao: pista };
      return null;
    })
    .filter(Boolean) as { v: Vehicle; motivo: string; sugestao: string }[];

  const grupos: GrupoLucro[] = ["loja", "carlesci", "givaldo", "outros", ...(total.definir !== 0 ? ["definir" as GrupoLucro] : [])];
  const subtitulo: Record<GrupoLucro, string> = {
    loja: "Próprios e trocas + 50% dos consignados",
    carlesci: "50% do lucro dos carros da família",
    givaldo: "50% do lucro dos carros do Givaldo",
    outros: "50% do lucro dos demais consignados",
    definir: "Consignados sem proprietário escolhido",
  };
  const positivos = grupos.map((g) => [g, Math.max(0, total[g])] as [GrupoLucro, number]);
  const somaPos = positivos.reduce((a, [, x]) => a + x, 0) || 1;

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 bg-blue-50 shadow-md shadow-slate-200/60 ring-2 ring-blue-300">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Resultado do mês</p>
            <p className="text-lg font-semibold text-slate-900">{monthLabel(mes)}</p>
            <p className="text-xs text-slate-500">Vendas pela data da venda e divisão do lucro entre a loja e os proprietários.</p>
          </div>
          <div className="w-full md:w-[280px]">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="rounded-2xl border-blue-300 bg-white" data-testid="select-result-month"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {["todos", ...meses].map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {aConferir.length > 0 && (
        <Card className="rounded-3xl border-0 bg-amber-50 shadow-md shadow-slate-200/60 ring-2 ring-amber-300" data-testid="owner-issues">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              {aConferir.length === 1 ? "1 carro com proprietário a conferir" : `${aConferir.length} carros com proprietário a conferir`}
            </div>
            <p className="text-sm text-amber-800">Toque no carro para abrir o cadastro e escolher a origem certa. A lista vale para todos os meses e inclui carros em estoque.</p>
            <div className="space-y-2">
              {aConferir.map(({ v, motivo, sugestao }) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onEditVehicle(v)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-white p-3 text-left transition hover:border-blue-400"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {v.placa} <span className="font-normal">{v.marca} {v.modelo}</span>
                      {v.status !== "Vendido" && <span className="ml-1 text-xs text-slate-500">(em estoque)</span>}
                    </p>
                    <p className="text-sm text-slate-500">{motivo}</p>
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      Sugestão: {sugestao.replace("Consignado ", "")}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">Corrigir ›</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Resumo</p>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Carros vendidos" value={doMes.length} subtitle="Pela data da venda" icon={CheckCircle2} />
          <StatCard title="Total vendido" value={currency(faturamento)} subtitle="Faturamento das vendas" icon={DollarSign} />
          <StatCard title="Lucro de todos os carros" value={currency(lucroTotal)} subtitle="Venda menos compra e despesas" icon={CircleDollarSign} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Divisão do lucro</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {grupos.map((g) => {
            const clicavel = g === "carlesci" || g === "givaldo" || g === "outros";
            const conteudo = (
              <Card className={`h-full rounded-3xl border-0 shadow-md shadow-slate-200/60 ${clicavel ? "transition hover:ring-2 hover:ring-blue-300" : ""} ${dono === g ? "ring-2 ring-blue-500" : ""}`} data-testid={`split-${g}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><span className={`h-2.5 w-2.5 rounded-full ${COR_GRUPO[g]}`} />{NOME_GRUPO[g]}</div>
                  <p className={`mt-2 text-2xl font-bold ${total[g] < 0 ? "text-red-600" : "text-slate-950"}`}>{currency(total[g])}</p>
                  <p className="mt-1 text-xs text-slate-500">{subtitulo[g]}</p>
                  {clicavel && <p className="mt-2 text-xs font-semibold text-blue-600">{dono === g ? "Fechar extrato ▲" : "Ver extrato ▼"}</p>}
                </CardContent>
              </Card>
            );
            return clicavel ? (
              <button key={g} type="button" className="text-left" aria-expanded={dono === g} onClick={() => setDono(dono === g ? null : g)}>{conteudo}</button>
            ) : <div key={g}>{conteudo}</div>;
          })}
        </div>
        <Card className="mt-4 rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardContent className="p-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Divisão do lucro">
              {positivos.map(([g, x]) => <div key={g} className={COR_GRUPO[g]} style={{ width: `${(x / somaPos) * 100}%` }} title={NOME_GRUPO[g]} />)}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {positivos.map(([g, x]) => (
                <span key={g} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${COR_GRUPO[g]}`} />{NOME_GRUPO[g]} {Math.round((x / somaPos) * 100)}%</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <StoreResultCard mes={mes} faturamento={faturamento} lucroLoja={total.loja} custos={custos} status={statusCustos} />

      {dono && (
        <OwnerStatement
          dono={dono}
          mes={mes}
          linhas={linhas.filter((l) => l.grupo === dono).map((l) => ({ v: l.v, lucro: l.lucro, parte: l.div[dono], valor: valorVenda(l.v), despesas: custoVeiculo(l.v) - Number(l.v.compra || 0) - l.posVenda, posVenda: l.posVenda }))}
          emEstoque={vehicles.filter((v) => v.status !== "Vendido" && grupoDaOrigem(v.origem) === dono)}
          onClose={() => setDono(null)}
        />
      )}

      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader>
          <CardTitle>Carros vendidos no mês</CardTitle>
          <CardDescription>Consignado com lucro: metade da loja, metade do proprietário. Com prejuízo, a loja fica com R$ 0. Toque no carro para abrir a ficha.</CardDescription>
        </CardHeader>
        <CardContent>
          {linhas.length === 0 && <p className="text-sm text-slate-500">Nenhum carro vendido neste mês.</p>}
          <div className="space-y-3">
            {linhas.map(({ v, grupo, lucro, div }) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onOpenVehicle(v)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {v.marca} {v.modelo}
                    <span className={`ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-xs font-semibold text-white ${COR_GRUPO[grupo]}`}>{v.origem}</span>
                  </p>
                  <p className="text-sm text-slate-500">{v.placa} • vendido em {formatDateBR(v.dataVenda)} por {currency(valorVenda(v))}</p>
                  <p className="text-sm text-slate-500">
                    {(Object.keys(div) as GrupoLucro[]).filter((k) => div[k] !== 0).map((k) => `${NOME_GRUPO[k]} ${currency(div[k])}`).join(" • ") || "Sem lucro"}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}>{currency(lucro)}</p>
                  <p className="text-xs text-slate-500">{lucro >= 0 ? "lucro do carro" : "prejuízo"}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const mesAnterior = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Opções de mês: dos lançamentos existentes + últimos 12 meses + próximo mês
function opcoesDeMes(mesesComDados: string[]) {
  const atual = monthKey(todayISO());
  const set = new Set(mesesComDados);
  let m = atual;
  for (let i = 0; i < 24; i++) { set.add(m); m = mesAnterior(m); }
  const [a, mm] = atual.split("-").map(Number);
  const prox = new Date(a, mm, 1);
  set.add(`${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}`);
  return [...set].sort((x, y) => y.localeCompare(x));
}

function SqlSetupCard({ status }: { status: StatusCustos }) {
  return (
    <Card className="rounded-3xl border-0 bg-amber-50 shadow-md shadow-slate-200/60 ring-2 ring-amber-300" data-testid="costs-setup">
      <CardContent className="space-y-2 p-5 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5" />
          {status === "faltando" ? "A tabela de despesas operacionais ainda não foi criada no banco" : "Não foi possível ler as despesas operacionais"}
        </p>
        {status === "faltando" ? (
          <p>Esta tela precisa de uma tabela nova no Supabase. É só um acréscimo, que não mexe nos dados existentes. O script está no repositório em <code>supabase/custos_operacionais.sql</code>: abra o projeto no Supabase, vá em <strong>SQL Editor</strong>, cole o script e clique em <strong>Run</strong>.</p>
        ) : (
          <p>Verifique a internet e recarregue a página. Se continuar, confira se o script <code>supabase/custos_operacionais.sql</code> foi executado no Supabase.</p>
        )}
      </CardContent>
    </Card>
  );
}

function OperatingCostsPanel({
  custos, status, onReload,
}: {
  custos: CustoOperacional[];
  status: StatusCustos;
  onReload: () => Promise<void>;
}) {
  const meses = useMemo(() => opcoesDeMes(custos.map((c) => c.competencia)), [custos]);
  const [mes, setMes] = useState(monthKey(todayISO()));
  const vazioDe = (competencia: string) => ({ competencia, categoria: "Aluguel", descricao: "", valor: "", data_pagamento: "" });
  const vazio = vazioDe(mes);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<CustoOperacional | null>(null);
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const doMes = custos.filter((c) => c.competencia === mes);
  const total = doMes.reduce((a, c) => a + Number(c.valor || 0), 0);
  const porGrupo = GRUPOS_DESPESA_OPERACIONAL.map(({ grupo }) => ({
    grupo, valor: doMes.filter((c) => grupoDespesaOperacional(c.categoria) === grupo).reduce((a, c) => a + Number(c.valor || 0), 0),
  })).filter((g) => g.valor > 0);
  const doAnterior = custos.filter((c) => c.competencia === mesAnterior(mes));

  const mostrar = (msg: string) => { setAviso(msg); setTimeout(() => setAviso(""), 3500); };

  const salvar = async () => {
    if (!Number(form.valor)) { mostrar("Informe o valor."); return; }
    const competencia = form.competencia || mes;
    // Alerta (não bloqueia): pagamento em mês diferente do mês da despesa (ex.: lançamento retroativo esquecendo de trocar o mês)
    if (form.data_pagamento && monthKey(form.data_pagamento) !== competencia) {
      const ok = confirm(
        `Esta despesa vai contar em ${monthLabel(competencia)}, mas a data do pagamento é ${formatDateBR(form.data_pagamento)} (${monthLabel(monthKey(form.data_pagamento))}).\n\n` +
        `OK = manter em ${monthLabel(competencia)}\nCancelar = voltar e trocar o "Mês da despesa"`
      );
      if (!ok) return;
    }
    setSalvando(true);
    const payload = {
      competencia,
      categoria: form.categoria,
      descricao: form.descricao.trim(),
      valor: Number(form.valor),
      data_pagamento: form.data_pagamento || null,
    };
    const { error } = editando
      ? await supabase.from("custos_operacionais").update(payload).eq("id", editando.id)
      : await supabase.from("custos_operacionais").insert(payload);
    setSalvando(false);
    if (error) { console.error(error); mostrar("Não foi possível salvar. Tente de novo."); return; }
    setMes(competencia); setForm(vazioDe(competencia)); setEditando(null);
    await onReload();
    mostrar(`${editando ? "Despesa corrigida" : "Despesa lançada"} em ${monthLabel(competencia)}.`);
  };

  const excluir = async (c: CustoOperacional) => {
    if (!confirm(`Excluir "${c.categoria}${c.descricao ? ` – ${c.descricao}` : ""}" de ${currency(c.valor)} em ${monthLabel(c.competencia)}?`)) return;
    const { error } = await supabase.from("custos_operacionais").delete().eq("id", c.id);
    if (error) { console.error(error); mostrar("Não foi possível excluir."); return; }
    await onReload();
    mostrar("Despesa excluída.");
  };

  const copiarAnterior = async () => {
    if (!doAnterior.length) return;
    if (doMes.length && !confirm(`${monthLabel(mes)} já tem ${doMes.length} lançamento(s). Copiar mesmo assim os ${doAnterior.length} de ${monthLabel(mesAnterior(mes))}?`)) return;
    const linhas = doAnterior.map((c) => ({ competencia: mes, categoria: c.categoria, descricao: c.descricao, valor: c.valor, data_pagamento: null }));
    const { error } = await supabase.from("custos_operacionais").insert(linhas);
    if (error) { console.error(error); mostrar("Não foi possível copiar."); return; }
    await onReload();
    mostrar(`${linhas.length} despesas copiadas. Ajuste os valores que mudaram (ex.: energia, água).`);
  };

  if (status !== "ok") return <div className="space-y-6"><SqlSetupCard status={status} /></div>;

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 bg-blue-50 shadow-md shadow-slate-200/60 ring-2 ring-blue-300">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Despesas operacionais</p>
            <p className="text-lg font-semibold text-slate-900">{monthLabel(mes)} • {currency(total)}</p>
            <p className="text-xs text-slate-500">Custos para manter a loja funcionando, que não são de um carro específico.</p>
          </div>
          <div className="w-full md:w-[280px]">
            <Select value={mes} onValueChange={(v) => { setMes(v); setEditando(null); setForm(vazioDe(v)); }}>
              <SelectTrigger className="rounded-2xl border-blue-300 bg-white" data-testid="select-costs-month"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {meses.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {porGrupo.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {porGrupo.map((g) => (
            <Card key={g.grupo} className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">{g.grupo}</p>
                <p className="mt-1 text-xl font-bold">{currency(g.valor)}</p>
                <p className="text-xs text-slate-500">{total ? Math.round((g.valor / total) * 100) : 0}% do mês</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Card className={`rounded-3xl border-0 shadow-md shadow-slate-200/60 ${editando ? "ring-2 ring-amber-300" : ""}`}>
          <CardHeader>
            <CardTitle>{editando ? "Corrigir despesa" : "Lançar despesa"}</CardTitle>
            <CardDescription>A despesa conta no resultado do mês escolhido abaixo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mês da despesa (competência)</Label>
              <Select value={form.competencia || mes} onValueChange={(v) => setForm({ ...form, competencia: v })}>
                <SelectTrigger className="border-blue-300 font-semibold" data-testid="select-cost-competence"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {meses.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Lançando um mês passado? Troque aqui (ex.: aluguel de março lançado hoje = Março).</p>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger data-testid="select-cost-category"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-80 overflow-y-auto">
                  {GRUPOS_DESPESA_OPERACIONAL.map(({ grupo, categorias }) => (
                    <React.Fragment key={grupo}>
                      <SelectItem value={`__grupo_${grupo}`} disabled className="pl-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{grupo}</SelectItem>
                      {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: conta de setembro, salário do João" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} data-testid="input-cost-value" />
            </div>
            <div className="space-y-2">
              <Label>Data do pagamento (opcional)</Label>
              <Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
            </div>
            {aviso && <p className="text-sm font-medium text-blue-700">{aviso}</p>}
            <Button onClick={salvar} disabled={salvando} className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700" data-testid="button-save-cost">
              {salvando ? "Salvando..." : editando ? "Salvar correção" : "Lançar despesa"}
            </Button>
            {editando && <Button variant="outline" onClick={() => { setEditando(null); setForm(vazioDe(mes)); }} className="w-full rounded-2xl">Cancelar correção</Button>}
            <p className="text-xs text-slate-500">Despesas de um carro específico (lavagem, oficina, comissão da venda) continuam na tela <strong>Despesas</strong>, para não contar duas vezes.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Lançamentos de {monthLabel(mes)}</CardTitle>
                <CardDescription>{doMes.length} lançamento(s) • total {currency(total)}</CardDescription>
              </div>
              {doAnterior.length > 0 && (
                <Button variant="outline" onClick={copiarAnterior} className="rounded-2xl" data-testid="button-copy-previous">
                  Copiar de {monthLabel(mesAnterior(mes))} ({doAnterior.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {doMes.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhuma despesa lançada neste mês.{doAnterior.length > 0 ? " Use \"Copiar\" para trazer as despesas fixas do mês anterior e ajuste os valores." : ""}
              </p>
            )}
            <div className="space-y-4">
              {GRUPOS_DESPESA_OPERACIONAL.map(({ grupo }) => {
                const itens = doMes.filter((c) => grupoDespesaOperacional(c.categoria) === grupo);
                if (!itens.length) return null;
                return (
                  <div key={grupo}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{grupo}</p>
                    <div className="space-y-2">
                      {itens.map((c) => (
                        <div key={c.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${editando?.id === c.id ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
                          <div className="min-w-0">
                            <p className="font-semibold">{c.categoria}</p>
                            <p className="text-sm text-slate-500">{c.descricao || "—"}{c.data_pagamento ? ` • pago em ${formatDateBR(c.data_pagamento)}` : ""}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <p className="font-semibold text-red-500">{currency(c.valor)}</p>
                            <div className="flex gap-3 text-sm font-medium">
                              <button className="text-blue-600 hover:underline" onClick={() => { setEditando(c); setForm({ competencia: c.competencia, categoria: c.categoria, descricao: c.descricao || "", valor: String(c.valor), data_pagamento: c.data_pagamento || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Corrigir</button>
                              <button className="text-red-600 hover:underline" onClick={() => excluir(c)}>Excluir</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Resultado da loja no formato de DRE: lucro das vendas − despesas operacionais − impostos = lucro líquido
function StoreResultCard({
  mes, faturamento, lucroLoja, custos, status,
}: {
  mes: string;
  faturamento: number;
  lucroLoja: number;
  custos: CustoOperacional[];
  status: StatusCustos;
}) {
  if (status !== "ok") return <SqlSetupCard status={status} />;
  const doPeriodo = custos.filter((c) => mes === "todos" || c.competencia === mes);
  const somaGrupo = (g: string) => doPeriodo.filter((c) => grupoDespesaOperacional(c.categoria) === g).reduce((a, c) => a + Number(c.valor || 0), 0);
  const gruposOperacionais = GRUPOS_DESPESA_OPERACIONAL.map((g) => g.grupo).filter((g) => g !== "Impostos");
  const linhasOp = gruposOperacionais.map((g) => ({ g, v: somaGrupo(g) })).filter((l) => l.v > 0);
  const despesasOp = linhasOp.reduce((a, l) => a + l.v, 0);
  const resultadoOp = lucroLoja - despesasOp;
  const impostos = somaGrupo("Impostos");
  const lucroLiquido = resultadoOp - impostos;
  const margem = faturamento > 0 ? (lucroLiquido / faturamento) * 100 : 0;
  const cor = (v: number) => (v >= 0 ? "text-emerald-600" : "text-red-600");

  const Linha = ({ label, valor, forte = false, sinal = "", recuo = false, classe = "" }: { label: string; valor: number; forte?: boolean; sinal?: string; recuo?: boolean; classe?: string }) => (
    <div className={`flex items-center justify-between gap-4 py-2 ${forte ? "border-t text-base font-bold" : "text-sm"} ${recuo ? "pl-4 text-slate-500" : ""}`}>
      <span>{sinal && <span className="mr-1 text-slate-400">{sinal}</span>}{label}</span>
      <span className={`tabular-nums ${classe}`}>{currency(valor)}</span>
    </div>
  );

  return (
    <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60 ring-2 ring-emerald-200" data-testid="store-result">
      <CardHeader>
        <CardTitle>Resultado da loja</CardTitle>
        <CardDescription>{monthLabel(mes)} • lucro da loja nas vendas menos as despesas operacionais (formato de DRE)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Linha label="Lucro da loja nas vendas" valor={lucroLoja} classe={cor(lucroLoja)} />
            <Linha label="Despesas operacionais" valor={-despesasOp} sinal="(−)" />
            {linhasOp.map((l) => <Linha key={l.g} label={l.g} valor={-l.v} recuo />)}
            <Linha label="Resultado operacional" valor={resultadoOp} forte classe={cor(resultadoOp)} />
            <Linha label="Impostos" valor={-impostos} sinal="(−)" />
            <Linha label="Lucro líquido do mês" valor={lucroLiquido} forte classe={cor(lucroLiquido)} />
          </div>
          <div className="space-y-3">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Lucro líquido</p>
              <p className={`mt-1 text-3xl font-bold ${cor(lucroLiquido)}`}>{currency(lucroLiquido)}</p>
              <p className="mt-1 text-xs text-slate-500">Margem líquida de {margem.toFixed(1)}% sobre o total vendido ({currency(faturamento)})</p>
            </div>
            {doPeriodo.length === 0 && (
              <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Nenhuma despesa operacional lançada {mes === "todos" ? "" : "neste mês"}. Lance em <strong>Despesas operacionais</strong> no menu para ver o lucro real.</p>
            )}
            <p className="text-xs text-slate-500">Impostos: use os valores que o contador informar (guias pagas no mês). O sistema não calcula impostos.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Cópia de segurança: baixa todas as tabelas do banco num arquivo .json
// (permite restaurar os dados se algo for apagado ou alterado por engano)
function SettingsPanel() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [resumo, setResumo] = useState("");

  const baixarBackup = async () => {
    setStatus("loading");
    try {
      const tabelas = ["veiculos", "despesas", "vendas", "garantias"] as const;
      const dados: Record<string, unknown[]> = {};
      for (const t of tabelas) {
        const { data, error } = await supabase.from(t).select("*").order("id", { ascending: true });
        if (error) throw error;
        dados[t] = data || [];
      }
      // Despesas operacionais (tabela nova): entra na cópia se já existir no banco
      const extra = await supabase.from("custos_operacionais").select("*").order("id", { ascending: true });
      if (!extra.error) dados.custos_operacionais = extra.data || [];
      const validadas = await supabase.from("despesas_validadas").select("*");
      if (!validadas.error) dados.despesas_validadas = validadas.data || [];
      const agora = new Date();
      const carimbo = `${todayISO()}_${String(agora.getHours()).padStart(2, "0")}h${String(agora.getMinutes()).padStart(2, "0")}`;
      const conteudo = JSON.stringify({ sistema: "Auto Prime", gerado_em: agora.toISOString(), tabelas: dados }, null, 2);
      const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-autoprime_${carimbo}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setResumo(`${dados.veiculos.length} veículos, ${dados.despesas.length} despesas, ${dados.vendas.length} vendas, ${dados.garantias.length} garantias${dados.custos_operacionais ? ` e ${dados.custos_operacionais.length} despesas operacionais` : ""}.`);
      setStatus("done");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  return (
    <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
        <CardDescription>Ferramentas de segurança dos dados da loja.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-semibold">Cópia de segurança</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Baixa um arquivo com todos os veículos, despesas, vendas e garantias. Faça uma cópia antes de cada atualização do sistema
            e guarde o arquivo: com ele dá para recuperar qualquer informação apagada ou alterada por engano.
          </p>
          <Button
            data-testid="button-backup"
            onClick={baixarBackup}
            disabled={status === "loading"}
            className="mt-4 rounded-2xl bg-blue-600 hover:bg-blue-700"
          >
            {status === "loading" ? "Gerando cópia..." : "Baixar cópia de segurança"}
          </Button>
          {status === "done" && <p className="mt-3 text-sm font-medium text-emerald-700">Cópia baixada: {resumo}</p>}
          {status === "error" && <p className="mt-3 text-sm font-medium text-red-600">Não foi possível gerar a cópia. Verifique a internet e tente de novo.</p>}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-semibold">Versões do sistema</p>
          <p className="mt-1 text-sm text-slate-500">
            Versão no ar: <strong className="text-slate-900">{APP_VERSION}</strong>. Para voltar a uma versão anterior, use a lista de publicações da Vercel.
          </p>
          <div className="mt-4 space-y-3">
            {VERSION_HISTORY.map((v) => (
              <div key={v.versao} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    Versão {v.versao} <span className="font-normal text-slate-500">• {formatDateBR(v.data)}</span>
                  </p>
                  {v.versao === APP_VERSION && (
                    <Badge className="border border-emerald-200 bg-emerald-500/15 text-emerald-700">No ar</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">{v.titulo}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-500">
                  {v.itens.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnuncioPanel() {
  return (
    <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
      <CardHeader>
        <CardTitle>Anúncio</CardTitle>
        <CardDescription>Área para preparar textos e materiais de divulgação.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Estrutura pronta para evolução do módulo de anúncios da Auto Prime.
        </div>
      </CardContent>
    </Card>
  );
}


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user, setUser] = useState({ name: "Administrador Auto Prime", email: "contato@autoprime.com.br" });
  const [active, setActive] = useState("dashboard");
  const [dashboardMonth, setDashboardMonth] = useState("todos");
  const [showSoldList, setShowSoldList] = useState(false);
  const [voltarParaDashboard, setVoltarParaDashboard] = useState(false);
  const [voltarParaResultado, setVoltarParaResultado] = useState(false);
  const [expensePlatePrefill, setExpensePlatePrefill] = useState("");
  const [salePlatePrefill, setSalePlatePrefill] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [custos, setCustos] = useState<CustoOperacional[]>([]);
  const [statusCustos, setStatusCustos] = useState<StatusCustos>("ok");

  // Despesas operacionais: tabela opcional; se ainda não existir, as telas mostram como criar
  async function loadCustos() {
    const { data, error } = await supabase.from("custos_operacionais").select("*").order("competencia", { ascending: false });
    if (error) {
      const texto = `${error.code || ""} ${error.message || ""}`;
      setStatusCustos(/PGRST205|42P01|does not exist|Could not find the table/i.test(texto) ? "faltando" : "erro");
      setCustos([]);
      return;
    }
    setStatusCustos("ok");
    setCustos(((data || []) as CustoOperacional[]).map((c) => ({ ...c, valor: Number(c.valor || 0), descricao: c.descricao || "" })));
  }
  // Grupos de despesas iguais já conferidos como corretos (tabela despesas_validadas).
  // Se a tabela não existir, guarda só neste navegador.
  const [validadas, setValidadas] = useState<Set<string>>(new Set());
  const [validadasNoBanco, setValidadasNoBanco] = useState(true);
  const lerValidadasLocal = (): string[] => { try { return JSON.parse(localStorage.getItem("despesas_validadas") || "[]"); } catch { return []; } };
  async function loadValidadas() {
    const { data, error } = await supabase.from("despesas_validadas").select("assinatura");
    if (error) { setValidadasNoBanco(false); setValidadas(new Set(lerValidadasLocal())); return; }
    setValidadasNoBanco(true);
    setValidadas(new Set(((data || []) as { assinatura: string }[]).map((r) => r.assinatura)));
  }
  async function handleValidar(assinatura: string) {
    if (validadasNoBanco) {
      const { error } = await supabase.from("despesas_validadas").upsert({ assinatura });
      if (error) { alert(`Não foi possível marcar como conferida: ${error.message}`); return; }
    } else {
      try { localStorage.setItem("despesas_validadas", JSON.stringify([...new Set([...lerValidadasLocal(), assinatura])])); } catch { /* sem armazenamento */ }
    }
    setValidadas((atual) => new Set([...atual, assinatura]));
  }
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const [{ data: vehiclesRows, error: vehiclesError }, { data: expensesRows, error: expensesError }, { data: salesRows, error: salesError }, { data: warrantyRows, error: warrantyError }] = await Promise.all([
        supabase.from("veiculos").select("*").order("created_at", { ascending: false }),
        supabase.from("despesas").select("*").order("data", { ascending: false }),
        supabase.from("vendas").select("*").order("data_venda", { ascending: false }),
        supabase.from("garantias").select("*").order("data_fim", { ascending: false }),
      ]);

      if (vehiclesError) throw vehiclesError;
      if (expensesError) throw expensesError;
      if (salesError) throw salesError;
      if (warrantyError) throw warrantyError;

      const vehicleRows = (vehiclesRows || []) as VehicleRow[];
      const expenseRows = (expensesRows || []) as ExpenseRow[];
      const saleRows = (salesRows || []) as SaleRow[];
      const guaranteeRows = (warrantyRows || []) as WarrantyRow[];

      const vehicleMap = new Map<number, VehicleRow>(vehicleRows.map((row) => [row.id, row]));
      const salesMap = new Map<number, SaleRow>(saleRows.map((row) => [row.veiculo_id, row]));
      const warrantyMap = new Map<number, WarrantyRow>(guaranteeRows.map((row) => [row.veiculo_id, row]));

      setVehicles(vehicleRows.map((row) => mapVehicleRow(row, salesMap, warrantyMap)));
      setExpenses(expenseRows.map((row) => mapExpenseRow(row, vehicleMap)).filter((row) => row.placa));
      await loadCustos();
      await loadValidadas();
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar os dados do banco.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const monthOptions = useMemo(() => {
    const allKeys = [
      ...vehicles.map((v) => monthKey(v.dataCompra)),
      ...expenses.map((e) => monthKey(e.data)),
      ...vehicles.map((v) => monthKey(v.dataVenda)),
    ].filter((v, idx, arr) => v && arr.indexOf(v) === idx).sort((a, b) => b.localeCompare(a));
    return ["todos", ...allKeys];
  }, [vehicles, expenses]);

  const stockVehicles = useMemo(() => vehicles.filter((v) => v.status === "Em estoque"), [vehicles]);
  const soldVehicles = useMemo(() => vehicles.filter((v) => v.status === "Vendido"), [vehicles]);
  const expenseByPlate = (placa: string) => expenses.filter((e) => e.placa === placa).reduce((sum, e) => sum + Number(e.valor), 0);

  // Custo de cada carro = compra + TODAS as despesas dele (independente do mês da despesa)
  const custoTotalPorPlaca = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.placa, (map.get(e.placa) || 0) + Number(e.valor || 0)));
    return map;
  }, [expenses]);
  const custoVeiculo = (v: Vehicle) => Number(v.compra || 0) + (custoTotalPorPlaca.get(v.placa) || 0);
  // Pós-venda de cada carro vendido: despesas com data depois da data da venda
  const posVendaPorPlaca = useMemo(() => {
    const porId = new Map(vehicles.map((v) => [Number(v.id), v]));
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      if (faseDaDespesa(e, porId.get(Number(e.veiculoId))) === "Pós-venda") map.set(e.placa, (map.get(e.placa) || 0) + Number(e.valor || 0));
    });
    return map;
  }, [expenses, vehicles]);
  const posVendaVeiculo = (v: Vehicle) => posVendaPorPlaca.get(v.placa) || 0;
  const cadastroIncompleto = (v: Vehicle) => !Number(v.compra) || !Number(v.vendaPrevista);

  // Vendas do período: filtradas pela DATA DA VENDA
  const soldInPeriod = useMemo(() => {
    if (dashboardMonth === "todos") return soldVehicles;
    return soldVehicles.filter((v) => monthKey(v.dataVenda) === dashboardMonth);
  }, [soldVehicles, dashboardMonth]);

  const totals = useMemo(() => {
    // Estoque: sempre a foto ATUAL do pátio (o filtro de mês não se aplica)
    const completos = stockVehicles.filter((v) => !cadastroIncompleto(v));
    const valorEstoque = stockVehicles.reduce((sum, v) => sum + Number(v.vendaPrevista || 0), 0);
    const custoEstoque = stockVehicles.reduce((sum, v) => sum + custoVeiculo(v), 0);
    const despesasEmEstoque = stockVehicles.reduce((sum, v) => sum + (custoTotalPorPlaca.get(v.placa) || 0), 0);
    const patioMedio = stockVehicles.length
      ? stockVehicles.reduce((sum, v) => sum + diffDays(v.dataCompra), 0) / stockVehicles.length
      : 0;
    // Lucro e margem previstos só com carros de cadastro completo (compra e venda prevista preenchidas)
    const vendaPrevistaCompletos = completos.reduce((sum, v) => sum + Number(v.vendaPrevista || 0), 0);
    const lucroPrevisto = completos.reduce((sum, v) => sum + Number(v.vendaPrevista || 0) - custoVeiculo(v), 0);
    const margemMedia = vendaPrevistaCompletos > 0 ? (lucroPrevisto / vendaPrevistaCompletos) * 100 : 0;
    const garantiasAtivas = soldVehicles.filter((v) => v.garantiaFim && v.garantiaFim >= todayISO()).length;

    const valorVendido = (v: Vehicle) => Number(v.valorVenda ?? v.vendaPrevista ?? 0);
    const totalVendido = soldInPeriod.reduce((sum, v) => sum + valorVendido(v), 0);
    const lucroRealizado = soldInPeriod.reduce((sum, v) => sum + valorVendido(v) - custoVeiculo(v), 0);
    const margemRealizada = totalVendido > 0 ? (lucroRealizado / totalVendido) * 100 : 0;

    // Parte da loja: próprios/trocas 100%; consignados 50% do lucro (0 se prejuízo); "a definir" fica de fora
    const parteLoja = (v: Vehicle, lucro: number) => dividirLucro(grupoDaOrigem(v.origem), lucro, v.status === "Vendido" ? posVendaVeiculo(v) : 0).loja;
    const lucroPrevistoLoja = completos.reduce((sum, v) => sum + parteLoja(v, Number(v.vendaPrevista || 0) - custoVeiculo(v)), 0);
    const margemPrevistaLoja = vendaPrevistaCompletos > 0 ? (lucroPrevistoLoja / vendaPrevistaCompletos) * 100 : 0;
    const lucroLoja = soldInPeriod.reduce((sum, v) => sum + parteLoja(v, valorVendido(v) - custoVeiculo(v)), 0);
    const margemLoja = totalVendido > 0 ? (lucroLoja / totalVendido) * 100 : 0;
    const parteProprietarios = lucroRealizado - lucroLoja;
    const consignadosEstoque = stockVehicles.filter((v) => grupoDaOrigem(v.origem) !== "loja").length;
    // Capital da loja: só próprios e trocas. Consignados ficam de fora (carro e despesas são do proprietário)
    const capitalInvestidoLoja = stockVehicles.filter((v) => grupoDaOrigem(v.origem) === "loja").reduce((sum, v) => sum + custoVeiculo(v), 0);
    const despesasConsignados = stockVehicles
      .filter((v) => grupoDaOrigem(v.origem) !== "loja")
      .reduce((sum, v) => sum + (custoTotalPorPlaca.get(v.placa) || 0), 0);

    return {
      lucroPrevistoLoja, margemPrevistaLoja, lucroLoja, margemLoja, parteProprietarios, consignadosEstoque,
      capitalInvestidoLoja, despesasConsignados,
      valorEstoque, custoEstoque, despesasEmEstoque, patioMedio, lucroPrevisto,
      margemMedia, garantiasAtivas, totalVendido, lucroRealizado, margemRealizada,
      stockCount: stockVehicles.length, soldCount: soldInPeriod.length,
      totalVehicles: vehicles.length,
      incompletos: stockVehicles.filter(cadastroIncompleto),
    };
  }, [stockVehicles, soldVehicles, soldInPeriod, vehicles, custoTotalPorPlaca]);

  // Ranking: só carros EM ESTOQUE e com cadastro completo
  const ranking = useMemo(() =>
    stockVehicles
      .filter((v) => !cadastroIncompleto(v))
      .map((v) => ({ ...v, lucro: Number(v.vendaPrevista || 0) - custoVeiculo(v) }))
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 3),
    [stockVehicles, custoTotalPorPlaca]
  );


  const handleSaveVehicle = async (form: Record<string, string>) => {
    try {
      const payload = {
        placa: (form.placa || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
        marca: form.marca,
        modelo: form.modelo,
        ano: Number(form.ano || 0),
        km: Number(form.km || 0),
        cambio: form.cambio,
        combustivel: form.combustivel,
        origem: form.origem,
        completo: form.completo,
        cor: form.cor,
        compra: Number(form.compra || 0),
        venda_prevista: Number(form.vendaPrevista || 0),
        status: editingVehicle?.status || "Em estoque",
        data_compra: form.dataCompra,
        observacao: form.observacao || "",
        telefone_anuncio: form.telefoneAnuncio || "",
      };

      if (editingVehicle) {
        const { error } = await supabase.from("veiculos").update(payload).eq("id", Number(editingVehicle.id));
        if (error) throw error;
        setEditingVehicle(null);
      } else {
        const { error } = await supabase.from("veiculos").insert(payload);
        if (error) throw error;
      }

      await loadData();
      setActive(voltarParaResultado ? "resultado" : "estoque");
      setVoltarParaResultado(false);
      setSelectedVehicle(null);
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar o veículo.");
    }
  };

  const handleSaveExpense = async (form: Record<string, string>, id?: number) => {
    try {
      const vehicle = vehicles.find((v) => v.placa === form.placa);
      if (!vehicle) throw new Error("Veículo não encontrado para essa placa.");

      // Alerta (não bloqueia): já existe despesa do mesmo carro, na mesma data e com o mesmo valor?
      const chave = chaveDuplicidade(vehicle.id, form.data, form.valor);
      const iguais = expenses.filter((e) => e.id !== id && chaveDuplicidade(e.veiculoId, e.data, e.valor) === chave);
      if (iguais.length > 0) {
        const lista = iguais.map((e) => `• ${e.categoria}${e.descricao ? ` — ${e.descricao}` : ""}`).join("\n");
        const mesmaCategoria = iguais.some((e) => e.categoria === form.categoria);
        const msg = `${mesmaCategoria ? "ATENÇÃO: provável lançamento duplicado." : "Atenção: possível lançamento duplicado."}\n\n` +
          `Já existe ${iguais.length === 1 ? "uma despesa" : `${iguais.length} despesas`} de ${currency(Number(form.valor))} no ${vehicle.placa} em ${formatDateBR(form.data)}:\n${lista}\n\n` +
          "Lançar mesmo assim?";
        if (!confirm(msg)) return false;
      }

      const payload = {
        veiculo_id: Number(vehicle.id),
        categoria: form.categoria,
        descricao: form.descricao || "",
        valor: Number(form.valor || 0),
        data: form.data,
      };
      const { error } = id
        ? await supabase.from("despesas").update(payload).eq("id", id)
        : await supabase.from("despesas").insert(payload);

      if (error) throw error;
      await loadData();
      setExpensePlatePrefill("");
      setEditingExpense(null);
      // Correção fica na tela de despesas; lançamento novo segue para a consulta de custo, como antes
      if (!id) setActive("consulta-custo");
      return true;
    } catch (error) {
      console.error(error);
      alert(id ? "Não foi possível salvar a correção da despesa." : "Não foi possível salvar a despesa.");
      return false;
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    try {
      const { error } = await supabase.from("despesas").delete().eq("id", expense.id);
      if (error) throw error;
      if (editingExpense?.id === expense.id) setEditingExpense(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir a despesa.");
    }
  };

  const handleStartEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setSelectedVehicle(null);
    setActive("despesas");
  };

  const handleRegisterSale = async ({ placa, valorVenda, dataVenda }: { placa: string; valorVenda: string; dataVenda: string }) => {
    try {
      const vehicle = vehicles.find((v) => v.placa === placa);
      if (!vehicle) throw new Error("Veículo não encontrado para venda.");

      const garantiaFim = addDays(dataVenda, 90);

      const { error: updateVehicleError } = await supabase
        .from("veiculos")
        .update({ status: "Vendido" })
        .eq("id", Number(vehicle.id));
      if (updateVehicleError) throw updateVehicleError;

      const { data: existingSale } = await supabase
        .from("vendas")
        .select("id")
        .eq("veiculo_id", Number(vehicle.id))
        .maybeSingle();

      let vendaId: number | null = null;
      if (existingSale?.id) {
        vendaId = existingSale.id;
        const { error } = await supabase.from("vendas").update({
          valor_venda: Number(valorVenda || vehicle.vendaPrevista),
          data_venda: dataVenda,
          observacao: "Venda registrada pelo sistema",
        }).eq("id", existingSale.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("vendas").insert({
          veiculo_id: Number(vehicle.id),
          valor_venda: Number(valorVenda || vehicle.vendaPrevista),
          data_venda: dataVenda,
          observacao: "Venda registrada pelo sistema",
        }).select("id").single();
        if (error) throw error;
        vendaId = data.id;
      }

      const { data: existingWarranty } = await supabase
        .from("garantias")
        .select("id")
        .eq("veiculo_id", Number(vehicle.id))
        .maybeSingle();

      if (existingWarranty?.id) {
        const { error } = await supabase.from("garantias").update({
          venda_id: vendaId,
          data_inicio: dataVenda,
          data_fim: garantiaFim,
          status: "Ativa",
          observacao: "Garantia de 90 dias",
        }).eq("id", existingWarranty.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("garantias").insert({
          veiculo_id: Number(vehicle.id),
          venda_id: vendaId,
          data_inicio: dataVenda,
          data_fim: garantiaFim,
          status: "Ativa",
          observacao: "Garantia de 90 dias",
        });
        if (error) throw error;
      }

      await loadData();
      setActive("garantia");
      setSelectedVehicle(null);
    } catch (error) {
      console.error(error);
      alert("Não foi possível registrar a venda.");
    }
  };

  // Corrigir venda: muda data e valor na tabela vendas; a garantia acompanha a nova data (90 dias)
  const handleUpdateSale = async (vehicle: Vehicle, { dataVenda, valorVenda }: { dataVenda: string; valorVenda: number }) => {
    try {
      const vid = Number(vehicle.id);
      const { data: vendaAtualizada, error } = await supabase.from("vendas")
        .update({ data_venda: dataVenda, valor_venda: valorVenda })
        .eq("veiculo_id", vid).select("id");
      if (error) throw error;
      if (!vendaAtualizada?.length) throw new Error("Venda não encontrada para este veículo.");
      const { error: gErr } = await supabase.from("garantias")
        .update({ data_inicio: dataVenda, data_fim: addDays(dataVenda, 90) })
        .eq("veiculo_id", vid);
      if (gErr) throw gErr;
      await loadData();
      setSelectedVehicle({ ...vehicle, dataVenda, valorVenda, garantiaFim: vehicle.garantiaFim ? addDays(dataVenda, 90) : vehicle.garantiaFim });
      return true;
    } catch (error) {
      console.error(error);
      alert("Não foi possível corrigir a venda. Recarregue a página e tente de novo.");
      return false;
    }
  };

  // Desfazer venda: apaga garantia e venda e devolve o carro ao estoque
  const handleUndoSale = async (vehicle: Vehicle) => {
    try {
      const vid = Number(vehicle.id);
      const { error: gErr } = await supabase.from("garantias").delete().eq("veiculo_id", vid);
      if (gErr) throw gErr;
      const { error: sErr } = await supabase.from("vendas").delete().eq("veiculo_id", vid);
      if (sErr) throw sErr;
      const { error: vErr } = await supabase.from("veiculos").update({ status: "Em estoque" }).eq("id", vid);
      if (vErr) throw vErr;
      await loadData();
      setSelectedVehicle(null);
      setActive("estoque");
    } catch (error) {
      console.error(error);
      alert("Não foi possível desfazer a venda. Recarregue a página e confira o status do veículo.");
    }
  };

  // Excluir carro: apaga antes tudo que depende dele (garantia, venda, despesas)
  const handleDeleteVehicle = async (id: string) => {
    try {
      const vid = Number(id);
      for (const tabela of ["garantias", "vendas", "despesas"] as const) {
        const { error } = await supabase.from(tabela).delete().eq("veiculo_id", vid);
        if (error) throw error;
      }
      const { error } = await supabase.from("veiculos").delete().eq("id", vid);
      if (error) throw error;
      await loadData();
      setSelectedVehicle(null);
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir o veículo. Recarregue a página e confira se algo foi apagado.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Carregando dados do banco...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onEnter={(nextUser) => { setUser(nextUser); setIsAuthenticated(true); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[290px_1fr]">
        <AppSidebar
          active={active}
          setActive={(tab) => {
            setActive(tab);
            if (tab !== "estoque") setSelectedVehicle(null);
            if (tab !== "despesas") setEditingExpense(null);
            setVoltarParaDashboard(false);
            setVoltarParaResultado(false);
            if (tab !== "cadastro") setEditingVehicle(null);
          }}
          user={user}
          onLogout={() => setIsAuthenticated(false)}
        />
        <main className="overflow-y-auto p-4 md:p-8">
          <div className="mb-6 rounded-[28px] bg-white p-6 shadow-md shadow-slate-200/60">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Painel Auto Prime</h2>
                <p className="mt-1 text-slate-500">Sistema completo para cadastro, estoque, despesas, custo por placa, venda, garantia e mostruário.</p>
              </div>
              <Tabs
                value={["dashboard","estoque","mostruario"].includes(active) ? active : undefined}
                onValueChange={(tab) => { setActive(tab); if (tab !== "estoque") setSelectedVehicle(null); setVoltarParaDashboard(false); }}
                className="w-full xl:w-auto"
              >
                <TabsList className="grid w-full grid-cols-3 rounded-2xl xl:w-[420px]">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="estoque">Estoque</TabsTrigger>
                  <TabsTrigger value="mostruario">Mostruário</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {active === "dashboard" && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60 ring-2 ring-blue-300 bg-blue-50">
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Filtro de vendas por mês</p>
                    <p className="text-lg font-semibold text-slate-900">{monthLabel(dashboardMonth)}</p>
                    <p className="text-xs text-slate-500">O estoque mostra sempre a situação atual do pátio.</p>
                  </div>
                  <div className="w-full md:w-[280px]">
                    <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
                      <SelectTrigger className="rounded-2xl border-blue-300 bg-white" data-testid="select-dashboard-month">
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overflow-y-auto">
                        {monthOptions.map((opt) => <SelectItem key={opt} value={opt}>{monthLabel(opt)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {totals.incompletos.length > 0 && (
                <Card className="rounded-3xl border-0 bg-amber-50 shadow-md shadow-slate-200/60 ring-2 ring-amber-300">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 font-semibold text-amber-800">
                      <AlertTriangle className="h-5 w-5" />
                      {totals.incompletos.length === 1 ? "1 carro em estoque com cadastro incompleto" : `${totals.incompletos.length} carros em estoque com cadastro incompleto`}
                    </div>
                    <p className="mt-1 text-sm text-amber-800">Ficam fora do lucro previsto e do ranking até serem corrigidos.</p>
                    <ul className="mt-3 space-y-1 text-sm text-amber-900">
                      {totals.incompletos.map((v) => (
                        <li key={v.id}>
                          <strong>{v.placa}</strong> {v.marca} {v.modelo} — falta{" "}
                          {[!Number(v.compra) && "valor de compra", !Number(v.vendaPrevista) && "venda prevista"].filter(Boolean).join(" e ")}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Estoque atual</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <StatCard title="Veículos em estoque" value={totals.stockCount} subtitle={`${totals.consignadosEstoque} consignados • pátio médio ${Math.round(totals.patioMedio)} dias`} icon={Car} />
                  <StatCard title="Capital investido (todos os carros)" value={currency(totals.custoEstoque)} subtitle="Compra + despesas dos carros no pátio" icon={Wrench} />
                  <StatCard title="Capital investido da loja" value={currency(totals.capitalInvestidoLoja)} subtitle={`Só próprios e trocas • consignados ficam de fora (despesas deles: ${currency(totals.despesasConsignados)}, pagas pelos proprietários)`} icon={Store} valueClass="text-emerald-600" />
                  <StatCard title="Valor de venda do estoque" value={currency(totals.valorEstoque)} subtitle="Soma das vendas previstas" icon={TrendingUp} />
                  <StatCard title="Lucro previsto (todos os carros)" value={currency(totals.lucroPrevisto)} subtitle={`Venda prevista menos custo total • margem ${totals.margemMedia.toFixed(1)}%`} icon={CircleDollarSign} />
                  <StatCard title="Lucro previsto da loja" value={currency(totals.lucroPrevistoLoja)} subtitle={`Sem a parte dos proprietários • margem ${totals.margemPrevistaLoja.toFixed(1)}%`} icon={Store} valueClass="text-emerald-600" />
                  <StatCard title="Parte prevista dos proprietários" value={currency(totals.lucroPrevisto - totals.lucroPrevistoLoja)} subtitle="50% do lucro previsto dos consignados" icon={Target} />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Vendas — {monthLabel(dashboardMonth)}</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <StatCard title="Carros vendidos" value={totals.soldCount} subtitle="Pela data da venda" icon={CheckCircle2} onClick={() => setShowSoldList((x) => !x)} active={showSoldList} />
                  <StatCard title="Total vendido" value={currency(totals.totalVendido)} subtitle="Faturamento das vendas" icon={DollarSign} />
                  <StatCard title="Lucro realizado (todos os carros)" value={currency(totals.lucroRealizado)} subtitle={`Venda menos compra e despesas • margem ${totals.margemRealizada.toFixed(1)}%`} icon={CircleDollarSign} />
                  <StatCard title="Lucro da loja" value={currency(totals.lucroLoja)} subtitle={`Sem a parte dos proprietários • margem ${totals.margemLoja.toFixed(1)}%`} icon={Store} valueClass="text-emerald-600" />
                  <StatCard title="Parte dos proprietários" value={currency(totals.parteProprietarios)} subtitle="50% do lucro dos consignados" icon={Target} />
                  <StatCard title="Em garantia" value={totals.garantiasAtivas} subtitle="Garantias vigentes hoje" icon={ShieldCheck} />
                </div>
                {showSoldList && (
                  <SoldList
                    vehicles={soldInPeriod}
                    custoVeiculo={custoVeiculo}
                    onSelect={(v) => { setSelectedVehicle(v); setVoltarParaDashboard(true); setActive("estoque"); window.scrollTo({ top: 0 }); }}
                  />
                )}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
                  <CardHeader><CardTitle>Resumo da operação</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-600"><ClipboardList className="h-4 w-4" /> Tempo médio de pátio</div>
                        <p className="mt-2 text-3xl font-bold">{Math.round(totals.patioMedio)} dias</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-600"><Wrench className="h-4 w-4" /> Despesas em estoque</div>
                        <p className="mt-2 text-3xl font-bold">{currency(totals.despesasEmEstoque)}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="h-4 w-4" /> Vendidos</div>
                        <p className="mt-2 text-3xl font-bold">{totals.soldCount}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-slate-600"><CalendarClock className="h-4 w-4" /> Cadastro ativo</div>
                        <p className="mt-2 text-3xl font-bold">{totals.totalVehicles} veículos</p>
                      </div>
                    </div>
                    <div className="mt-6 rounded-3xl border bg-slate-50 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-sm text-slate-500">Ranking de lucro previsto</p>
                          <p className="text-lg font-semibold">Top 3 do estoque</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {ranking.map((v, idx) => (
                          <div key={v.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
                            <div>
                              <p className="font-medium">{idx + 1}. {v.marca} {v.modelo}</p>
                              <p className="text-sm text-slate-500">{v.placa}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-emerald-700">{currency(v.lucro)}</p>
                              <p className="text-xs text-slate-500">lucro previsto</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
                  <CardHeader><CardTitle>Ações rápidas</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {([
                      ["Cadastrar veículo", "cadastro", PlusCircle],
                      ["Lançar despesa", "despesas", Wrench],
                      ["Consulta custo", "consulta-custo", Calculator],
                      ["Registrar venda", "vendas", DollarSign],
                      ["Anúncio", "anuncio", Megaphone],
                    ] as [string, string, React.ComponentType<{ className?: string }>][]).map(([label, target, Icon]) => (
                      <Button
                        key={target}
                        data-testid={`quick-action-${target}`}
                        variant="outline"
                        className="flex w-full items-center justify-start gap-3 rounded-2xl py-6"
                        onClick={() => setActive(target)}
                      >
                        <Icon className="h-4 w-4" /> {label}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {active === "gastos" && (
            <CarSpendingPanel
              expenses={expenses}
              vehicles={vehicles}
              onOpenVehicle={(v) => { setSelectedVehicle(v); setActive("estoque"); window.scrollTo({ top: 0 }); }}
            />
          )}

          {active === "custos" && <OperatingCostsPanel custos={custos} status={statusCustos} onReload={loadCustos} />}

          {active === "resultado" && (
            <ResultPanel
              custos={custos}
              statusCustos={statusCustos}
              vehicles={vehicles}
              custoVeiculo={custoVeiculo}
              posVendaVeiculo={posVendaVeiculo}
              onEditVehicle={(v) => { setEditingVehicle(v); setVoltarParaResultado(true); setActive("cadastro"); window.scrollTo({ top: 0 }); }}
              onOpenVehicle={(v) => { setSelectedVehicle(v); setVoltarParaResultado(true); setActive("estoque"); window.scrollTo({ top: 0 }); }}
            />
          )}

          {active === "cadastro" && (
            <VehicleForm
              onSave={handleSaveVehicle}
              editingVehicle={editingVehicle}
              onCancelEdit={() => { setEditingVehicle(null); setActive(voltarParaResultado ? "resultado" : "estoque"); setVoltarParaResultado(false); }}
            />
          )}

          {active === "despesas" && (
            <ExpensesPanel
              expenses={expenses}
              vehicles={vehicles}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              initialPlate={expensePlatePrefill}
              editingExpense={editingExpense}
              onStartEdit={handleStartEditExpense}
              onClearEditing={() => setEditingExpense(null)}
              validadas={validadas}
              onValidar={handleValidar}
            />
          )}

          {active === "consulta-custo" && (
            <CostLookupPanel vehicles={vehicles} expenses={expenses} />
          )}

          {active === "vendas" && (
            <SalesPanel
              stockVehicles={stockVehicles}
              onRegisterSale={handleRegisterSale}
              initialPlate={salePlatePrefill}
            />
          )}

          {active === "estoque" && !selectedVehicle && (
            <StockPage vehicles={vehicles} onSelectVehicle={(vehicle) => setSelectedVehicle(vehicle)} />
          )}

          {active === "estoque" && selectedVehicle && (
            <VehicleDetailPage
              onDeleteVehicle={handleDeleteVehicle}
              vehicle={selectedVehicle}
              expenses={expenses}
              onBack={() => {
                setSelectedVehicle(null);
                if (voltarParaDashboard) { setVoltarParaDashboard(false); setActive("dashboard"); }
                else if (voltarParaResultado) { setVoltarParaResultado(false); setActive("resultado"); }
              }}
              backLabel={voltarParaDashboard ? "Voltar para o dashboard" : voltarParaResultado ? "Voltar para o resultado" : "Voltar para estoque"}
              onEditVehicle={(vehicle) => { setEditingVehicle(vehicle); setActive("cadastro"); }}
              onOpenExpense={(plate) => { setExpensePlatePrefill(plate); setActive("despesas"); }}
              onOpenSale={(plate) => { setSalePlatePrefill(plate); setActive("vendas"); }}
              onUndoSale={handleUndoSale}
              onEditExpense={handleStartEditExpense}
              onUpdateSale={handleUpdateSale}
            />
          )}

          {active === "garantia" && <WarrantyPanel soldVehicles={soldVehicles} />}
          {active === "anuncio" && <AnuncioPanel />}
          {active === "configuracoes" && <SettingsPanel />}
          {active === "mostruario" && <ShowroomPanel stockVehicles={stockVehicles} expenseByPlate={expenseByPlate} />}
        </main>
      </div>
    </div>
  );
}

