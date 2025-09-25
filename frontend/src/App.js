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
import { LogOut, Users, Download, Settings, Factory, Trash2, Wrench, Clock } from "lucide-react";
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
                <span className="merco-textil">êxtil</span>
              </div>
            </div>
          </div>
          <h1 className="login-title">Controle de Produção</h1>
          <p className="login-subtitle">Sistema Industrial Merco Têxtil</p>
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <div className="merco-logo-header">
                <div className="merco-logo-bg-small">
                  <span className="merco-text-small">Merco</span>
                  <div className="merco-t-line-small"></div>
                  <span className="merco-textil-small">êxtil</span>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-600"></div>
              <span className="text-lg font-medium text-gray-300">Controle de Produção</span>
              <Badge className={`${badge.class} badge-merco`}>
                {badge.text}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Olá, <span className="text-white font-medium">{user.username}</span></span>
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
              <h2 className="text-2xl font-bold text-white">Painel de Fusos</h2>
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
        machine_number: selectedMachine.number,
        layout_type: layout,
        ...orderData,
        quantidade: parseInt(orderData.quantidade)
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
        machine_number: maintenanceMachine.number,
        layout_type: layout,
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

  // New 16 Fusos Layout with 48 machines exactly as requested
  const renderLayout16 = () => {
    const machineMap = {};
    machines.forEach(machine => {
      machineMap[`${machine.number}-${machine.layout_type}`] = machine;
    });

    const renderMachineBox = (num, key = null) => {
      const machine = machineMap[`${num}-${layout}`];
      const uniqueKey = key || `machine-${num}-${layout}`;
      
      return (
        <div key={uniqueKey} className={`machine-box ${getStatusColor(machine?.status)}`}>
          <span onClick={() => handleMachineClick(machine)}>{num}</span>
          <button className="maintenance-btn" onClick={() => handleMaintenanceClick(machine)}>
            <Wrench className="h-3 w-3" />
          </button>
        </div>
      );
    };

    return (
      <div className="layout-16-new-48">
        {/* Grid of 48 machines organized in 6 rows x 8 columns */}
        <div className="layout-16-grid-48">
          {Array.from({ length: 48 }, (_, i) => {
            const machineNum = i + 1;
            return renderMachineBox(machineNum, `grid-${machineNum}`);
          })}
        </div>
      </div>
    );
  };

  // 32 Fusos Layout - with unique identification
  const renderLayout32 = () => {
    const machineMap = {};
    machines.forEach(machine => {
      machineMap[`${machine.number}-${machine.layout_type}`] = machine;
    });

    const renderMachineBox = (num, key = null) => {
      const machine = machineMap[`${num}-${layout}`];
      const uniqueKey = key || `machine-${num}-${layout}`;
      
      return (
        <div key={uniqueKey} className={`machine-box ${getStatusColor(machine?.status)}`}>
          <span onClick={() => handleMachineClick(machine)}>{num}</span>
          <button className="maintenance-btn" onClick={() => handleMaintenanceClick(machine)}>
            <Wrench className="h-3 w-3" />
          </button>
        </div>
      );
    };

    return (
      <div className="layout-32-exact">
        {/* Top row - 12 machines */}
        <div className="layout-32-top-row">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => 
            renderMachineBox(num, `top-${num}`)
          )}
        </div>

        {/* Second row - 6 machines (15-20) */}
        <div className="layout-32-second-row">
          {[15,16,17,18,19,20].map(num => 
            renderMachineBox(num, `second-${num}`)
          )}
        </div>

        {/* Three vertical groups */}
        <div className="layout-32-vertical-groups">
          {/* Group 1 (1-10) */}
          <div className="layout-32-vertical-group">
            {[1,3,5,7,9,2,4,6,8,10].map((num, index) => 
              renderMachineBox(num, `group1-${index}-${num}`)
            )}
          </div>

          {/* Group 2 (11-20) */}
          <div className="layout-32-vertical-group">
            {[11,13,15,17,19,12,14,16,18,20].map((num, index) => 
              renderMachineBox(num, `group2-${index}-${num}`)
            )}
          </div>

          {/* Group 3 (21-30) */}
          <div className="layout-32-vertical-group">
            {[21,23,25,27,29,22,24,26,28,30].map((num, index) => 
              renderMachineBox(num, `group3-${index}-${num}`)
            )}
          </div>
        </div>

        {/* Bottom row - 6 machines (1-6) */}
        <div className="layout-32-bottom-row">
          {[1,2,3,4,5,6].map(num => 
            renderMachineBox(num, `bottom-${num}`)
          )}
        </div>

        {/* Final 3 machines (31-33) */}
        <div className="layout-32-final">
          {renderMachineBox(32, "final-32")}
          {renderMachineBox(31, "final-31")}
          {renderMachineBox(33, "final-33")}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="fusos-container card-merco">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 text-white">
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
        <DialogContent className="dialog-merco">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">
              Novo Pedido - Máquina {selectedMachine?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6 form-merco">
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                value={orderData.cliente}
                onChange={(e) => setOrderData({...orderData, cliente: e.target.value})}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <Label htmlFor="artigo">Artigo</Label>
              <Input
                id="artigo"
                value={orderData.artigo}
                onChange={(e) => setOrderData({...orderData, artigo: e.target.value})}
                placeholder="Artigo"
              />
            </div>
            <div>
              <Label htmlFor="cor">Cor</Label>
              <Input
                id="cor"
                value={orderData.cor}
                onChange={(e) => setOrderData({...orderData, cor: e.target.value})}
                placeholder="Cor"
              />
            </div>
            <div>
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                value={orderData.quantidade}
                onChange={(e) => setOrderData({...orderData, quantidade: e.target.value})}
                placeholder="Quantidade"
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
            <Button onClick={handleOrderSubmit} className="w-full btn-merco">
              Criar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={!!maintenanceMachine} onOpenChange={() => setMaintenanceMachine(null)}>
        <DialogContent className="dialog-merco">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">
              Colocar em Manutenção - Máquina {maintenanceMachine?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6 form-merco">
            <div>
              <Label htmlFor="motivo">Motivo da Manutenção</Label>
              <Textarea
                id="motivo"
                value={maintenanceData.motivo}
                onChange={(e) => setMaintenanceData({...maintenanceData, motivo: e.target.value})}
                placeholder="Descreva o motivo da manutenção"
                required
              />
            </div>
            <Button onClick={handleMaintenanceSubmit} className="w-full btn-merco">
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
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Gerenciamento de Pedidos</h2>
      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id} className="card-merco">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">
                    Máquina {order.machine_number} - {order.layout_type.replace('_', ' ')}
                  </h3>
                  <p className="text-gray-400">Cliente: <span className="text-white">{order.cliente}</span></p>
                </div>
                <Badge className={`${getStatusBadge(order.status)} font-semibold`}>
                  {order.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4 p-3 bg-gray-900/50 rounded">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <div>
                    <span className="font-medium text-gray-400">Criado:</span>
                    <p className="text-white">{formatDateTime(order.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <div>
                    <span className="font-medium text-gray-400">Iniciado:</span>
                    <p className="text-white">{formatDateTime(order.started_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-400" />
                  <div>
                    <span className="font-medium text-gray-400">Finalizado:</span>
                    <p className="text-white">{formatDateTime(order.finished_at)}</p>
                  </div>
                </div>
              </div>
              
              {order.observacao && (
                <p className="text-sm text-gray-400 mb-4">
                  <span className="font-medium">Observação:</span> {order.observacao}
                </p>
              )}

              {order.laudo_final && (
                <p className="text-sm text-green-400 mb-4 p-3 bg-green-900/20 rounded border border-green-700">
                  <span className="font-medium">Laudo Final:</span> {order.laudo_final}
                </p>
              )}
              
              {(user.role === "admin" || user.role === "operador_externo") && order.status !== "finalizado" && (
                <div className="flex space-x-2">
                  {order.status === "pendente" && (
                    <Button
                      size="sm"
                      className="btn-merco"
                      onClick={() => updateOrder(order.id, "em_producao")}
                    >
                      Iniciar Produção
                    </Button>
                  )}
                  {order.status === "em_producao" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
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
              Finalizar Produção - Máquina {selectedOrder?.machine_number}
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
            <div className="flex space-x-2">
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "em_manutencao": return "bg-blue-600 text-blue-100";
      case "finalizada": return "bg-green-600 text-green-100";
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
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Gerenciamento de Manutenção</h2>
      <div className="grid gap-4">
        {maintenances.map((maintenance) => (
          <Card key={maintenance.id} className="card-merco">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">
                    Máquina {maintenance.machine_number} - {maintenance.layout_type.replace('_', ' ')}
                  </h3>
                  <p className="text-gray-400">Criado por: <span className="text-white">{maintenance.created_by}</span></p>
                </div>
                <Badge className={`${getStatusBadge(maintenance.status)} font-semibold`}>
                  {maintenance.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4 p-3 bg-gray-900/50 rounded">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <div>
                    <span className="font-medium text-gray-400">Iniciado:</span>
                    <p className="text-white">{formatDateTime(maintenance.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-400" />
                  <div>
                    <span className="font-medium text-gray-400">Finalizado:</span>
                    <p className="text-white">{formatDateTime(maintenance.finished_at)}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-blue-400 mb-4 p-3 bg-blue-900/20 rounded border border-blue-700">
                <span className="font-medium">Motivo:</span> {maintenance.motivo}
              </p>

              {maintenance.finished_by && (
                <p className="text-sm text-gray-400 mb-4">
                  <span className="font-medium">Finalizado por:</span> {maintenance.finished_by}
                </p>
              )}
              
              {maintenance.status === "em_manutencao" && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
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
      
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Orders sheet
      const ordersData = data.orders.map(order => ({
        'ID': order.id,
        'Máquina': order.machine_number,
        'Layout': order.layout_type,
        'Cliente': order.cliente,
        'Artigo': order.artigo,
        'Cor': order.cor,
        'Quantidade': order.quantidade,
        'Status': order.status,
        'Criado por': order.created_by,
        'Criado em': new Date(order.created_at).toLocaleString('pt-BR'),
        'Iniciado em': order.started_at ? new Date(order.started_at).toLocaleString('pt-BR') : '',
        'Finalizado em': order.finished_at ? new Date(order.finished_at).toLocaleString('pt-BR') : '',
        'Observação': order.observacao,
        'Obs. Liberação': order.observacao_liberacao,
        'Laudo Final': order.laudo_final
      }));
      
      const ordersWS = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, ordersWS, "Pedidos");
      
      // Status History sheet
      const historyData = data.status_history.map(hist => ({
        'ID': hist.id,
        'Máquina': hist.machine_number,
        'Layout': hist.layout_type,
        'Status Anterior': hist.old_status,
        'Novo Status': hist.new_status,
        'Alterado por': hist.changed_by,
        'Data/Hora': new Date(hist.changed_at).toLocaleString('pt-BR'),
        'ID Pedido': hist.order_id || ''
      }));
      
      const historyWS = XLSX.utils.json_to_sheet(historyData);
      XLSX.utils.book_append_sheet(wb, historyWS, "Histórico Status");
      
      // Summary sheet
      const summaryData = [
        { 'Informação': 'Layout', 'Valor': data.layout_type },
        { 'Informação': 'Total de Pedidos', 'Valor': data.orders.length },
        { 'Informação': 'Pedidos Pendentes', 'Valor': data.orders.filter(o => o.status === 'pendente').length },
        { 'Informação': 'Em Produção', 'Valor': data.orders.filter(o => o.status === 'em_producao').length },
        { 'Informação': 'Finalizados', 'Valor': data.orders.filter(o => o.status === 'finalizado').length },
        { 'Informação': 'Relatório Gerado em', 'Valor': new Date(data.generated_at).toLocaleString('pt-BR') }
      ];
      
      const summaryWS = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, "Resumo");
      
      // Save file
      const fileName = `relatorio_merco_textil_${layoutType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error('Export error details:', error.response?.data || error.message);
      toast.error(`Erro ao exportar relatório: ${error.response?.data?.detail || error.message}`);
    }
  };

  const exportMaintenanceReport = async (layoutType) => {
    try {
      const response = await axios.get(`${API}/reports/maintenance?layout_type=${layoutType}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      const data = response.data;
      
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Maintenance sheet
      const maintenanceData = data.maintenance.map(maint => ({
        'ID': maint.id,
        'Máquina': maint.machine_number,
        'Layout': maint.layout_type,
        'Motivo': maint.motivo,
        'Status': maint.status,
        'Criado por': maint.created_by,
        'Iniciado em': new Date(maint.created_at).toLocaleString('pt-BR'),
        'Finalizado em': maint.finished_at ? new Date(maint.finished_at).toLocaleString('pt-BR') : '',
        'Finalizado por': maint.finished_by || ''
      }));
      
      const maintenanceWS = XLSX.utils.json_to_sheet(maintenanceData);
      XLSX.utils.book_append_sheet(wb, maintenanceWS, "Manutenções");
      
      // Status History sheet (maintenance related)
      const historyData = data.status_history.map(hist => ({
        'ID': hist.id,
        'Máquina': hist.machine_number,
        'Layout': hist.layout_type,
        'Status Anterior': hist.old_status,
        'Novo Status': hist.new_status,
        'Alterado por': hist.changed_by,
        'Data/Hora': new Date(hist.changed_at).toLocaleString('pt-BR'),
        'ID Manutenção': hist.maintenance_id || ''
      }));
      
      const historyWS = XLSX.utils.json_to_sheet(historyData);
      XLSX.utils.book_append_sheet(wb, historyWS, "Histórico Manutenção");
      
      // Save file
      const fileName = `relatorio_manutencao_${layoutType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("Relatório de manutenção exportado com sucesso!");
    } catch (error) {
      console.error('Maintenance export error:', error.response?.data || error.message);
      toast.error(`Erro ao exportar relatório de manutenção: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Painel de Administração</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Management */}
        <Card className="card-merco">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5 text-red-500" />
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
            <Button onClick={createUser} className="w-full btn-merco">
              Criar Usuário
            </Button>
            
            <div className="mt-6">
              <h4 className="font-medium mb-2 text-white">Usuários Existentes</h4>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-3 bg-black/40 rounded border border-gray-700">
                    <div className="flex items-center space-x-3">
                      <span className="text-white">{user.username}</span>
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

        {/* Reports */}
        <Card className="card-merco">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Download className="h-5 w-5 text-red-500" />
              <span>Relatórios Excel</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-white font-medium mb-3">Relatórios de Produção</h3>
              <div className="space-y-3 mb-6">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => exportReport("16_fusos")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Relatório Produção 16 Fusos
                </Button>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => exportReport("32_fusos")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Relatório Produção 32 Fusos
                </Button>
              </div>

              <h3 className="text-white font-medium mb-3">Relatórios de Manutenção</h3>
              <div className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => exportMaintenanceReport("16_fusos")}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Relatório Manutenção 16 Fusos
                </Button>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => exportMaintenanceReport("32_fusos")}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Relatório Manutenção 32 Fusos
                </Button>
              </div>

              <div className="mt-4 p-3 bg-blue-500/20 rounded border border-blue-500/30">
                <p className="text-blue-300 text-sm">
                  <strong>Relatórios incluem:</strong> Dados completos, histórico de status, 
                  laudos finais e informações organizadas em planilhas separadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default App;