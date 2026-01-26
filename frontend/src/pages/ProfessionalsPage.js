import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const response = await api.get('/professionals');
      setProfessionals(response.data.filter(p => p.active));
    } catch (error) {
      toast.error('Erro ao carregar profissionais');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (professional = null) => {
    if (professional) {
      setEditingProfessional(professional);
      setFormData({
        name: professional.name,
        phone: professional.phone || '',
        email: professional.email || '',
      });
    } else {
      setEditingProfessional(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingProfessional) {
        await api.put(`/professionals/${editingProfessional.professional_id}`, formData);
        toast.success('Profissional atualizado!');
      } else {
        await api.post('/professionals', formData);
        toast.success('Profissional adicionado!');
      }
      setIsDialogOpen(false);
      fetchProfessionals();
    } catch (error) {
      toast.error('Erro ao salvar profissional');
    }
  };

  const handleDelete = async (professionalId) => {
    if (!window.confirm('Tem certeza que deseja remover este profissional?')) return;
    
    try {
      await api.delete(`/professionals/${professionalId}`);
      toast.success('Profissional removido!');
      fetchProfessionals();
    } catch (error) {
      toast.error('Erro ao remover profissional');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-lg" />
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
            Profissionais
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a equipe da sua barbearia
          </p>
        </div>
        <Button onClick={() => openDialog()} className="btn-press" data-testid="add-professional-button">
          <Plus className="w-4 h-4 mr-2" />
          Novo Profissional
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-border bg-primary/5">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> Adicione profissionais para que os clientes possam 
            escolher com quem desejam ser atendidos. Se não adicionar nenhum, os agendamentos 
            serão feitos diretamente com a barbearia.
          </p>
        </CardContent>
      </Card>

      {/* Professionals Grid */}
      {professionals.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione membros da sua equipe (opcional)
            </p>
            <Button onClick={() => openDialog()} data-testid="add-first-professional-button">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Profissional
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionals.map((professional) => (
            <Card
              key={professional.professional_id}
              className="border-border hover:border-primary/50 transition-colors"
              data-testid={`professional-card-${professional.professional_id}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">
                        {professional.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">{professional.name}</h3>
                      {professional.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {professional.phone}
                        </p>
                      )}
                      {professional.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {professional.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDialog(professional)}
                      data-testid={`edit-professional-${professional.professional_id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(professional.professional_id)}
                      data-testid={`delete-professional-${professional.professional_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
              {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome do profissional"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="professional-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="professional-phone-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="professional-email-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-press" data-testid="save-professional-button">
                {editingProfessional ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
