import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PhoneInput } from '../components/ui/phone-input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { 
  Crown, 
  Plus, 
  Star,
  Percent,
  Trash2,
  Edit,
  Loader2,
  Phone,
  Search,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function VipClientsPage() {
  const { barbershop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    discount_percentage: '10',
    notes: ''
  });

  const isPremium = barbershop?.plan === 'premium';

  useEffect(() => {
    if (isPremium) {
      loadClients();
    } else {
      setLoading(false);
    }
  }, [isPremium]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vip-clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading VIP clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.client_name || !formData.client_phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    try {
      const data = {
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        client_email: formData.client_email || null,
        discount_percentage: parseFloat(formData.discount_percentage) || 10,
        notes: formData.notes || null
      };

      if (editingClient) {
        await api.put(`/vip-clients/${editingClient.vip_id}`, data);
        toast.success('Cliente atualizado!');
      } else {
        await api.post('/vip-clients', data);
        toast.success('Cliente adicionado como VIP! Ele receberá uma notificação.');
      }

      setShowDialog(false);
      resetForm();
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar');
    }
  };

  const handleDelete = async (vipId) => {
    if (!confirm('Remover este cliente da lista VIP?')) return;

    try {
      await api.delete(`/vip-clients/${vipId}`);
      toast.success('Cliente removido da lista VIP');
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao remover');
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_phone: '',
      client_email: '',
      discount_percentage: '10',
      notes: ''
    });
    setEditingClient(null);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setFormData({
      client_name: client.client_name,
      client_phone: client.client_phone,
      client_email: client.client_email || '',
      discount_percentage: client.discount_percentage.toString(),
      notes: client.notes || ''
    });
    setShowDialog(true);
  };

  const filteredClients = clients.filter(c => 
    c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isPremium) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">
              Clientes VIP
            </h1>
            <p className="text-muted-foreground">
              Marque seus clientes especiais e ofereça descontos automáticos
            </p>
          </div>

          <Card className="border-border border-dashed" data-testid="premium-required-card">
            <CardContent className="py-12 text-center">
              <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Recurso Premium</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Com o Plano Premium você pode marcar clientes como VIP e oferecer 
                descontos automáticos em todos os agendamentos.
              </p>
              <ul className="text-left max-w-sm mx-auto space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Cadastre clientes VIP pelo telefone</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Defina % de desconto personalizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Desconto aplicado automaticamente</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Cliente recebe notificação por WhatsApp</span>
                </li>
              </ul>
              <Button className="btn-press" data-testid="upgrade-button">
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade - R$ 99,90/mês
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight flex items-center gap-2" data-testid="vip-clients-title">
              <Star className="w-8 h-8 text-yellow-500" />
              Clientes VIP
            </h1>
            <p className="text-muted-foreground">
              {clients.length} clientes especiais cadastrados
            </p>
          </div>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-press" data-testid="add-vip-button">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar VIP
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Editar Cliente VIP' : 'Adicionar Cliente VIP'}</DialogTitle>
                <DialogDescription>
                  Clientes VIP recebem desconto automático em todos os serviços
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    data-testid="vip-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    data-testid="vip-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (opcional)</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    data-testid="vip-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="10"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                      className="w-24"
                      data-testid="vip-discount-input"
                    />
                    <span className="text-muted-foreground">% de desconto em todos os serviços</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    placeholder="Ex: Cliente antigo, sempre paga em dinheiro..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    data-testid="vip-notes-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} data-testid="save-vip-button">
                  {editingClient ? 'Salvar' : 'Adicionar VIP'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-vip-input"
          />
        </div>

        {/* Clients List */}
        {clients.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum cliente VIP</h3>
              <p className="text-muted-foreground mb-4">
                Adicione seus clientes especiais para oferecer descontos automáticos
              </p>
              <Button onClick={() => setShowDialog(true)} data-testid="empty-add-vip-button">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro VIP
              </Button>
            </CardContent>
          </Card>
        ) : filteredClients.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum cliente encontrado para "{searchTerm}"
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredClients.map((client) => (
              <Card key={client.vip_id} className="border-border" data-testid={`vip-card-${client.vip_id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Star className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{client.client_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {client.client_phone}
                        </p>
                        {client.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{client.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-500 font-medium">
                          <Percent className="w-4 h-4" />
                          {client.discount_percentage}% OFF
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(client)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(client.vip_id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="border-border bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Como funciona?</h4>
                <p className="text-sm text-muted-foreground">
                  Quando um cliente VIP faz um agendamento e informa o telefone cadastrado, 
                  o sistema automaticamente aplica o desconto configurado no valor final.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
