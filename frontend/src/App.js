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
import { LogOut, Users, Download, Settings } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold text-gray-800">Sistema de Fusos</CardTitle>
          <p className="text-gray-600 mt-2">Faça login para continuar</p>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm">
            <p className="font-semibold mb-2">Usuários padrão:</p>
            <p><strong>Admin:</strong> admin / admin123</p>
            <p><strong>Interno:</strong> interno / interno123</p>
            <p><strong>Externo:</strong> externo / externo123</p>
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

  useEffect(() => {
    loadMachines();
    loadOrders();
    if (user.role === "admin") {
      loadUsers();
    }
  }, [activeLayout, user.role]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Fusos</h1>
              <Badge variant="outline" className="text-sm">
                {user.role === "admin" ? "Administrador" : 
                 user.role === "operador_interno" ? "Op. Interno" : "Op. Externo"}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Olá, {user.username}</span>
              <Button variant="outline" size="sm" onClick={onLogout}>
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            {user.role === "admin" && <TabsTrigger value="admin">Administração</TabsTrigger>}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Painel de Fusos</h2>
              <div className="flex space-x-2">
                <Button
                  variant={activeLayout === "16_fusos" ? "default" : "outline"}
                  onClick={() => setActiveLayout("16_fusos")}
                >
                  16 Fusos
                </Button>
                <Button
                  variant={activeLayout === "32_fusos" ? "default" : "outline"}
                  onClick={() => setActiveLayout("32_fusos")}
                >
                  32 Fusos
                </Button>
              </div>
            </div>

            <FusosPanel 
              layout={activeLayout} 
              machines={machines} 
              user={user}
              onMachineUpdate={loadMachines}
              onOrderUpdate={loadOrders}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersPanel orders={orders} user={user} onOrderUpdate={loadOrders} />
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

const FusosPanel = ({ layout, machines, user, onMachineUpdate, onOrderUpdate }) => {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [orderData, setOrderData] = useState({
    cliente: "",
    artigo: "",
    cor: "",
    quantidade: "",
    observacao: ""
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "verde": return "bg-green-500 hover:bg-green-600";
      case "amarelo": return "bg-yellow-500 hover:bg-yellow-600";
      case "vermelho": return "bg-red-500 hover:bg-red-600";
      default: return "bg-gray-500";
    }
  };

  const handleMachineClick = (machine) => {
    if (user.role === "admin" || user.role === "operador_interno") {
      if (machine.status === "verde") {
        setSelectedMachine(machine);
      }
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

  const renderLayout16 = () => {
    const machineGroups = [
      { numbers: [1, 2, 3, 4], position: "top-left" },
      { numbers: [5, 6, 7, 8], position: "top-center" },
      { numbers: [17, 18, 19, 20], position: "top-right" },
      { numbers: [21, 22, 23, 24], position: "middle-right" },
      { numbers: [9, 10, 11, 12], position: "bottom-left" },
      { numbers: [13, 14, 15, 16], position: "bottom-center" }
    ];

    return (
      <div className="relative w-full h-96 bg-gray-100 rounded-lg p-4">
        {machineGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={`absolute grid grid-cols-2 grid-rows-2 gap-1 ${getGroupPosition(group.position)}`}
          >
            {group.numbers.map((num) => {
              const machine = machines.find(m => m.number === num);
              return (
                <div
                  key={num}
                  className={`w-16 h-16 ${getStatusColor(machine?.status || "verde")} 
                    text-white font-bold text-sm flex items-center justify-center 
                    border-2 border-gray-800 cursor-pointer transition-all duration-200 
                    hover:scale-105 active:scale-95`}
                  onClick={() => handleMachineClick(machine)}
                >
                  {num}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderLayout32 = () => {
    const topRow = Array.from({ length: 12 }, (_, i) => i + 1);
    const middleRow = Array.from({ length: 6 }, (_, i) => i + 15);
    const bottomGroups = [
      { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], position: "bottom-left" },
      { numbers: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], position: "bottom-center" },
      { numbers: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30], position: "bottom-right" }
    ];

    return (
      <div className="space-y-6">
        {/* Top row */}
        <div className="grid grid-cols-12 gap-2">
          {topRow.map((num) => {
            const machine = machines.find(m => m.number === num);
            return (
              <div
                key={num}
                className={`h-16 ${getStatusColor(machine?.status || "verde")} 
                  text-white font-bold text-sm flex items-center justify-center 
                  border-2 border-gray-800 cursor-pointer transition-all duration-200 
                  hover:scale-105 active:scale-95`}
                onClick={() => handleMachineClick(machine)}
              >
                {num}
              </div>
            );
          })}
        </div>

        {/* Middle row */}
        <div className="flex justify-center">
          <div className="grid grid-cols-6 gap-2">
            {middleRow.map((num) => {
              const machine = machines.find(m => m.number === num);
              return (
                <div
                  key={num}
                  className={`h-16 w-16 ${getStatusColor(machine?.status || "verde")} 
                    text-white font-bold text-sm flex items-center justify-center 
                    border-2 border-gray-800 cursor-pointer transition-all duration-200 
                    hover:scale-105 active:scale-95`}
                  onClick={() => handleMachineClick(machine)}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom groups */}
        <div className="grid grid-cols-3 gap-4">
          {bottomGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="grid grid-cols-2 grid-rows-5 gap-1">
              {group.numbers.map((num) => {
                const machine = machines.find(m => m.number === num);
                return (
                  <div
                    key={num}
                    className={`h-16 ${getStatusColor(machine?.status || "verde")} 
                      text-white font-bold text-sm flex items-center justify-center 
                      border-2 border-gray-800 cursor-pointer transition-all duration-200 
                      hover:scale-105 active:scale-95`}
                    onClick={() => handleMachineClick(machine)}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom single boxes */}
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-2">
            {[32, 31, 33].map((num) => {
              const machine = machines.find(m => m.number === num);
              return (
                <div
                  key={num}
                  className={`h-16 w-16 ${getStatusColor(machine?.status || "verde")} 
                    text-white font-bold text-sm flex items-center justify-center 
                    border-2 border-gray-800 cursor-pointer transition-all duration-200 
                    hover:scale-105 active:scale-95`}
                  onClick={() => handleMachineClick(machine)}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getGroupPosition = (position) => {
    switch (position) {
      case "top-left": return "top-4 left-4";
      case "top-center": return "top-4 left-1/2 transform -translate-x-1/2";
      case "top-right": return "top-4 right-4";
      case "middle-right": return "top-1/2 right-4 transform -translate-y-1/2";
      case "bottom-left": return "bottom-4 left-4";
      case "bottom-center": return "bottom-4 left-1/2 transform -translate-x-1/2";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">
            Layout {layout === "16_fusos" ? "16" : "32"} Fusos
          </h3>
          <div className="flex space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Livre</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Pendente</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Em Uso</span>
            </div>
          </div>
        </div>
        
        {layout === "16_fusos" ? renderLayout16() : renderLayout32()}
      </div>

      {/* Order Dialog */}
      <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pedido - Máquina {selectedMachine?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button onClick={handleOrderSubmit} className="w-full">
              Criar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const OrdersPanel = ({ orders, user, onOrderUpdate }) => {
  const updateOrder = async (orderId, status, observacao = "") => {
    try {
      await axios.put(`${API}/orders/${orderId}`, {
        status,
        observacao_liberacao: observacao
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("Pedido atualizado com sucesso!");
      onOrderUpdate();
    } catch (error) {
      toast.error("Erro ao atualizar pedido");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pendente: "bg-yellow-100 text-yellow-800",
      em_producao: "bg-red-100 text-red-800",
      finalizado: "bg-green-100 text-green-800"
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Pedidos</h2>
      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold">Máquina {order.machine_number} - {order.layout_type}</h3>
                  <p className="text-sm text-gray-600">Cliente: {order.cliente}</p>
                </div>
                <Badge className={getStatusBadge(order.status)}>
                  {order.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Artigo:</span> {order.artigo}
                </div>
                <div>
                  <span className="font-medium">Cor:</span> {order.cor}
                </div>
                <div>
                  <span className="font-medium">Quantidade:</span> {order.quantidade}
                </div>
                <div>
                  <span className="font-medium">Criado por:</span> {order.created_by}
                </div>
              </div>
              
              {order.observacao && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Observação:</span> {order.observacao}
                </p>
              )}
              
              {(user.role === "admin" || user.role === "operador_externo") && order.status !== "finalizado" && (
                <div className="mt-4 flex space-x-2">
                  {order.status === "pendente" && (
                    <Button
                      size="sm"
                      onClick={() => updateOrder(order.id, "em_producao")}
                    >
                      Iniciar Produção
                    </Button>
                  )}
                  {order.status === "em_producao" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrder(order.id, "finalizado")}
                    >
                      Finalizar
                    </Button>
                  )}
                </div>
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

  const exportReport = async (layoutType) => {
    try {
      const response = await axios.get(`${API}/reports/export?layout_type=${layoutType}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_${layoutType}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar relatório");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Administração</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Gerenciar Usuários</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador_interno">Operador Interno</SelectItem>
                  <SelectItem value="operador_externo">Operador Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createUser} className="w-full">
              Criar Usuário
            </Button>
            
            <div className="mt-6">
              <h4 className="font-medium mb-2">Usuários Existentes</h4>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{user.username}</span>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Relatórios</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Exporte relatórios com histórico de status das máquinas e pedidos.
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => exportReport("16_fusos")}
                >
                  Exportar Relatório 16 Fusos
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => exportReport("32_fusos")}
                >
                  Exportar Relatório 32 Fusos
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