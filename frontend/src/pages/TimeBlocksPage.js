import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar } from '../components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Trash2, Clock, Ban, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TimeBlocksPage() {
  const [blocks, setBlocks] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '18:00',
    reason: '',
    professional_id: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [blocksRes, profsRes] = await Promise.all([
        api.get('/time-blocks'),
        api.get('/professionals'),
      ]);
      setBlocks(blocksRes.data);
      setProfessionals(profsRes.data.filter(p => p.active));
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setFormData({
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '18:00',
      reason: '',
      professional_id: null,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/time-blocks', {
        ...formData,
        professional_id: formData.professional_id === 'all' ? null : formData.professional_id,
      });
      toast.success('Bloqueio criado!');
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar bloqueio');
    }
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm('Tem certeza que deseja remover este bloqueio?')) return;
    
    try {
      await api.delete(`/time-blocks/${blockId}`);
      toast.success('Bloqueio removido!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao remover bloqueio');
    }
  };

  const getProfessionalName = (profId) => {
    if (!profId) return 'Toda a barbearia';
    const prof = professionals.find(p => p.professional_id === profId);
    return prof?.name || 'Desconhecido';
  };

  // Group blocks by date
  const blocksByDate = blocks.reduce((acc, block) => {
    if (!acc[block.date]) {
      acc[block.date] = [];
    }
    acc[block.date].push(block);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(blocksByDate).sort().reverse();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64 rounded" />
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
            Bloqueios de Horário
          </h1>
          <p className="text-muted-foreground mt-1">
            Bloqueie horários específicos para impedir agendamentos
          </p>
        </div>
        <Button onClick={openDialog} className="btn-press" data-testid="add-block-button">
          <Plus className="w-4 h-4 mr-2" />
          Novo Bloqueio
        </Button>
      </div>

      {/* Info */}
      <Card className="border-border bg-primary/5">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> Use bloqueios para marcar férias, 
            almoço, compromissos pessoais ou qualquer período em que não poderá atender clientes.
            Os bloqueios podem ser para toda a barbearia ou para profissionais específicos.
          </p>
        </CardContent>
      </Card>

      {/* Blocks List */}
      {blocks.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Ban className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum bloqueio cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione bloqueios para impedir agendamentos em horários específicos
            </p>
            <Button onClick={openDialog} data-testid="add-first-block-button">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Bloqueio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <Card key={date} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  {formatDate(date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {blocksByDate[date].map((block) => (
                  <div
                    key={block.block_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                    data-testid={`block-${block.block_id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{block.start_time} - {block.end_time}</span>
                      </div>
                      <div className="border-l border-border pl-4">
                        <p className="text-sm text-muted-foreground">
                          {getProfessionalName(block.professional_id)}
                        </p>
                        {block.reason && (
                          <p className="text-sm">{block.reason}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(block.block_id)}
                      data-testid={`delete-block-${block.block_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl uppercase">
              Novo Bloqueio
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') });
                  }
                }}
                locale={ptBR}
                className="rounded-md border mx-auto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Início</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  data-testid="block-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Fim</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  data-testid="block-end-time"
                />
              </div>
            </div>

            {professionals.length > 0 && (
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select
                  value={formData.professional_id || 'all'}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    professional_id: value === 'all' ? null : value 
                  })}
                >
                  <SelectTrigger data-testid="block-professional-select">
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda a barbearia</SelectItem>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.professional_id} value={prof.professional_id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                placeholder="Ex: Férias, Almoço, Compromisso..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                data-testid="block-reason"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-press" data-testid="save-block-button">
                Criar Bloqueio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
