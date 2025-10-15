import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { LogOut, Users, Download, Settings, Factory, Trash2, Wrench, Clock, RefreshCw } from "lucide-react";
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem("token");
      setToken(null);
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(userData);
      toast.success("Login realizado com sucesso!");
    } catch (error) {
      toast.error("Credenciais inválidas");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.success("Logout realizado com sucesso!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center login-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen">
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard user={user} onLogout={logout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin(username, password);
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <Card className="w-full max-w-md login-card">
        <CardHeader className="text-center pb-8">
          <div className="merco-logo mb-6">
            <div className="merco-logo-container">
              <div className="merco-logo-bg">
                <span className="merco-text">Merco</span>
                <div className="merco-t-line"></div>
                <span className="merco-textil">Têxtil</span>
              </div>
            </div>
          </div>
          <p className="login-subtitle">Sistema de Controle de Máquinas</p>
        </CardHeader>
        <CardContent className="form-merco">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>
            <Button type="submit" className="w-full btn-merco" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [activeLayout, setActiveLayout] = useState("16_fusos");
  const [machines, setMachines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [espulas, setEspulas] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, [activeLayout, user.role]);

  const loadData = async () => {
    await Promise.all([
      loadMachines(),
      loadOrders(),
      loadMaintenances(),
      loadEspulas(),
      user.role === "admin" ? loadUsers() : Promise.resolve()
    ]);
  };

  const loadMachines = async () => {
    try {
      const response = await axios.get(`${API}/machines/${activeLayout}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMachines(response.data);
    } catch (error) {
      toast.error("Erro ao carregar máquinas");
    }
  };

  const loadOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setOrders(response.data);
    } catch (error) {
      toast.error("Erro ao carregar pedidos");
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error("Erro ao carregar usuários");
    }
  };

  const loadMaintenances = async () => {
    try {
      const response = await axios.get(`${API}/maintenance`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setMaintenances(response.data);
    } catch (error) {
      toast.error("Erro ao carregar manutenções");
    }
  };

  const loadEspulas = async () => {
    try {
      const response = await axios.get(`${API}/espulas`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setEspulas(response.data);
    } catch (error) {
      toast.error("Erro ao carregar espulas");
    }
  };

  const resetDatabase = async () => {
    if (window.confirm("Tem certeza que deseja resetar o banco de dados? Isso apagará todos os pedidos, espulas e manutenções.")) {
      try {
        await axios.post(`${API}/reset-database`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        
        toast.success("Banco de dados resetado com sucesso!");
        loadData();
      } catch (error) {
        toast.error("Erro ao resetar banco de dados");
      }
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin": return { text: "Administrador", class: "badge-admin" };
      case "operador_interno": return { text: "Op. Interno", class: "badge-interno" };
      case "operador_externo": return { text: "Op. Externo", class: "badge-externo" };
      default: return { text: role, class: "badge-merco" };
    }
  };

  const badge = getRoleBadge(user.role);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="merco-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <div className="merco-logo-header">
                <div className="merco-logo-bg-small">
                  <span className="merco-text-small">Merco</span>
                  <div className="merco-t-line-small"></div>
                  <span className="merco-textil-small">Têxtil</span>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-600"></div>
              <span className="text-2xl font-bold text-white">Merco Têxtil</span>
              <Badge className={`${badge.class} badge-merco`}>
                {badge.text}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Olá, <span className="text-white font-medium">{user.username}</span></span>
              {user.role === "admin" && (
                <Button variant="outline" size="sm" onClick={resetDatabase} className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset DB
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onLogout} className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="tabs-merco">
            <TabsTrigger value="dashboard" className="tab-merco">Dashboard</TabsTrigger>
            <TabsTrigger value="orders" className="tab-merco">Produção</TabsTrigger>
            <TabsTrigger value="ordemproducao" className="tab-merco">Ordem de Produção</TabsTrigger>
            <TabsTrigger value="relatorios" className="tab-merco">Relatórios</TabsTrigger>
            <TabsTrigger value="espulas" className="tab-merco">Espulagem</TabsTrigger>
            <TabsTrigger value="maintenance" className="tab-merco">Manutenção</TabsTrigger>
            {user.role === "admin" && <TabsTrigger value="admin" className="tab-merco">Administração</TabsTrigger>}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">Painel de Controle</h2>
              <div className="layout-switcher">
                <button
                  className={`layout-btn ${activeLayout === "16_fusos" ? "active" : ""}`}
                  onClick={() => setActiveLayout("16_fusos")}
                >
                  16 Fusos
                </button>
                <button
                  className={`layout-btn ${activeLayout === "32_fusos" ? "active" : ""}`}
                  onClick={() => setActiveLayout("32_fusos")}
                >
                  32 Fusos
                </button>
              </div>
            </div>

            <FusosPanel 
              layout={activeLayout} 
              machines={machines} 
              user={user}
              onMachineUpdate={loadMachines}
              onOrderUpdate={loadOrders}
              onMaintenanceUpdate={loadMaintenances}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersPanel orders={orders} user={user} onOrderUpdate={loadOrders} onMachineUpdate={loadMachines} />
          </TabsContent>

          <TabsContent value="ordemproducao">
            <OrdemProducaoPanel user={user} />
          </TabsContent>

          <TabsContent value="relatorios">
            <RelatoriosPanel user={user} />
          </TabsContent>

          <TabsContent value="espulas">
            <EspulasPanel espulas={espulas} user={user} onEspulaUpdate={loadEspulas} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenancePanel maintenances={maintenances} user={user} onMaintenanceUpdate={loadMaintenances} onMachineUpdate={loadMachines} />
          </TabsContent>

          {user.role === "admin" && (
            <TabsContent value="admin">
              <AdminPanel users={users} onUserUpdate={loadUsers} />
            </TabsContent>
          )}
        </Tabs>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-700 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Todos os direitos reservados | Desenvolvido por CodeliumCompany
          </p>
        </footer>
      </main>
    </div>
  );
};

const FusosPanel = ({ layout, machines, user, onMachineUpdate, onOrderUpdate, onMaintenanceUpdate }) => {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [maintenanceMachine, setMaintenanceMachine] = useState(null);
  const [orderData, setOrderData] = useState({
    cliente: "",
    artigo: "",
    cor: "",
    quantidade: "",
    observacao: ""
  });
  const [maintenanceData, setMaintenanceData] = useState({
    motivo: ""
  });

  // Função para obter cor do status - incluindo desativada
  const getStatusColor = (status) => {
    switch (status) {
      case "verde": return "status-verde";
      case "amarelo": return "status-amarelo";
      case "vermelho": return "status-vermelho";
      case "azul": return "status-azul";
      case "desativada": return "status-desativada";
      default: return "status-verde";
    }
  };

  // Função para admin ativar/desativar máquina
  const toggleMachineActive = async (machineId) => {
    if (user?.role !== "admin") {
      toast.error("Apenas administradores podem ativar/desativar máquinas");
      return;
    }
    
    try {
      const response = await axios.put(`${API}/machines/${machineId}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success(response.data.message);
      onMachineUpdate(); // Refresh machines
    } catch (error) {
      toast.error("Erro ao alterar status da máquina");
    }
  };

  // CORRIGIR FORMATAÇÃO DE HORÁRIO - CONVERSÃO CORRETA UTC PARA BRASÍLIA
  const formatDateTimeBrazil = (utcString) => {
    if (!utcString) return "-";
    try {
      // Parse UTC string e converte para horário de Brasília
      const utcDate = new Date(utcString + (utcString.includes('Z') ? '' : 'Z'));
      
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(utcDate);
    } catch (error) {
      console.error('Error formatting date:', error);
      return "-";
    }
  };

  const handleMachineClick = (machine) => {
    if (user.role === "admin" || user.role === "operador_interno") {
      if (machine.status === "verde") {
        setSelectedMachine(machine);
      }
    }
  };

  const handleMaintenanceClick = (machine) => {
    if (machine.status === "verde") {
      setMaintenanceMachine(machine);
    }
  };

  const handleOrderSubmit = async () => {
    try {
      await axios.post(`${API}/orders`, {
        machine_id: selectedMachine.id,
        ...orderData
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Pedido criado com sucesso!");
      setSelectedMachine(null);
      setOrderData({ cliente: "", artigo: "", cor: "", quantidade: "", observacao: "" });
      onMachineUpdate();
      onOrderUpdate();
    } catch (error) {
      toast.error("Erro ao criar pedido");
    }
  };

  const handleMaintenanceSubmit = async () => {
    try {
      await axios.post(`${API}/maintenance`, {
        machine_id: maintenanceMachine.id,
        motivo: maintenanceData.motivo
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Máquina colocada em manutenção!");
      setMaintenanceMachine(null);
      setMaintenanceData({ motivo: "" });
      onMachineUpdate();
      onMaintenanceUpdate();
    } catch (error) {
      toast.error("Erro ao colocar máquina em manutenção");
    }
  };

  // 16 Fusos Layout - EXACT replication with stable keys
  const renderLayout16 = () => {
    const machinesByCode = useMemo(() => {
      const result = {};
      machines.forEach(machine => {
        if (machine?.code) {
          result[machine.code] = machine;
        }
      });
      return result;
    }, [machines]);

    const renderMachineBox = useCallback((machine, code) => {
      const uniqueKey = machine?.id ? `machine-16-${machine.id}` : `empty-16-${code}`;
      
      return (
        <div key={uniqueKey} className={`machine-box-16 ${getStatusColor(machine?.status || 'verde')}`}>
          <span onClick={() => machine && machine.status !== 'desativada' && handleMachineClick(machine)} className="machine-code">
            {machine?.code || code}
          </span>
          {machine && (
            <>
              <button className="maintenance-btn" onClick={(e) => {
                e.stopPropagation();
                handleMaintenanceClick(machine);
              }}>
                <Wrench className="h-4 w-4" />
              </button>
              {user?.role === "admin" && (
                <button 
                  className="admin-toggle-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMachineActive(machine.id);
                  }}
                  title={machine.status === 'desativada' ? 'Reativar máquina' : 'Desativar máquina'}
                >
                  {machine.status === 'desativada' ? '✓' : '✕'}
                </button>
              )}
            </>
          )}
        </div>
      );
    }, [machines, getStatusColor, handleMachineClick, handleMaintenanceClick, toggleMachineActive, user]);

    return (
      <div className="layout-16-exact-centered">
        {/* Top section - CD blocks horizontally arranged */}
        <div className="layout-16-top-section">
          {/* CD1-CD4 block (2x2) */}
          <div className="cd-block-2x2">
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD1"], "CD1")}
              {renderMachineBox(machinesByCode["CD2"], "CD2")}
            </div>
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD3"], "CD3")}
              {renderMachineBox(machinesByCode["CD4"], "CD4")}
            </div>
          </div>
          
          {/* CD5-CD8 block (2x2) */}
          <div className="cd-block-2x2">
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD5"], "CD5")}
              {renderMachineBox(machinesByCode["CD6"], "CD6")}
            </div>
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD7"], "CD7")}
              {renderMachineBox(machinesByCode["CD8"], "CD8")}
            </div>
          </div>
          
          {/* CD17-CD20 block (horizontal line) */}
          <div className="cd-block-horizontal">
            {renderMachineBox(machinesByCode["CD17"], "CD17")}
            {renderMachineBox(machinesByCode["CD18"], "CD18")}
            {renderMachineBox(machinesByCode["CD19"], "CD19")}
            {renderMachineBox(machinesByCode["CD20"], "CD20")}
          </div>
        </div>

        {/* Middle section - CD blocks horizontally arranged */}
        <div className="layout-16-middle-section">
          {/* CD9-CD12 block (2x2) */}
          <div className="cd-block-2x2">
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD9"], "CD9")}
              {renderMachineBox(machinesByCode["CD10"], "CD10")}
            </div>
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD11"], "CD11")}
              {renderMachineBox(machinesByCode["CD12"], "CD12")}
            </div>
          </div>
          
          {/* CD13-CD16 block (2x2) */}
          <div className="cd-block-2x2">
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD13"], "CD13")}
              {renderMachineBox(machinesByCode["CD14"], "CD14")}
            </div>
            <div className="cd-row">
              {renderMachineBox(machinesByCode["CD15"], "CD15")}
              {renderMachineBox(machinesByCode["CD16"], "CD16")}
            </div>
          </div>
          
          {/* CD21-CD24 block (horizontal line) */}
          <div className="cd-block-horizontal">
            {renderMachineBox(machinesByCode["CD21"], "CD21")}
            {renderMachineBox(machinesByCode["CD22"], "CD22")}
            {renderMachineBox(machinesByCode["CD23"], "CD23")}
            {renderMachineBox(machinesByCode["CD24"], "CD24")}
          </div>
        </div>

        {/* CI section - "17 FUSOS" */}
        <div className="layout-16-ci-section">
          <div className="ci-label">17 FUSOS</div>
          <div className="ci-block-horizontal">
            {renderMachineBox(machinesByCode["CI1"], "CI1")}
            {renderMachineBox(machinesByCode["CI2"], "CI2")}
            {renderMachineBox(machinesByCode["CI3"], "CI3")}
            {renderMachineBox(machinesByCode["CI4"], "CI4")}
          </div>
        </div>

        {/* F section - Bottom rows */}
        <div className="layout-16-f-section">
          <div className="f-row-container">
            <div className="f-row">
              {["F23", "F21", "F19", "F17", "F15", "F13", "F11", "F9", "F7", "F5", "F3", "F1"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
            <div className="f-row">
              {["F24", "F22", "F20", "F18", "F16", "F14", "F12", "F10", "F8", "F6", "F4", "F2"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 32 Fusos Layout - EXACT replication with stable keys  
  const renderLayout32 = () => {
    const machinesByCode = useMemo(() => {
      const result = {};
      machines.forEach(machine => {
        if (machine?.code) {
          result[machine.code] = machine;
        }
      });
      return result;
    }, [machines]);

    const renderMachineBox = useCallback((machine, code) => {
      const uniqueKey = machine?.id ? `machine-32-${machine.id}` : `empty-32-${code}`;
      
      return (
        <div key={uniqueKey} className={`machine-box-32 ${getStatusColor(machine?.status || 'verde')}`}>
          <span onClick={() => machine && machine.status !== 'desativada' && handleMachineClick(machine)} className="machine-code">
            {machine?.code || code}
          </span>
          {machine && (
            <>
              <button className="maintenance-btn" onClick={(e) => {
                e.stopPropagation();
                handleMaintenanceClick(machine);
              }}>
                <Wrench className="h-4 w-4" />
              </button>
              {user?.role === "admin" && (
                <button 
                  className="admin-toggle-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMachineActive(machine.id);
                  }}
                  title={machine.status === 'desativada' ? 'Reativar máquina' : 'Desativar máquina'}
                >
                  {machine.status === 'desativada' ? '✓' : '✕'}
                </button>
              )}
            </>
          )}
        </div>
      );
    }, [machines, getStatusColor, handleMachineClick, handleMaintenanceClick, toggleMachineActive, user]);

    return (
      <div className="layout-32-exact-new">
        {/* CT Machines - Row 1: CT1-CT12 */}
        <div className="ct-row-1">
          {["CT1", "CT2", "CT3", "CT4", "CT5", "CT6", "CT7", "CT8", "CT9", "CT10", "CT11", "CT12"].map(code => 
            renderMachineBox(machinesByCode[code], code)
          )}
        </div>

        {/* CT Machines - Row 2: CT13-CT24 */}
        <div className="ct-row-2">
          {["CT13", "CT14", "CT15", "CT16", "CT17", "CT18", "CT19", "CT20", "CT21", "CT22", "CT23", "CT24"].map(code => 
            renderMachineBox(machinesByCode[code], code)
          )}
        </div>

        {/* U Machines - Three blocks of 10 machines each (2x5 grid) */}
        <div className="u-machines-container">
          {/* Left Block: U1-U10 */}
          <div className="u-block">
            <div className="u-column">
              {["U1", "U3", "U5", "U7", "U9"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
            <div className="u-column">
              {["U2", "U4", "U6", "U8", "U10"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
          </div>

          {/* Middle Block: U11-U20 */}
          <div className="u-block">
            <div className="u-column">
              {["U11", "U13", "U15", "U17", "U19"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
            <div className="u-column">
              {["U12", "U14", "U16", "U18", "U20"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
          </div>

          {/* Right Block: U21-U30 */}
          <div className="u-block">
            <div className="u-column">
              {["U21", "U23", "U25", "U27", "U29"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
            <div className="u-column">
              {["U22", "U24", "U26", "U28", "U30"].map(code => 
                renderMachineBox(machinesByCode[code], code)
              )}
            </div>
          </div>
        </div>

        {/* N Machines - Single row: N1-N10 */}
        <div className="n-machines-row">
          <div className="n-machines-confirmed">
            {["N1", "N2", "N3", "N4", "N5", "N6"].map(code => 
              renderMachineBox(machinesByCode[code], code)
            )}
          </div>
          <div className="n-machines-dashed">
            {["N7", "N8", "N9", "N10"].map(code => 
              renderMachineBox(machinesByCode[code], code)
            )}
          </div>
        </div>

        {/* Bottom U Machines: U31-U33 */}
        <div className="u-bottom-group">
          <div className="u-stack">
            {renderMachineBox(machinesByCode["U32"], "U32")}
            {renderMachineBox(machinesByCode["U33"], "U33")}
          </div>
          <div className="u-single">
            {renderMachineBox(machinesByCode["U31"], "U31")}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="fusos-container card-merco">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-6 text-white">
            Layout {layout === "16_fusos" ? "16" : "32"} Fusos
          </h3>
          <div className="status-legend">
            <div className="status-item">
              <div className="status-dot verde"></div>
              <span>Livre</span>
            </div>
            <div className="status-item">
              <div className="status-dot amarelo"></div>
              <span>Pendente</span>
            </div>
            <div className="status-item">
              <div className="status-dot vermelho"></div>
              <span>Em Uso</span>
            </div>
            <div className="status-item">
              <div className="status-dot azul"></div>
              <span>Manutenção</span>
            </div>
          </div>
        </div>
        
        {layout === "16_fusos" ? renderLayout16() : renderLayout32()}
      </div>

      {/* Order Dialog */}
      <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
        <DialogContent className="dialog-merco max-w-md">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">
              Novo Pedido - {selectedMachine?.code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6 form-merco">
            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                value={orderData.cliente}
                onChange={(e) => setOrderData({...orderData, cliente: e.target.value})}
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div>
              <Label htmlFor="artigo">Artigo *</Label>
              <Input
                id="artigo"
                value={orderData.artigo}
                onChange={(e) => setOrderData({...orderData, artigo: e.target.value})}
                placeholder="Artigo"
                required
              />
            </div>
            <div>
              <Label htmlFor="cor">Cor *</Label>
              <Input
                id="cor"
                value={orderData.cor}
                onChange={(e) => setOrderData({...orderData, cor: e.target.value})}
                placeholder="Cor"
                required
              />
            </div>
            <div>
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="text"
                value={orderData.quantidade}
                onChange={(e) => setOrderData({...orderData, quantidade: e.target.value})}
                placeholder="Ex: 100, 50kg, 30m"
                required
              />
            </div>
            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={orderData.observacao}
                onChange={(e) => setOrderData({...orderData, observacao: e.target.value})}
                placeholder="Observações (opcional)"
              />
            </div>
            <Button 
              onClick={handleOrderSubmit} 
              className="w-full btn-merco"
              disabled={!orderData.cliente || !orderData.artigo || !orderData.cor || !orderData.quantidade}
            >
              Criar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={!!maintenanceMachine} onOpenChange={() => setMaintenanceMachine(null)}>
        <DialogContent className="dialog-merco max-w-md">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">
              Manutenção - {maintenanceMachine?.code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6 form-merco">
            <div>
              <Label htmlFor="motivo">Motivo da Manutenção *</Label>
              <Textarea
                id="motivo"
                value={maintenanceData.motivo}
                onChange={(e) => setMaintenanceData({...maintenanceData, motivo: e.target.value})}
                placeholder="Descreva o motivo da manutenção"
                required
              />
            </div>
            <Button 
              onClick={handleMaintenanceSubmit} 
              className="w-full btn-merco"
              disabled={!maintenanceData.motivo}
            >
              Colocar em Manutenção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const OrdersPanel = ({ orders, user, onOrderUpdate, onMachineUpdate }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [finishData, setFinishData] = useState({
    observacao_liberacao: "",
    laudo_final: ""
  });

  const updateOrder = async (orderId, status, observacao = "", laudo = "") => {
    try {
      await axios.put(`${API}/orders/${orderId}`, {
        status,
        observacao_liberacao: observacao,
        laudo_final: laudo
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Pedido atualizado com sucesso!");
      onOrderUpdate();
      onMachineUpdate();
    } catch (error) {
      toast.error("Erro ao atualizar pedido");
    }
  };

  const handleFinish = async () => {
    await updateOrder(selectedOrder.id, "finalizado", finishData.observacao_liberacao, finishData.laudo_final);
    setSelectedOrder(null);
    setFinishData({ observacao_liberacao: "", laudo_final: "" });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pendente": return "bg-yellow-600 text-yellow-100";
      case "em_producao": return "bg-red-600 text-red-100";
      case "finalizado": return "bg-green-600 text-green-100";
      default: return "bg-gray-600 text-gray-100";
    }
  };

  // CORRIGIR FORMATAÇÃO DE HORÁRIO - CONVERSÃO CORRETA UTC PARA BRASÍLIA  
  const formatDateTimeBrazil = (utcString) => {
    if (!utcString) return "-";
    try {
      // Parse UTC string e converte para horário de Brasília
      const utcDate = new Date(utcString + (utcString.includes('Z') ? '' : 'Z'));
      
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(utcDate);
    } catch (error) {
      console.error('Error formatting date:', error);
      return "-";
    }
  };

  const formatDateBrazil = (utcString) => {
    if (!utcString) return "-";
    try {
      // Parse UTC string e converte para horário de Brasília
      const utcDate = new Date(utcString + (utcString.includes('Z') ? '' : 'Z'));
      
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(utcDate);
    } catch (error) {
      console.error('Error formatting date:', error);
      return "-";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    try {
      // Assume que o backend sempre envia UTC
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      return "-";
    }
  };

  const getCurrentBrazilTime = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now).replace(',', '');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Gerenciamento de Pedidos</h2>
      <div className="grid gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="card-merco-large">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-white text-xl">
                    Máquina {order.machine_code} - {order.layout_type.replace('_', ' ')}
                  </h3>
                  <p className="text-gray-400 text-lg">Cliente: <span className="text-white">{order.cliente}</span></p>
                </div>
                <Badge className={`${getStatusBadge(order.status)} font-semibold text-sm`}>
                  {order.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base mb-6">
                <div>
                  <span className="font-medium text-gray-400">Artigo:</span>
                  <p className="text-white">{order.artigo}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-400">Cor:</span>
                  <p className="text-white">{order.cor}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-400">Quantidade:</span>
                  <p className="text-white">{order.quantidade}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-400">Criado por:</span>
                  <p className="text-white">{order.created_by}</p>
                </div>
              </div>

              {/* Time information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="font-medium text-gray-400">Criado:</span>
                    <p className="text-white">{formatDateTimeBrazil(order.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-orange-400" />
                  <div>
                    <span className="font-medium text-gray-400">Iniciado:</span>
                    <p className="text-white">{formatDateTimeBrazil(order.started_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div>
                    <span className="font-medium text-gray-400">Finalizado:</span>
                    <p className="text-white">{formatDateTimeBrazil(order.finished_at)}</p>
                  </div>
                </div>
              </div>
              
              {order.observacao && (
                <p className="text-base text-gray-400 mb-4 p-3 bg-gray-800/50 rounded">
                  <span className="font-medium">Observação:</span> {order.observacao}
                </p>
              )}

              {order.laudo_final && (
                <p className="text-base text-green-400 mb-4 p-3 bg-green-900/20 rounded border border-green-700">
                  <span className="font-medium">Laudo Final:</span> {order.laudo_final}
                </p>
              )}
              
              {(user.role === "admin" || user.role === "operador_externo") && order.status !== "finalizado" && (
                <div className="flex space-x-3">
                  {order.status === "pendente" && (
                    <Button
                      size="lg"
                      className="btn-merco"
                      onClick={() => updateOrder(order.id, "em_producao")}
                    >
                      Iniciar Produção
                    </Button>
                  )}
                  {order.status === "em_producao" && (
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Finalizar Produção
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finish Order Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="dialog-merco">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">
              Finalizar Produção - {selectedOrder?.machine_code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6 form-merco">
            <div>
              <Label htmlFor="observacao_liberacao">Observação de Liberação</Label>
              <Textarea
                id="observacao_liberacao"
                value={finishData.observacao_liberacao}
                onChange={(e) => setFinishData({...finishData, observacao_liberacao: e.target.value})}
                placeholder="Observações sobre a liberação"
              />
            </div>
            <div>
              <Label htmlFor="laudo_final">Laudo Final *</Label>
              <Textarea
                id="laudo_final"
                value={finishData.laudo_final}
                onChange={(e) => setFinishData({...finishData, laudo_final: e.target.value})}
                placeholder="Laudo final da produção"
                required
              />
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleFinish} className="flex-1 btn-merco" disabled={!finishData.laudo_final}>
                Finalizar Produção
              </Button>
              <Button variant="outline" onClick={() => setSelectedOrder(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Ordem de Producao Panel
const OrdemProducaoPanel = ({ user }) => {
  const [ordens, setOrdens] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [ordemData, setOrdemData] = useState({
    cliente: "",
    artigo: "",
    cor: "",
    metragem: "",
    data_entrega: "",
    observacao: ""
  });

  useEffect(() => {
    loadOrdens();
  }, []);

  const loadOrdens = async () => {
    try {
      const response = await axios.get(`${API}/ordens-producao`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setOrdens(response.data);
    } catch (error) {
      toast.error("Erro ao carregar ordens de produção");
    }
  };

  const createOrdem = async () => {
    try {
      await axios.post(`${API}/ordens-producao`, ordemData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Ordem de produção criada com sucesso!");
      setOrdemData({
        cliente: "",
        artigo: "",
        cor: "",
        metragem: "",
        data_entrega: "",
        observacao: ""
      });
      setShowForm(false);
      loadOrdens();
    } catch (error) {
      toast.error("Erro ao criar ordem de produção");
    }
  };

  const formatDateTimeBrazil = (utcString) => {
    if (!utcString) return "-";
    try {
      const utcDate = new Date(utcString + (utcString.includes('Z') ? '' : 'Z'));
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(utcDate);
    } catch (error) {
      return "-";
    }
  };

  const formatDateBrazil = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return "-";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pendente": return "bg-yellow-600 text-yellow-100";
      case "em_producao": return "bg-blue-600 text-blue-100";
      case "finalizado": return "bg-green-600 text-green-100";
      default: return "bg-gray-600 text-gray-100";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pendente": return "Pendente";
      case "em_producao": return "Em Produção";
      case "finalizado": return "Finalizado";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Ordens de Produção</h2>
        <Button onClick={() => setShowForm(!showForm)} className="btn-merco">
          {showForm ? "Cancelar" : "+ Lançar"}
        </Button>
      </div>

      {showForm && (
        <Card className="card-merco">
          <CardHeader className="card-header-merco">
            <CardTitle className="card-title-merco">Nova Ordem de Produção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 form-merco">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={ordemData.cliente}
                  onChange={(e) => setOrdemData({...ordemData, cliente: e.target.value})}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              <div>
                <Label htmlFor="artigo">Artigo *</Label>
                <Input
                  id="artigo"
                  value={ordemData.artigo}
                  onChange={(e) => setOrdemData({...ordemData, artigo: e.target.value})}
                  placeholder="Artigo"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cor">Cor *</Label>
                <Input
                  id="cor"
                  value={ordemData.cor}
                  onChange={(e) => setOrdemData({...ordemData, cor: e.target.value})}
                  placeholder="Cor"
                  required
                />
              </div>
              <div>
                <Label htmlFor="metragem">Metragem *</Label>
                <Input
                  id="metragem"
                  value={ordemData.metragem}
                  onChange={(e) => setOrdemData({...ordemData, metragem: e.target.value})}
                  placeholder="Metragem"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="data_entrega">Data de Entrega *</Label>
              <Input
                id="data_entrega"
                type="date"
                value={ordemData.data_entrega}
                onChange={(e) => setOrdemData({...ordemData, data_entrega: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={ordemData.observacao}
                onChange={(e) => setOrdemData({...ordemData, observacao: e.target.value})}
                placeholder="Observações"
              />
            </div>
            <Button 
              onClick={createOrdem} 
              className="w-full btn-merco"
              disabled={!ordemData.cliente || !ordemData.artigo || !ordemData.cor || !ordemData.metragem || !ordemData.data_entrega}
            >
              Criar Ordem
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ordens.map((ordem) => (
          <Card key={ordem.id} className="card-merco">
            <CardHeader className="card-header-merco pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-white font-bold">OS {ordem.numero_os}</CardTitle>
                  <p className="text-sm text-gray-400 mt-1">{ordem.cliente}</p>
                </div>
                <Badge className={getStatusBadge(ordem.status)}>
                  {getStatusText(ordem.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-400">Artigo</p>
                  <p className="text-white font-medium">{ordem.artigo}</p>
                </div>
                <div>
                  <p className="text-gray-400">Cor</p>
                  <p className="text-white font-medium">{ordem.cor}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-400">Metragem</p>
                  <p className="text-white font-medium">{ordem.metragem}</p>
                </div>
                <div>
                  <p className="text-gray-400">Entrega</p>
                  <p className="text-white font-medium">{formatDateBrazil(ordem.data_entrega)}</p>
                </div>
              </div>
              {ordem.observacao && (
                <div>
                  <p className="text-gray-400">Observação</p>
                  <p className="text-white text-xs">{ordem.observacao}</p>
                </div>
              )}
              <div className="pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400">Criado: {formatDateTimeBrazil(ordem.criado_em)}</p>
                {ordem.iniciado_em && (
                  <p className="text-xs text-gray-400">Iniciado: {formatDateTimeBrazil(ordem.iniciado_em)}</p>
                )}
                {ordem.finalizado_em && (
                  <p className="text-xs text-gray-400">Finalizado: {formatDateTimeBrazil(ordem.finalizado_em)}</p>
                )}
                <p className="text-xs text-gray-400">Por: {ordem.criado_por}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Relatorios Panel - Shows only pending ordens
const RelatoriosPanel = ({ user }) => {
  const [ordensPendentes, setOrdensPendentes] = useState([]);
  const [selectedOrdem, setSelectedOrdem] = useState(null);
  const [showEspulaForm, setShowEspulaForm] = useState(false);
  const [espulaData, setEspulaData] = useState({
    numero_os: "",
    maquina: "",
    mat_prima: "",
    qtde_fios: "",
    quantidade_metros: "",
    carga: "",
    carga_fracao_1: "",
    carga_fracao_2: "",
    carga_fracao_3: "",
    carga_fracao_4: "",
    carga_fracao_5: "",
    observacoes: ""
  });

  useEffect(() => {
    loadOrdensPendentes();
    const interval = setInterval(loadOrdensPendentes, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrdensPendentes = async () => {
    try {
      const response = await axios.get(`${API}/ordens-producao/pendentes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setOrdensPendentes(response.data);
    } catch (error) {
      console.error("Erro ao carregar ordens pendentes:", error);
    }
  };

  const handleOrdemClick = (ordem) => {
    setSelectedOrdem(ordem);
    setEspulaData({
      numero_os: ordem.numero_os,
      maquina: "",
      mat_prima: "",
      qtde_fios: "",
      quantidade_metros: ordem.metragem,
      carga: "",
      carga_fracao_1: "",
      carga_fracao_2: "",
      carga_fracao_3: "",
      carga_fracao_4: "",
      carga_fracao_5: "",
      observacoes: ordem.observacao || ""
    });
    setShowEspulaForm(true);
  };

  const createEspulaFromOrdem = async () => {
    try {
      const espulaPayload = {
        ordem_producao_id: selectedOrdem.id,
        numero_os: espulaData.numero_os,
        cliente: selectedOrdem.cliente,
        artigo: selectedOrdem.artigo,
        cor: selectedOrdem.cor,
        maquina: espulaData.maquina,
        mat_prima: espulaData.mat_prima,
        qtde_fios: espulaData.qtde_fios,
        quantidade_metros: espulaData.quantidade_metros,
        carga: espulaData.carga,
        carga_fracao_1: espulaData.carga_fracao_1,
        carga_fracao_2: espulaData.carga_fracao_2,
        carga_fracao_3: espulaData.carga_fracao_3,
        carga_fracao_4: espulaData.carga_fracao_4,
        carga_fracao_5: espulaData.carga_fracao_5,
        observacoes: espulaData.observacoes,
        data_prevista_entrega: selectedOrdem.data_entrega
      };

      await axios.post(`${API}/espulas`, espulaPayload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Espulagem criada com sucesso! Ordem movida para produção.");
      setShowEspulaForm(false);
      setSelectedOrdem(null);
      loadOrdensPendentes();
    } catch (error) {
      toast.error("Erro ao criar espulagem");
    }
  };

  const formatDateBrazil = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return "-";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Relatórios - Ordens Pendentes</h2>
        <Button onClick={loadOrdensPendentes} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {ordensPendentes.length === 0 ? (
        <Card className="card-merco">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 text-lg">Nenhuma ordem pendente no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ordensPendentes.map((ordem) => (
            <Card 
              key={ordem.id} 
              className="card-merco cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => handleOrdemClick(ordem)}
            >
              <CardHeader className="card-header-merco pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-white font-bold">OS {ordem.numero_os}</CardTitle>
                    <p className="text-sm text-gray-400 mt-1">{ordem.cliente}</p>
                  </div>
                  <Badge className="bg-yellow-600 text-yellow-100">Pendente</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-400">Artigo</p>
                    <p className="text-white font-medium">{ordem.artigo}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cor</p>
                    <p className="text-white font-medium">{ordem.cor}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-400">Metragem</p>
                    <p className="text-white font-medium">{ordem.metragem}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Entrega</p>
                    <p className="text-white font-medium">{formatDateBrazil(ordem.data_entrega)}</p>
                  </div>
                </div>
                <div className="pt-2 text-center">
                  <p className="text-xs text-blue-400">Clique para criar espulagem</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog to create Espula from Ordem */}
      <Dialog open={showEspulaForm} onOpenChange={setShowEspulaForm}>
        <DialogContent className="dialog-merco max-w-3xl">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">
              Criar Espulagem - OS {selectedOrdem?.numero_os}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6 form-merco max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded">
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="text-white font-medium">{selectedOrdem?.cliente}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Artigo</p>
                <p className="text-white font-medium">{selectedOrdem?.artigo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Cor</p>
                <p className="text-white font-medium">{selectedOrdem?.cor}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Data Entrega</p>
                <p className="text-white font-medium">{formatDateBrazil(selectedOrdem?.data_entrega)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maquina">Máquina *</Label>
                <Input
                  id="maquina"
                  value={espulaData.maquina}
                  onChange={(e) => setEspulaData({...espulaData, maquina: e.target.value})}
                  placeholder="Ex: CD1, F2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="mat_prima">Matéria Prima *</Label>
                <Input
                  id="mat_prima"
                  value={espulaData.mat_prima}
                  onChange={(e) => setEspulaData({...espulaData, mat_prima: e.target.value})}
                  placeholder="Matéria prima"
                  required
                />
              </div>
              <div>
                <Label htmlFor="qtde_fios">Qtde Fios *</Label>
                <Input
                  id="qtde_fios"
                  value={espulaData.qtde_fios}
                  onChange={(e) => setEspulaData({...espulaData, qtde_fios: e.target.value})}
                  placeholder="Quantidade"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantidade_metros">Qtde Metros *</Label>
                <Input
                  id="quantidade_metros"
                  value={espulaData.quantidade_metros}
                  onChange={(e) => setEspulaData({...espulaData, quantidade_metros: e.target.value})}
                  placeholder="Metros"
                  required
                />
              </div>
              <div>
                <Label htmlFor="carga">Carga *</Label>
                <Input
                  id="carga"
                  value={espulaData.carga}
                  onChange={(e) => setEspulaData({...espulaData, carga: e.target.value})}
                  placeholder="Carga"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Cargas e Fração (até 5 valores - opcional)</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                <Input
                  value={espulaData.carga_fracao_1}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_1: e.target.value})}
                  placeholder="1"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_2}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_2: e.target.value})}
                  placeholder="2"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_3}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_3: e.target.value})}
                  placeholder="3"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_4}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_4: e.target.value})}
                  placeholder="4"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_5}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_5: e.target.value})}
                  placeholder="5"
                  type="text"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={espulaData.observacoes}
                onChange={(e) => setEspulaData({...espulaData, observacoes: e.target.value})}
                placeholder="Observações adicionais"
              />
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={createEspulaFromOrdem} 
                className="flex-1 btn-merco"
                disabled={!espulaData.maquina || !espulaData.mat_prima || !espulaData.qtde_fios || !espulaData.quantidade_metros || !espulaData.carga}
              >
                Criar Espula
              </Button>
              <Button variant="outline" onClick={() => setShowEspulaForm(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EspulasPanel = ({ espulas, user, onEspulaUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [espulaData, setEspulaData] = useState({
    numero_os: "",
    maquina: "",
    mat_prima: "",
    qtde_fios: "",
    cliente: "",
    artigo: "",
    cor: "",
    quantidade_metros: "",
    carga: "",
    carga_fracao_1: "",
    carga_fracao_2: "",
    carga_fracao_3: "",
    carga_fracao_4: "",
    carga_fracao_5: "",
    observacoes: "",
    data_prevista_entrega: ""
  });

  // CORRIGIR FORMATAÇÃO DE HORÁRIO - CONVERSÃO CORRETA UTC PARA BRASÍLIA  
  const formatDateTimeBrazil = (utcString) => {
    if (!utcString) return "-";
    try {
      // Parse UTC string e converte para horário de Brasília
      const utcDate = new Date(utcString + (utcString.includes('Z') ? '' : 'Z'));
      
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(utcDate);
    } catch (error) {
      console.error('Error formatting date:', error);
      return "-";
    }
  };

  const formatDateBrazil = (utcString) => {
    if (!utcString) return "-";
    try {
      // Parse UTC string e converte para horário de Brasília
      const utcDate = new Date(utcString + (utcString.includes('Z') ? '' : 'Z'));
      
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(utcDate);
    } catch (error) {
      console.error('Error formatting date:', error);
      return "-";
    }
  };

  const createEspula = async () => {
    try {
      await axios.post(`${API}/espulas`, espulaData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Espula lançada com sucesso!");
      setEspulaData({
        numero_os: "",
        maquina: "",
        mat_prima: "",
        qtde_fios: "",
        cliente: "",
        artigo: "",
        cor: "",
        quantidade_metros: "",
        carga: "",
        carga_fracao_1: "",
        carga_fracao_2: "",
        carga_fracao_3: "",
        carga_fracao_4: "",
        carga_fracao_5: "",
        observacoes: "",
        data_prevista_entrega: ""
      });
      setShowForm(false);
      onEspulaUpdate();
    } catch (error) {
      toast.error("Erro ao lançar espula");
    }
  };

  const updateEspulaStatus = async (espulaId, newStatus) => {
    try {
      await axios.put(`${API}/espulas/${espulaId}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Status atualizado com sucesso!");
      onEspulaUpdate();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const exportEspulasReport = async () => {
    try {
      const finalizedEspulas = espulas.filter(e => e.status === "finalizado");
      
      if (finalizedEspulas.length === 0) {
        toast.warning("Nenhuma espula finalizada para exportar");
        return;
      }
      
      const wb = XLSX.utils.book_new();
      
      const espulasData = finalizedEspulas.map(espula => ({
        'OS': espula.id.slice(-8),
        'Cliente': espula.cliente,
        'Artigo': espula.artigo,
        'Cor': espula.cor,
        'Quantidade (m)': espula.quantidade_metros,
        'Carga': espula.carga,
        'Observações': espula.observacoes || '-',
        'Data Lançamento': formatDateTimeBrazil(espula.created_at),
        'Data Prevista': formatDateBrazil(espula.data_prevista_entrega),
        'Iniciado em': formatDateTimeBrazil(espula.iniciado_em),
        'Finalizado em': formatDateTimeBrazil(espula.finalizado_em),
        'Status': 'FINALIZADO',
        'Criado por': espula.created_by
      }));
      
      const ws = XLSX.utils.json_to_sheet(espulasData);
      XLSX.utils.book_append_sheet(wb, ws, "Espulas Finalizadas");
      
      XLSX.writeFile(wb, `espulas_finalizadas_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Relatório exportado com sucesso!");
      
    } catch (error) {
      toast.error("Erro ao exportar relatório");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pendente": return "bg-yellow-600 text-yellow-100";
      case "em_producao_aguardando": return "bg-red-600 text-red-100";
      case "producao": return "bg-red-700 text-red-100";
      case "finalizado": return "bg-green-600 text-green-100";
      default: return "bg-gray-600 text-gray-100";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pendente": return "Pendente";
      case "em_producao_aguardando": return "Em Produção (Aguardando)";
      case "producao": return "Produção";
      case "finalizado": return "Finalizado";
      default: return status;
    }
  };

  // Sort espulas by priority (delivery date)
  const sortedEspulas = [...espulas].sort((a, b) => {
    if (a.status === "em_producao_aguardando" || a.status === "producao") {
      if (b.status === "em_producao_aguardando" || b.status === "producao") {
        return new Date(a.data_prevista_entrega) - new Date(b.data_prevista_entrega);
      }
      return -1;
    }
    if (b.status === "em_producao_aguardando" || b.status === "producao") {
      return 1;
    }
    return new Date(a.data_prevista_entrega) - new Date(b.data_prevista_entrega);
  });

  // Separate active and finalized espulas
  const activeEspulas = sortedEspulas.filter(e => e.status !== "finalizado");
  const finalizedEspulas = sortedEspulas.filter(e => e.status === "finalizado");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Gerenciamento de Espulagem</h2>
        <div className="flex space-x-3">
          <Button 
            onClick={() => setShowHistory(!showHistory)} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {showHistory ? "Ocultar Histórico Espulagem" : "Ver Histórico Espulagem"}
          </Button>
          <Button onClick={exportEspulasReport} className="bg-green-600 hover:bg-green-700 text-white">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="btn-merco-large">
            {showForm ? "Cancelar" : "+ LANÇAR"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="card-merco-large">
          <CardHeader>
            <CardTitle className="text-white text-xl">Nova Ordem de Serviço - Espulagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 form-merco">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numero_os">OS (Opcional)</Label>
                <Input
                  id="numero_os"
                  value={espulaData.numero_os}
                  onChange={(e) => setEspulaData({...espulaData, numero_os: e.target.value})}
                  placeholder="Número da OS"
                />
              </div>
              <div>
                <Label htmlFor="maquina">Máquina *</Label>
                <Input
                  id="maquina"
                  value={espulaData.maquina}
                  onChange={(e) => setEspulaData({...espulaData, maquina: e.target.value})}
                  placeholder="Ex: CD1, F2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="mat_prima">Matéria Prima *</Label>
                <Input
                  id="mat_prima"
                  value={espulaData.mat_prima}
                  onChange={(e) => setEspulaData({...espulaData, mat_prima: e.target.value})}
                  placeholder="Matéria prima"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={espulaData.cliente}
                  onChange={(e) => setEspulaData({...espulaData, cliente: e.target.value})}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              <div>
                <Label htmlFor="artigo">Artigo *</Label>
                <Input
                  id="artigo"
                  value={espulaData.artigo}
                  onChange={(e) => setEspulaData({...espulaData, artigo: e.target.value})}
                  placeholder="Artigo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cor">Cor *</Label>
                <Input
                  id="cor"
                  value={espulaData.cor}
                  onChange={(e) => setEspulaData({...espulaData, cor: e.target.value})}
                  placeholder="Cor"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="qtde_fios">Qtde Fios *</Label>
                <Input
                  id="qtde_fios"
                  value={espulaData.qtde_fios}
                  onChange={(e) => setEspulaData({...espulaData, qtde_fios: e.target.value})}
                  placeholder="Quantidade de fios"
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantidade_metros">Qtde Metros *</Label>
                <Input
                  id="quantidade_metros"
                  value={espulaData.quantidade_metros}
                  onChange={(e) => setEspulaData({...espulaData, quantidade_metros: e.target.value})}
                  placeholder="Ex: 1000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_prevista_entrega">Data Entrega *</Label>
                <Input
                  id="data_prevista_entrega"
                  type="date"
                  value={espulaData.data_prevista_entrega}
                  onChange={(e) => setEspulaData({...espulaData, data_prevista_entrega: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="carga">Carga *</Label>
              <Input
                id="carga"
                value={espulaData.carga}
                onChange={(e) => setEspulaData({...espulaData, carga: e.target.value})}
                placeholder="Ex: A1, B2, C123, etc"
                required
              />
            </div>

            <div>
              <Label>Cargas e Fração (até 5 valores - opcional)</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                <Input
                  value={espulaData.carga_fracao_1}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_1: e.target.value})}
                  placeholder="1"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_2}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_2: e.target.value})}
                  placeholder="2"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_3}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_3: e.target.value})}
                  placeholder="3"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_4}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_4: e.target.value})}
                  placeholder="4"
                  type="text"
                />
                <Input
                  value={espulaData.carga_fracao_5}
                  onChange={(e) => setEspulaData({...espulaData, carga_fracao_5: e.target.value})}
                  placeholder="5"
                  type="text"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={espulaData.observacoes}
                onChange={(e) => setEspulaData({...espulaData, observacoes: e.target.value})}
                placeholder="Observações adicionais"
              />
            </div>
            <Button 
              onClick={createEspula} 
              className="w-full btn-merco-large"
              disabled={!espulaData.maquina || !espulaData.mat_prima || !espulaData.cliente || !espulaData.artigo || !espulaData.cor || !espulaData.qtde_fios || !espulaData.quantidade_metros || !espulaData.carga || !espulaData.data_prevista_entrega}
            >
              + LANÇAR ESPULAGEM
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Espulas */}
      {!showHistory && (
        <div className="grid gap-6">
          <h3 className="text-2xl font-bold text-white">Espulagem Ativa</h3>
          {activeEspulas.map((espula) => (
            <Card key={espula.id} className="card-merco-large">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-xl">
                      {espula.numero_os ? `OS ${espula.numero_os}` : `OS #${espula.id.slice(-8)}`} - {espula.cliente}
                    </h3>
                    <p className="text-gray-400 text-lg">Artigo: <span className="text-white">{espula.artigo}</span></p>
                  </div>
                  <Badge className={`${getStatusBadge(espula.status)} font-semibold text-sm`}>
                    {getStatusText(espula.status)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base mb-4">
                  {espula.maquina && (
                    <div>
                      <span className="font-medium text-gray-400">Máquina:</span>
                      <p className="text-white">{espula.maquina}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-400">Cor:</span>
                    <p className="text-white">{espula.cor}</p>
                  </div>
                  {espula.mat_prima && (
                    <div>
                      <span className="font-medium text-gray-400">Mat. Prima:</span>
                      <p className="text-white">{espula.mat_prima}</p>
                    </div>
                  )}
                  {espula.qtde_fios && (
                    <div>
                      <span className="font-medium text-gray-400">Qtde Fios:</span>
                      <p className="text-white">{espula.qtde_fios}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-400">Qtde Metros:</span>
                    <p className="text-white">{espula.quantidade_metros}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Carga:</span>
                    <p className="text-white">{espula.carga}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Data Entrega:</span>
                    <p className="text-white">{formatDateBrazil(espula.data_prevista_entrega)}</p>
                  </div>
                </div>

                {/* Cargas e Fração */}
                {(espula.carga_fracao_1 || espula.carga_fracao_2 || espula.carga_fracao_3 || espula.carga_fracao_4 || espula.carga_fracao_5) && (
                  <div className="mb-4 p-3 bg-gray-800/50 rounded">
                    <span className="font-medium text-gray-400">Cargas e Fração:</span>
                    <div className="flex gap-3 mt-2">
                      {espula.carga_fracao_1 && <span className="text-white px-3 py-1 bg-gray-700 rounded">{espula.carga_fracao_1}</span>}
                      {espula.carga_fracao_2 && <span className="text-white px-3 py-1 bg-gray-700 rounded">{espula.carga_fracao_2}</span>}
                      {espula.carga_fracao_3 && <span className="text-white px-3 py-1 bg-gray-700 rounded">{espula.carga_fracao_3}</span>}
                      {espula.carga_fracao_4 && <span className="text-white px-3 py-1 bg-gray-700 rounded">{espula.carga_fracao_4}</span>}
                      {espula.carga_fracao_5 && <span className="text-white px-3 py-1 bg-gray-700 rounded">{espula.carga_fracao_5}</span>}
                    </div>
                  </div>
                )}

                {/* Time history */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base mb-4 p-4 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <div>
                      <span className="font-medium text-gray-400">Lançado:</span>
                      <p className="text-white">{formatDateTimeBrazil(espula.created_at)}</p>
                    </div>
                  </div>
                  {espula.iniciado_em && (
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-yellow-400" />
                      <div>
                        <span className="font-medium text-gray-400">Iniciado:</span>
                        <p className="text-white">{formatDateTimeBrazil(espula.iniciado_em)}</p>
                      </div>
                    </div>
                  )}
                  {espula.finalizado_em && (
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-green-400" />
                      <div>
                        <span className="font-medium text-gray-400">Finalizado:</span>
                        <p className="text-white">{formatDateTimeBrazil(espula.finalizado_em)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {espula.observacoes && (
                  <p className="text-base text-gray-400 mb-4 p-3 bg-gray-800/50 rounded">
                    <span className="font-medium">Observações:</span> {espula.observacoes}
                  </p>
                )}

                {espula.status !== "finalizado" && (
                  <div className="flex space-x-3">
                    {espula.status === "pendente" && (
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => updateEspulaStatus(espula.id, "em_producao_aguardando")}
                      >
                        Colocar em Produção
                      </Button>
                    )}
                    {espula.status === "em_producao_aguardando" && (
                      <Button
                        className="bg-red-700 hover:bg-red-800 text-white"
                        onClick={() => updateEspulaStatus(espula.id, "producao")}
                      >
                        Iniciar Produção
                      </Button>
                    )}
                    {espula.status === "producao" && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => updateEspulaStatus(espula.id, "finalizado")}
                      >
                        Finalizar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {activeEspulas.length === 0 && (
            <Card className="card-merco-large">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400 text-lg">Nenhuma espulagem ativa. Clique em "+ LANÇAR" para criar a primeira.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History - All Espulas */}
      {showHistory && (
        <div className="grid gap-6">
          <h3 className="text-2xl font-bold text-white">Histórico - Toda Espulagem</h3>
          {sortedEspulas.map((espula) => (
            <Card key={espula.id} className="card-merco-large opacity-75">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-xl">
                      OS #{espula.id.slice(-8)} - {espula.cliente}
                    </h3>
                    <p className="text-gray-400 text-lg">Artigo: <span className="text-white">{espula.artigo}</span></p>
                  </div>
                  <Badge className="bg-green-600 text-green-100 font-semibold text-sm">
                    FINALIZADO
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base mb-4">
                  <div>
                    <span className="font-medium text-gray-400">Cor:</span>
                    <p className="text-white">{espula.cor}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Quantidade (m):</span>
                    <p className="text-white">{espula.quantidade_metros}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Carga:</span>
                    <p className="text-white">{espula.carga}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Criado por:</span>
                    <p className="text-white">{espula.created_by}</p>
                  </div>
                </div>

                {/* Complete time history */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base mb-4 p-4 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <div>
                      <span className="font-medium text-gray-400">Lançado:</span>
                      <p className="text-white">{formatDateTimeBrazil(espula.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <div>
                      <span className="font-medium text-gray-400">Iniciado:</span>
                      <p className="text-white">{formatDateTimeBrazil(espula.iniciado_em)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-400" />
                    <div>
                      <span className="font-medium text-gray-400">Finalizado:</span>
                      <p className="text-white">{formatDateTimeBrazil(espula.finalizado_em)}</p>
                    </div>
                  </div>
                </div>

                {espula.observacoes && (
                  <p className="text-base text-gray-400 p-3 bg-gray-800/50 rounded">
                    <span className="font-medium">Observações:</span> {espula.observacoes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          
          {finalizedEspulas.length === 0 && (
            <Card className="card-merco-large">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400 text-lg">Nenhuma espula finalizada no histórico.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

const MaintenancePanel = ({ maintenances, user, onMaintenanceUpdate, onMachineUpdate }) => {
  const finishMaintenance = async (maintenanceId) => {
    try {
      await axios.put(`${API}/maintenance/${maintenanceId}/finish`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Manutenção finalizada com sucesso!");
      onMaintenanceUpdate();
      onMachineUpdate();
    } catch (error) {
      toast.error("Erro ao finalizar manutenção");
    }
  };

  // CORRIGIR FORMATAÇÃO DE HORÁRIO - CONVERSÃO CORRETA UTC PARA BRASÍLIA  
  const formatDateTimeBrazil = (utcString) => {
    if (!utcString) return "-";
    try {
      // Parse UTC string e converte para horário de Brasília
      const utcDate = new Date(utcString + (utcString.includes('Z') ? '' : 'Z'));
      
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(utcDate);
    } catch (error) {
      console.error('Error formatting date:', error);
      return "-";
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Gerenciamento de Manutenção</h2>
      <div className="grid gap-6">
        {maintenances.map((maintenance) => (
          <Card key={maintenance.id} className="card-merco-large">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-xl">
                    Máquina {maintenance.machine_code}
                  </h3>
                  <p className="text-gray-400 text-lg">Criado por: <span className="text-white">{maintenance.created_by}</span></p>
                </div>
                <Badge className={`${maintenance.status === "em_manutencao" ? "bg-blue-600 text-blue-100" : "bg-green-600 text-green-100"} font-semibold text-sm`}>
                  {maintenance.status === "em_manutencao" ? "EM MANUTENÇÃO" : "FINALIZADA"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base mb-4 p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="font-medium text-gray-400">Iniciado:</span>
                    <p className="text-white">{formatDateTimeBrazil(maintenance.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div>
                    <span className="font-medium text-gray-400">Finalizado:</span>
                    <p className="text-white">{formatDateTimeBrazil(maintenance.finished_at)}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-base text-blue-400 mb-4 p-4 bg-blue-900/20 rounded border border-blue-700">
                <span className="font-medium">Motivo:</span> {maintenance.motivo}
              </p>

              {maintenance.finished_by && (
                <p className="text-base text-gray-400 mb-4">
                  <span className="font-medium">Finalizado por:</span> {maintenance.finished_by}
                </p>
              )}
              
              {maintenance.status === "em_manutencao" && (
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => finishMaintenance(maintenance.id)}
                >
                  Liberar da Manutenção
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AdminPanel = ({ users, onUserUpdate }) => {
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: ""
  });

  const createUser = async () => {
    try {
      await axios.post(`${API}/users`, newUser, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Usuário criado com sucesso!");
      setNewUser({ username: "", email: "", password: "", role: "" });
      onUserUpdate();
    } catch (error) {
      toast.error("Erro ao criar usuário");
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await axios.delete(`${API}/users/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        
        toast.success("Usuário excluído com sucesso!");
        onUserUpdate();
      } catch (error) {
        toast.error("Erro ao excluir usuário");
      }
    }
  };

  const exportReport = async (layoutType) => {
    try {
      const response = await axios.get(`${API}/reports/export?layout_type=${layoutType}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      const data = response.data;
      const wb = XLSX.utils.book_new();
      
      const ordersData = data.orders.map(order => ({
        'ID': order.id,
        'Máquina': order.machine_code,
        'Layout': order.layout_type,
        'Cliente': order.cliente,
        'Artigo': order.artigo,
        'Cor': order.cor,
        'Quantidade': order.quantidade,
        'Status': order.status,
        'Criado por': order.created_by,
        'Criado em': new Date(order.created_at).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}),
        'Iniciado em': order.started_at ? new Date(order.started_at).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}) : '',
        'Finalizado em': order.finished_at ? new Date(order.finished_at).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}) : '',
        'Observação': order.observacao,
        'Obs. Liberação': order.observacao_liberacao,
        'Laudo Final': order.laudo_final
      }));
      
      const ordersWS = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, ordersWS, "Pedidos");
      
      const fileName = `relatorio_merco_textil_${layoutType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar relatório");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Painel de Administração</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-merco-large">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white text-xl">
              <Users className="h-6 w-6 text-red-500" />
              <span>Gerenciar Usuários</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 form-merco">
            <div>
              <Label>Usuário</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                placeholder="Nome de usuário"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Email"
              />
            </div>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder="Senha"
              />
            </div>
            <div>
              <Label>Função</Label>
              <Select onValueChange={(value) => setNewUser({...newUser, role: value})}>
                <SelectTrigger className="bg-black/60 border-gray-600 text-white">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-600">
                  <SelectItem value="admin" className="text-white">Administrador</SelectItem>
                  <SelectItem value="operador_interno" className="text-white">Operador Interno</SelectItem>
                  <SelectItem value="operador_externo" className="text-white">Operador Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createUser} className="w-full btn-merco-large">
              Criar Usuário
            </Button>
            
            <div className="mt-6">
              <h4 className="font-medium mb-4 text-white text-lg">Usuários Existentes</h4>
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-4 bg-black/40 rounded-lg border border-gray-700">
                    <div className="flex items-center space-x-4">
                      <span className="text-white text-base">{user.username}</span>
                      <Badge className={`${
                        user.role === "admin" ? "badge-admin" : 
                        user.role === "operador_interno" ? "badge-interno" : 
                        "badge-externo"
                      } badge-merco`}>
                        {user.role === "admin" ? "Admin" : 
                         user.role === "operador_interno" ? "Interno" : "Externo"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteUser(user.id)}
                      className="text-red-400 border-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-merco-large">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white text-xl">
              <Download className="h-6 w-6 text-red-500" />
              <span>Relatórios Excel</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-3 text-lg">Relatórios de Produção</h3>
              <div className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
                  onClick={() => exportReport("16_fusos")}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Relatório Produção 16 Fusos
                </Button>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
                  onClick={() => exportReport("32_fusos")}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Relatório Produção 32 Fusos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default App;