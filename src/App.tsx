import React, { useEffect, useMemo, useState } from "react";
import {
  Car, DollarSign, LayoutDashboard, PlusCircle, ShieldCheck,
  Search, Wrench, Store, TrendingUp, ClipboardList, CalendarClock,
  Eye, CheckCircle2, CircleDollarSign, FileSpreadsheet, Share2,
  LogIn, UserCircle2, Bell, Settings, LogOut, Calculator,
  AlertTriangle, Trophy, Pencil, Megaphone, Target, Calendar,
  Gauge, Fuel, Palette, Package, MapPin, FileText,
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
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
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
    ["cadastro", "Cadastrar veículo", PlusCircle],
    ["estoque", "Estoque", Car],
    ["despesas", "Despesas", Wrench],
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
  title, value, subtitle, icon: Icon, onClick, active = false,
}: {
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
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
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
                  <SelectItem value="Próprio">Próprio</SelectItem>
                  <SelectItem value="Consignado">Consignado</SelectItem>
                  <SelectItem value="Troca">Troca</SelectItem>
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
}: {
  expenses: Expense[];
  vehicles: Vehicle[];
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

  return (
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
  vehicle, expenses, onBack, onEditVehicle, onOpenExpense, onOpenSale, onDeleteVehicle, onUndoSale, onEditExpense, backLabel,
}: {
  backLabel?: string;
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return vehicles
      .filter((v) => statusFilter === "Todos" || v.status === statusFilter)
      .filter((v) => {
        const q = query.toLowerCase();
        return !q || [v.id, v.placa, v.marca, v.modelo].some((x) => String(x).toLowerCase().includes(q));
      })
      .filter((v) => {
        if (!dateFrom && !dateTo) return true;
        if (!v.dataCompra) return false;
        const current = v.dataCompra.slice(0, 10);
        const fromOk = !dateFrom || current >= dateFrom;
        const toOk = !dateTo || current <= dateTo;
        return fromOk && toOk;
      })
      .sort((a, b) => a.marca.localeCompare(b.marca, "pt-BR") || a.modelo.localeCompare(b.modelo, "pt-BR"));
  }, [vehicles, query, statusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Estoque</CardTitle>
              <CardDescription>Visual premium em cards, com filtros e navegação para o detalhe.</CardDescription>
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
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[170px] rounded-2xl" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[170px] rounded-2xl" />
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
      setResumo(`${dados.veiculos.length} veículos, ${dados.despesas.length} despesas, ${dados.vendas.length} vendas e ${dados.garantias.length} garantias.`);
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
  const [expensePlatePrefill, setExpensePlatePrefill] = useState("");
  const [salePlatePrefill, setSalePlatePrefill] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

    return {
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
      setActive("estoque");
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Veículos em estoque" value={totals.stockCount} subtitle={`Tempo médio de pátio: ${Math.round(totals.patioMedio)} dias`} icon={Car} />
                  <StatCard title="Capital investido" value={currency(totals.custoEstoque)} subtitle="Compra + despesas dos carros no pátio" icon={Wrench} />
                  <StatCard title="Valor de venda do estoque" value={currency(totals.valorEstoque)} subtitle="Soma das vendas previstas" icon={TrendingUp} />
                  <StatCard title="Lucro previsto" value={currency(totals.lucroPrevisto)} subtitle="Venda prevista menos custo total" icon={CircleDollarSign} />
                  <StatCard title="Margem prevista" value={`${totals.margemMedia.toFixed(1)}%`} subtitle="Lucro sobre o preço de venda" icon={Target} />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Vendas — {monthLabel(dashboardMonth)}</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Carros vendidos" value={totals.soldCount} subtitle="Pela data da venda" icon={CheckCircle2} onClick={() => setShowSoldList((x) => !x)} active={showSoldList} />
                  <StatCard title="Total vendido" value={currency(totals.totalVendido)} subtitle="Faturamento das vendas" icon={DollarSign} />
                  <StatCard title="Lucro realizado" value={currency(totals.lucroRealizado)} subtitle="Venda menos compra e despesas" icon={CircleDollarSign} />
                  <StatCard title="Margem realizada" value={`${totals.margemRealizada.toFixed(1)}%`} subtitle="Lucro sobre o preço de venda" icon={Target} />
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

          {active === "cadastro" && (
            <VehicleForm
              onSave={handleSaveVehicle}
              editingVehicle={editingVehicle}
              onCancelEdit={() => { setEditingVehicle(null); setActive("estoque"); }}
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
              }}
              backLabel={voltarParaDashboard ? "Voltar para o dashboard" : "Voltar para estoque"}
              onEditVehicle={(vehicle) => { setEditingVehicle(vehicle); setActive("cadastro"); }}
              onOpenExpense={(plate) => { setExpensePlatePrefill(plate); setActive("despesas"); }}
              onOpenSale={(plate) => { setSalePlatePrefill(plate); setActive("vendas"); }}
              onUndoSale={handleUndoSale}
              onEditExpense={handleStartEditExpense}
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

