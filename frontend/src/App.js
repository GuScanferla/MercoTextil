import React, { useState, useEffect } from "react";
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
          <h1 className="login-title">Merco Têxtil</h1>
          <p className="login-subtitle">Sistema Industrial de Controle</p>
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
          <div className="mt-6 p-4 bg-black bg-opacity-50 rounded-lg text-sm border border-gray-700">
            <p className="font-semibold mb-2 text-gray-300">Usuários padrão:</p>
            <p className="text-gray-400"><strong className="text-red-400">Admin:</strong> admin / admin123</p>
            <p className="text-gray-400"><strong className="text-blue-400">Interno:</strong> interno / interno123</p>
            <p className="text-gray-400"><strong className="text-orange-400">Externo:</strong> externo / externo123</p>
          </div>
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
            <TabsTrigger value="orders" className="tab-merco">Pedidos</TabsTrigger>
            <TabsTrigger value="espulas" className="tab-merco">Espulas</TabsTrigger>
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

  const getStatusColor = (status) => {
    switch (status) {
      case "verde": return "status-verde";
      case "amarelo": return "status-amarelo";
      case "vermelho": return "status-vermelho";
      case "azul": return "status-azul";
      default: return "status-verde";
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

  // 16 Fusos Layout - EXACT replication based on the user provided image
  const renderLayout16 = () => {
    const renderMachineBox = (machine, key) => {
      if (!machine) return null;
      
      return (
        <div key={key} className={`machine-box-16 ${getStatusColor(machine.status)}`}>
          <span onClick={() => handleMachineClick(machine)} className="machine-code">
            {machine.code}
          </span>
          <button className="maintenance-btn" onClick={() => handleMaintenanceClick(machine)}>
            <Wrench className="h-4 w-4" />
          </button>
        </div>
      );
    };

    // Organize machines by code for easy access
    const machinesByCode = {};
    machines.forEach(machine => {
      machinesByCode[machine.code] = machine;
    });

    return (
      <div className="layout-16-exact">
        {/* Top section */}
        <div className="layout-16-top">
          {/* CD1-CD4 block (2x2) */}
          <div className="cd-block-2x2">
            {renderMachineBox(machinesByCode["CD1"], "cd1")}
            {renderMachineBox(machinesByCode["CD2"], "cd2")}
            {renderMachineBox(machinesByCode["CD3"], "cd3")}
            {renderMachineBox(machinesByCode["CD4"], "cd4")}
          </div>
          
          {/* CD5-CD8 block (2x2) */}
          <div className="cd-block-2x2">
            {renderMachineBox(machinesByCode["CD5"], "cd5")}
            {renderMachineBox(machinesByCode["CD6"], "cd6")}
            {renderMachineBox(machinesByCode["CD7"], "cd7")}
            {renderMachineBox(machinesByCode["CD8"], "cd8")}
          </div>
          
          {/* CD17-CD20 block (1x4 vertical) */}
          <div className="cd-block-1x4">
            {renderMachineBox(machinesByCode["CD17"], "cd17")}
            {renderMachineBox(machinesByCode["CD18"], "cd18")}
            {renderMachineBox(machinesByCode["CD19"], "cd19")}
            {renderMachineBox(machinesByCode["CD20"], "cd20")}
          </div>
        </div>

        {/* Middle section */}
        <div className="layout-16-middle">
          {/* CD9-CD12 block (2x2) */}
          <div className="cd-block-2x2">
            {renderMachineBox(machinesByCode["CD9"], "cd9")}
            {renderMachineBox(machinesByCode["CD10"], "cd10")}
            {renderMachineBox(machinesByCode["CD11"], "cd11")}
            {renderMachineBox(machinesByCode["CD12"], "cd12")}
          </div>
          
          {/* CD13-CD16 block (2x2) */}
          <div className="cd-block-2x2">
            {renderMachineBox(machinesByCode["CD13"], "cd13")}
            {renderMachineBox(machinesByCode["CD14"], "cd14")}
            {renderMachineBox(machinesByCode["CD15"], "cd15")}
            {renderMachineBox(machinesByCode["CD16"], "cd16")}
          </div>
          
          {/* CD21-CD24 block (1x4 vertical) */}
          <div className="cd-block-1x4">
            {renderMachineBox(machinesByCode["CD21"], "cd21")}
            {renderMachineBox(machinesByCode["CD22"], "cd22")}
            {renderMachineBox(machinesByCode["CD23"], "cd23")}
            {renderMachineBox(machinesByCode["CD24"], "cd24")}
          </div>
        </div>

        {/* CI section - labeled as "17 FUSOS" */}
        <div className="layout-16-ci">
          <div className="ci-label">17 FUSOS</div>
          <div className="ci-block-1x4">
            {renderMachineBox(machinesByCode["CI1"], "ci1")}
            {renderMachineBox(machinesByCode["CI2"], "ci2")}
            {renderMachineBox(machinesByCode["CI3"], "ci3")}
            {renderMachineBox(machinesByCode["CI4"], "ci4")}
          </div>
        </div>

        {/* F section - Bottom row (F23 to F1 top, F24 to F2 bottom) */}
        <div className="layout-16-f-section">
          <div className="f-row-top">
            {["F23", "F21", "F19", "F17", "F15", "F13", "F11", "F9", "F7", "F5", "F3", "F1"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
          <div className="f-row-bottom">
            {["F24", "F22", "F20", "F18", "F16", "F14", "F12", "F10", "F8", "F6", "F4", "F2"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
        </div>
      </div>
    );
  };

  // 32 Fusos Layout - EXACT replication based on the user provided image
  const renderLayout32 = () => {
    const renderMachineBox = (machine, key) => {
      if (!machine) return null;
      
      return (
        <div key={key} className={`machine-box-32 ${getStatusColor(machine.status)}`}>
          <span onClick={() => handleMachineClick(machine)} className="machine-code">
            {machine.code}
          </span>
          <button className="maintenance-btn" onClick={() => handleMaintenanceClick(machine)}>
            <Wrench className="h-4 w-4" />
          </button>
        </div>
      );
    };

    // Organize machines by code for easy access
    const machinesByCode = {};
    machines.forEach(machine => {
      machinesByCode[machine.code] = machine;
    });

    return (
      <div className="layout-32-exact">
        {/* Top row CT1-CT24 */}
        <div className="ct-row-container">
          <div className="ct-row-top">
            {["CT1", "CT2", "CT3", "CT4", "CT5", "CT6"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
          <div className="ct-row-bottom">
            {["CT13", "CT14", "CT15", "CT16", "CT17", "CT18", "CT19", "CT20", "CT21", "CT22", "CT23", "CT24"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
          {/* CT7-CT12 positioned separately according to image */}
          <div className="ct-row-middle">
            {["CT7", "CT8", "CT9", "CT10", "CT11", "CT12"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
        </div>

        {/* U groups - 3 columns of 10 machines each */}
        <div className="u-groups-container">
          <div className="u-group">
            {["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
          <div className="u-group">
            {["U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19", "U20"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
          <div className="u-group">
            {["U21", "U22", "U23", "U24", "U25", "U26", "U27", "U28", "U29", "U30"].map(code => 
              renderMachineBox(machinesByCode[code], code.toLowerCase())
            )}
          </div>
        </div>

        {/* N row (N1-N10) */}
        <div className="n-row-container">
          {["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9", "N10"].map(code => 
            renderMachineBox(machinesByCode[code], code.toLowerCase())
          )}
        </div>

        {/* Additional U machines (U31-U33) positioned separately */}
        <div className="u-additional">
          <div className="u-extra-group">
            {renderMachineBox(machinesByCode["U32"], "u32")}
            {renderMachineBox(machinesByCode["U31"], "u31")}
          </div>
          <div className="u-extra-single">
            {renderMachineBox(machinesByCode["U33"], "u33")}
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                    <p className="text-white">{formatDateTime(order.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-orange-400" />
                  <div>
                    <span className="font-medium text-gray-400">Iniciado:</span>
                    <p className="text-white">{formatDateTime(order.started_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div>
                    <span className="font-medium text-gray-400">Finalizado:</span>
                    <p className="text-white">{formatDateTime(order.finished_at)}</p>
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

const EspulasPanel = ({ espulas, user, onEspulaUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [espulaData, setEspulaData] = useState({
    cliente: "",
    artigo: "",
    cor: "",
    quantidade: "",
    observacoes: "",
    data_prevista_entrega: ""
  });

  const createEspula = async () => {
    try {
      await axios.post(`${API}/espulas`, espulaData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Espula lançada com sucesso!");
      setEspulaData({
        cliente: "",
        artigo: "",
        cor: "",
        quantidade: "",
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Gerenciamento de Espulas</h2>
        <Button onClick={() => setShowForm(!showForm)} className="btn-merco-large">
          {showForm ? "Cancelar" : "+ LANÇAR"}
        </Button>
      </div>

      {showForm && (
        <Card className="card-merco-large">
          <CardHeader>
            <CardTitle className="text-white text-xl">Nova Ordem de Serviço - Espula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 form-merco">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="quantidade">Quantidade (em espulas) *</Label>
                <Input
                  id="quantidade"
                  value={espulaData.quantidade}
                  onChange={(e) => setEspulaData({...espulaData, quantidade: e.target.value})}
                  placeholder="Ex: 100, 50 caixas, etc"
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_prevista_entrega">Data Prevista de Entrega *</Label>
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
              disabled={!espulaData.cliente || !espulaData.artigo || !espulaData.cor || !espulaData.quantidade || !espulaData.data_prevista_entrega}
            >
              + LANÇAR ESPULA
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Espulas Cards */}
      <div className="grid gap-6">
        {sortedEspulas.map((espula) => (
          <Card key={espula.id} className="card-merco-large">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-xl">
                    OS #{espula.id.slice(-8)} - {espula.cliente}
                  </h3>
                  <p className="text-gray-400 text-lg">Artigo: <span className="text-white">{espula.artigo}</span></p>
                </div>
                <Badge className={`${getStatusBadge(espula.status)} font-semibold text-sm`}>
                  {getStatusText(espula.status)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base mb-4">
                <div>
                  <span className="font-medium text-gray-400">Cor:</span>
                  <p className="text-white">{espula.cor}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-400">Quantidade:</span>
                  <p className="text-white">{espula.quantidade}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-400">Data Lançamento:</span>
                  <p className="text-white">{formatDate(espula.data_lancamento)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-400">Entrega Prevista:</span>
                  <p className="text-white">{formatDate(espula.data_prevista_entrega)}</p>
                </div>
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
        
        {sortedEspulas.length === 0 && (
          <Card className="card-merco-large">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400 text-lg">Nenhuma espula encontrada. Clique em "+ LANÇAR" para criar a primeira.</p>
            </CardContent>
          </Card>
        )}
      </div>
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                    <p className="text-white">{formatDateTime(maintenance.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div>
                    <span className="font-medium text-gray-400">Finalizado:</span>
                    <p className="text-white">{formatDateTime(maintenance.finished_at)}</p>
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