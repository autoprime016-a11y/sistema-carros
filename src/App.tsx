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
  "Mecânica","Regularização","Outros",
];

const COMPLEMENTO_OPTIONS = ["Completo","Compl - Ar","Apenas AR","Basico"];

const currency = (value: number | string | undefined | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const todayISO = () => new Date().toISOString().slice(0, 10);

const monthKey = (dateStr?: string) => {
  if (!dateStr) return "sem-data";
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

const diffDays = (dateStr?: string, endDate: string | Date = new Date()) => {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return todayISO();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

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
  vendaPrevista: number;
  status: "Em estoque" | "Vendido" | "Reservado";
  dataCompra: string;
  dataVenda?: string;
  garantiaFim?: string;
  observacao?: string;
  telefoneAnuncio?: string;
};

type Expense = {
  id: number;
  placa: string;
  categoria: string;
  valor: number;
  data: string;
  descricao: string;
};

const initialVehicles: Vehicle[] = [
  {
    id: "CAR001", placa: "FKA-2A14", marca: "Fiat", modelo: "Uno Vivace", ano: 2016, km: 98500,
    cambio: "Manual", combustivel: "Flex", origem: "Próprio", completo: "Completo", cor: "Branco",
    compra: 32000, vendaPrevista: 38000, status: "Em estoque", dataCompra: "2026-02-10",
    observacao: "Veículo revisado e pronto para anúncio.", telefoneAnuncio: "551633924002",
  },
  {
    id: "CAR002", placa: "JXD-7M33", marca: "Ford", modelo: "EcoSport Freestyle", ano: 2019, km: 61200,
    cambio: "Automático", combustivel: "Flex", origem: "Próprio", completo: "Completo", cor: "Prata",
    compra: 68000, vendaPrevista: 79500, status: "Em estoque", dataCompra: "2026-01-14",
    observacao: "Revisão em dia, chave reserva.", telefoneAnuncio: "551633924002",
  },
  {
    id: "CAR003", placa: "MTR-4C09", marca: "Jeep", modelo: "Compass Longitude", ano: 2021, km: 65000,
    cambio: "Automático", combustivel: "Diesel", origem: "Próprio", completo: "Completo", cor: "Preto",
    compra: 112000, vendaPrevista: 120900, status: "Vendido", dataCompra: "2025-12-12",
    dataVenda: "2026-01-15", garantiaFim: "2026-04-15",
    observacao: "Venda concluída com garantia ativa.", telefoneAnuncio: "1633924002",
  },
];

const initialExpenses: Expense[] = [
  { id: 1, placa: "FKA-2A14", categoria: "Oficina", valor: 850, data: "2026-02-12", descricao: "Troca de óleo e filtros" },
  { id: 2, placa: "FKA-2A14", categoria: "Documentação", valor: 320, data: "2026-02-15", descricao: "Transferência" },
  { id: 3, placa: "JXD-7M33", categoria: "Funilaria", valor: 1450, data: "2026-01-29", descricao: "Reparo lateral" },
  { id: 4, placa: "JXD-7M33", categoria: "Mecânica", valor: 680, data: "2026-01-19", descricao: "Revisão preventiva" },
];

const storageKeys = {
  vehicles: "autoprime_vehicles_v5",
  expenses: "autoprime_expenses_v5",
};

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
          <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-300 hover:bg-slate-900">
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

function StatCard({ title, value, subtitle, icon: Icon }: { title: string; value: string | number; subtitle: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl bg-blue-600 p-3 text-white"><Icon className="h-5 w-5" /></div>
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
    initialPlate,
  }: {
    expenses: Expense[];
    vehicles: Vehicle[];
    onSaveExpense: (data: Record<string, string>) => void;
    initialPlate?: string;
  }) {
  const [form, setForm] = useState({
    placa: initialPlate || "", categoria: TIPO_DESPESA_OPTIONS[0], valor: "", data: todayISO(), descricao: "",
  });

  useEffect(() => {
    if (initialPlate) setForm((prev) => ({ ...prev, placa: initialPlate }));
  }, [initialPlate]);

  const save = () => {
    if (!form.placa || !form.valor) return;
    onSaveExpense(form);
    setForm({ placa: initialPlate || "", categoria: TIPO_DESPESA_OPTIONS[0], valor: "", data: todayISO(), descricao: "" });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader>
          <CardTitle>Lançar despesa</CardTitle>
          <CardDescription>Controle de custos por veículo.</CardDescription>
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
          <Button data-testid="button-save-expense" onClick={save} className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700">
            Lançar despesa
          </Button>
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
                <div key={e.id} data-testid={`expense-row-${e.id}`} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold">{e.placa} — {e.categoria}</p>
                    <p className="text-sm text-slate-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(e.data))} • {e.descricao}</p>
                  </div>
                  <p className="text-lg font-semibold text-red-500">{currency(e.valor)}</p>
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
  const lucroPrevisto = Number(selectedVehicle?.vendaPrevista || 0) - totalCost;
  const margem = totalCost > 0 ? (lucroPrevisto / totalCost) * 100 : 0;

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
              <div className="flex justify-between text-sm"><span className="text-slate-500">Venda prevista</span><span className="font-medium">{currency(selectedVehicle.vendaPrevista)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Lucro previsto</span><span className={lucroPrevisto >= 0 ? "text-emerald-600" : "text-red-600"}>{currency(lucroPrevisto)}</span></div>

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
                <p className="text-sm text-slate-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(e.data))} • {e.descricao}</p>
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
  vehicle, expenses, onBack, onEditVehicle, onOpenExpense, onOpenSale, onDeleteVehicle,
}: {
  vehicle: Vehicle;
  expenses: Expense[];
  onBack: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onOpenExpense: (plate: string) => void;
  onOpenSale: (plate: string) => void;
  onDeleteVehicle: (id: string) => void;
}) {
  const vehicleExpenses = expenses.filter((e) => e.placa === vehicle.placa);
  const totalExpenses = vehicleExpenses.reduce((sum, e) => sum + Number(e.valor || 0), 0);
  const totalCost = Number(vehicle.compra || 0) + totalExpenses;
  const margemPrevista = Number(vehicle.vendaPrevista || 0) - totalCost;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{vehicle.marca} {vehicle.modelo}</h2>
          <p className="mt-1 text-slate-500">{vehicle.placa} • {vehicle.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
<Button 
  variant="destructive" 
  className="rounded-2xl"
  onClick={() => {
    if (confirm("Deseja excluir este veículo?")) {
      onDeleteVehicle(vehicle.id);
    }
  }}
>
  Excluir
</Button>
          <Button variant="outline" className="rounded-2xl" onClick={onBack} data-testid="button-back-stock">
            Voltar para estoque
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
                  <p className="text-2xl font-semibold">{new Intl.DateTimeFormat("pt-BR").format(new Date(vehicle.dataCompra))}</p>
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
                <span className="text-slate-500">Venda Prevista</span>
                <span className="font-semibold">{currency(vehicle.vendaPrevista)}</span>
              </div>
              <div className="flex items-center justify-between text-2xl font-bold">
                <span>Margem Prevista</span>
                <span className="text-emerald-600">{currency(margemPrevista)}</span>
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
                        <p className="text-sm text-slate-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(item.data))}</p>
                      </div>
                      <p className="text-xl font-semibold text-red-500">{currency(item.valor)}</p>
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
  const [statusFilter, setStatusFilter] = useState("Todos");
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
        const current = new Date(v.dataCompra);
        const fromOk = !dateFrom || current >= new Date(dateFrom);
        const toOk = !dateTo || current <= new Date(dateTo);
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
              const days = diffDays(v.dataCompra);
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
                      <p className="text-xs text-slate-500">Venda prevista</p>
                      <p className="text-xl font-bold text-slate-950">{currency(v.vendaPrevista)}</p>
                      <p className="mt-1 text-xs text-slate-500">Compra: {currency(v.compra)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${statusClass[v.status]} rounded-2xl border px-3 py-1 text-xs font-medium`}>
                        {v.status}
                      </Badge>
                      <Badge className={`${patioBadge(days)} rounded-2xl px-3 py-1 text-xs font-medium`}>
                        {days}d pátio
                      </Badge>
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
  const active = soldVehicles.filter((v) => v.garantiaFim && new Date(v.garantiaFim) >= new Date());
  const closed = soldVehicles.filter((v) => v.garantiaFim && new Date(v.garantiaFim) < new Date());

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card className="rounded-3xl border-0 shadow-md shadow-slate-200/60">
        <CardHeader><CardTitle>Garantias ativas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {active.length === 0 && <p className="text-sm text-slate-500">Nenhuma garantia ativa.</p>}
          {active.map((v) => {
            const total = 90;
            const used = total - Math.max(0, diffDays(todayISO(), v.garantiaFim));
            const progress = Math.max(0, Math.min(100, (used / total) * 100));
            return (
              <div key={v.id} data-testid={`warranty-active-${v.id}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{v.marca} {v.modelo}</p>
                    <p className="text-sm text-slate-500">{v.placa} • garantia até {v.garantiaFim}</p>
                  </div>
                  <Badge className="border border-emerald-200 bg-emerald-500/15 text-emerald-700">Ativa</Badge>
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
                  <p className="text-sm text-slate-500">{v.placa} • encerrada em {v.garantiaFim}</p>
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
  const [expensePlatePrefill, setExpensePlatePrefill] = useState("");
  const [salePlatePrefill, setSalePlatePrefill] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (typeof window === "undefined") return initialVehicles;
    const saved = window.localStorage.getItem(storageKeys.vehicles);
    return saved ? JSON.parse(saved) : initialVehicles;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === "undefined") return initialExpenses;
    const saved = window.localStorage.getItem(storageKeys.expenses);
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(storageKeys.vehicles, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(storageKeys.expenses, JSON.stringify(expenses));
  }, [expenses]);

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

  const filteredDashboardVehicles = useMemo(() => {
    if (dashboardMonth === "todos") return vehicles;
    return vehicles.filter((v) => monthKey(v.dataCompra) === dashboardMonth || monthKey(v.dataVenda) === dashboardMonth);
  }, [vehicles, dashboardMonth]);

  const filteredDashboardExpenses = useMemo(() => {
    if (dashboardMonth === "todos") return expenses;
    return expenses.filter((e) => monthKey(e.data) === dashboardMonth);
  }, [expenses, dashboardMonth]);

  const totals = useMemo(() => {
    const stockFiltered = filteredDashboardVehicles.filter((v) => v.status === "Em estoque");
    const soldFiltered = filteredDashboardVehicles.filter((v) => v.status === "Vendido");
    const expenseByPlateFiltered = (placa: string) =>
      filteredDashboardExpenses.filter((e) => e.placa === placa).reduce((sum, e) => sum + Number(e.valor), 0);

    const valorEstoque = stockFiltered.reduce((sum, v) => sum + Number(v.vendaPrevista || 0), 0);
    const custoEstoque = stockFiltered.reduce((sum, v) => sum + Number(v.compra || 0) + expenseByPlateFiltered(v.placa), 0);
    const despesasEmEstoque = stockFiltered.reduce((sum, v) => sum + expenseByPlateFiltered(v.placa), 0);
    const patioMedio = stockFiltered.length
      ? stockFiltered.reduce((sum, v) => sum + diffDays(v.dataCompra), 0) / stockFiltered.length
      : 0;
    const lucroPrevisto = valorEstoque - custoEstoque;
    const margemMedia = custoEstoque > 0 ? (lucroPrevisto / custoEstoque) * 100 : 0;
    const garantiasAtivas = soldFiltered.filter((v) => v.garantiaFim && new Date(v.garantiaFim) >= new Date()).length;
    const totalVendido = soldFiltered.reduce((sum, v) => sum + Number(v.vendaPrevista || 0), 0);

    return {
      valorEstoque, custoEstoque, despesasEmEstoque, patioMedio, lucroPrevisto,
      margemMedia, garantiasAtivas, totalVendido,
      stockCount: stockFiltered.length, soldCount: soldFiltered.length,
      totalVehicles: filteredDashboardVehicles.length,
    };
  }, [filteredDashboardVehicles, filteredDashboardExpenses]);

  const ranking = useMemo(() =>
    filteredDashboardVehicles.map((v) => {
      const custo = Number(v.compra || 0) + filteredDashboardExpenses.filter((e) => e.placa === v.placa).reduce((sum, e) => sum + Number(e.valor || 0), 0);
      const lucro = Number(v.vendaPrevista || 0) - custo;
      return { ...v, lucro };
    }).sort((a, b) => b.lucro - a.lucro).slice(0, 3),
    [filteredDashboardVehicles, filteredDashboardExpenses]
  );

  const nextId = () => {
    const max = vehicles.reduce((m, v) => Math.max(m, Number(String(v.id).replace("CAR", "")) || 0), 0);
    return `CAR${String(max + 1).padStart(3, "0")}`;
  };

  const handleSaveVehicle = (form: Record<string, string>) => {
    if (editingVehicle) {
      setVehicles((prev) => prev.map((v) =>
        v.id === editingVehicle.id ? {
          ...v,
          placa: form.placa, marca: form.marca, modelo: form.modelo,
          ano: Number(form.ano || 0), km: Number(form.km || 0),
          cambio: form.cambio, combustivel: form.combustivel,
          origem: form.origem, completo: form.completo, cor: form.cor,
          compra: Number(form.compra || 0), vendaPrevista: Number(form.vendaPrevista || 0),
          dataCompra: form.dataCompra, observacao: form.observacao,
          telefoneAnuncio: form.telefoneAnuncio,
        } : v
      ));
      setEditingVehicle(null);
    } else {
      setVehicles((prev) => [...prev, {
        ...form,
        id: nextId(),
        ano: Number(form.ano || 0), km: Number(form.km || 0),
        compra: Number(form.compra || 0), vendaPrevista: Number(form.vendaPrevista || 0),
        status: "Em estoque",
      } as Vehicle]);
    }
    setActive("estoque");
    setSelectedVehicle(null);
  };

  const handleSaveExpense = (form: Record<string, string>) =>
    setExpenses((prev) => [{ id: Date.now(), ...form, valor: Number(form.valor || 0) } as Expense, ...prev]);

  const handleRegisterSale = ({ placa, valorVenda, dataVenda }: { placa: string; valorVenda: string; dataVenda: string }) => {
    setVehicles((prev) => prev.map((v) =>
      v.placa === placa ? {
        ...v,
        status: "Vendido" as const,
        vendaPrevista: Number(valorVenda || v.vendaPrevista),
        dataVenda,
        garantiaFim: addDays(dataVenda, 90),
      } : v
    ));
    setActive("garantia");
    setSelectedVehicle(null);
  };
const handleDeleteVehicle = (id: string) => {
  setVehicles((prev) => prev.filter((v) => v.id !== id));
  setExpenses((prev) => prev.filter((e) => {
    const vehicle = vehicles.find(v => v.id === id);
    return vehicle ? e.placa !== vehicle.placa : true;
  }));
};

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
                onValueChange={(tab) => { setActive(tab); if (tab !== "estoque") setSelectedVehicle(null); }}
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
                    <p className="text-sm font-medium text-blue-700">Filtro do dashboard por mês</p>
                    <p className="text-lg font-semibold text-slate-900">{monthLabel(dashboardMonth)}</p>
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

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <StatCard title="Veículos em estoque" value={totals.stockCount} subtitle="Disponíveis no filtro" icon={Car} />
                <StatCard title="Valor total de estoque" value={currency(totals.valorEstoque)} subtitle="Base de venda prevista" icon={TrendingUp} />
                <StatCard title="Lucro previsto" value={currency(totals.lucroPrevisto)} subtitle="Venda prevista menos custo atual" icon={CircleDollarSign} />
                <StatCard title="Margem média" value={`${totals.margemMedia.toFixed(1)}%`} subtitle="Rentabilidade do estoque" icon={AlertTriangle} />
                <StatCard title="Em garantia" value={totals.garantiasAtivas} subtitle="Veículos em garantia" icon={ShieldCheck} />
                <StatCard title="Total vendido" value={currency(totals.totalVendido)} subtitle="Vendas do período" icon={DollarSign} />
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
                          <p className="text-lg font-semibold">Top 3 veículos</p>
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
              initialPlate={expensePlatePrefill}
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
              onBack={() => setSelectedVehicle(null)}
              onEditVehicle={(vehicle) => { setEditingVehicle(vehicle); setActive("cadastro"); }}
              onOpenExpense={(plate) => { setExpensePlatePrefill(plate); setActive("despesas"); }}
              onOpenSale={(plate) => { setSalePlatePrefill(plate); setActive("vendas"); }}
            />
          )}

          {active === "garantia" && <WarrantyPanel soldVehicles={soldVehicles} />}
          {active === "anuncio" && <AnuncioPanel />}
          {active === "mostruario" && <ShowroomPanel stockVehicles={stockVehicles} expenseByPlate={expenseByPlate} />}

          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500">
            Para uso real na loja, esta interface pode ser publicada e conectada a um banco de dados online.
          </div>
        </main>
      </div>
    </div>
  );
}

