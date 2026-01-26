import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Plus, Pencil, Trash2, Scissors, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    duration: 30,
    price: 0,
    description: '',
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      setServices(response.data.filter(s => s.active));
    } catch (error) {
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        duration: service.duration,
        price: service.price,
        description: service.description || '',
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        duration: 30,
        price: 0,
        description: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingService) {
        await api.put(`/services/${editingService.service_id}`, formData);
        toast.success('Serviço atualizado!');
      } else {
        await api.post('/services', formData);
        toast.success('Serviço criado!');
      }
      setIsDialogOpen(false);
      fetchServices();
    } catch (error) {
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Tem certeza que deseja remover este serviço?')) return;
    
    try {
      await api.delete(`/services/${serviceId}`);
      toast.success('Serviço removido!');
      fetchServices();
    } catch (error) {
      toast.error('Erro ao remover serviço');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
            Serviços
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os serviços oferecidos pela sua barbearia
          </p>
        </div>
        <Button onClick={() => openDialog()} className="btn-press" data-testid="add-service-button">
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seus serviços para começar a receber agendamentos
            </p>
            <Button onClick={() => openDialog()} data-testid="add-first-service-button">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Serviço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card
              key={service.service_id}
              className="border-border hover:border-primary/50 transition-colors"
              data-testid={`service-card-${service.service_id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-heading text-xl">{service.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDialog(service)}
                      data-testid={`edit-service-${service.service_id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(service.service_id)}
                      data-testid={`delete-service-${service.service_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {service.description && (
                  <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{service.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl uppercase">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do serviço</Label>
              <Input
                id="name"
                placeholder="Ex: Corte de cabelo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="service-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  step={5}
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  required
                  data-testid="service-duration-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                  data-testid="service-price-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o serviço..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="service-description-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-press" data-testid="save-service-button">
                {editingService ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
