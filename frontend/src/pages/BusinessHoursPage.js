import { useState, useEffect } from 'react';
import api from '../lib/api';
import { getDayName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

const defaultHours = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  start_time: '09:00',
  end_time: '18:00',
  is_closed: i === 6, // Sunday closed
}));

export default function BusinessHoursPage() {
  const [hours, setHours] = useState(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      const response = await api.get('/business-hours');
      if (response.data.length > 0) {
        // Ensure all days are present
        const hoursMap = new Map(response.data.map(h => [h.day_of_week, h]));
        const completeHours = defaultHours.map(dh => hoursMap.get(dh.day_of_week) || dh);
        setHours(completeHours);
      }
    } catch (error) {
      toast.error('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  };

  const updateHour = (dayIndex, field, value) => {
    setHours(prev => prev.map((h, i) => 
      i === dayIndex ? { ...h, [field]: value } : h
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/business-hours', hours);
      toast.success('Horários salvos com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64 rounded" />
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
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
            Horários de Funcionamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure os dias e horários de atendimento
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="btn-press" data-testid="save-hours-button">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Hours List */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Configuração Semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hours.map((hour, index) => (
            <div
              key={hour.day_of_week}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border"
              data-testid={`day-${hour.day_of_week}`}
            >
              <div className="flex items-center justify-between sm:w-32">
                <span className="font-medium">{getDayName(hour.day_of_week)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={!hour.is_closed}
                  onCheckedChange={(checked) => updateHour(index, 'is_closed', !checked)}
                  data-testid={`switch-${hour.day_of_week}`}
                />
                <span className="text-sm text-muted-foreground">
                  {hour.is_closed ? 'Fechado' : 'Aberto'}
                </span>
              </div>

              {!hour.is_closed && (
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Das</Label>
                    <Input
                      type="time"
                      value={hour.start_time}
                      onChange={(e) => updateHour(index, 'start_time', e.target.value)}
                      className="w-28"
                      data-testid={`start-time-${hour.day_of_week}`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">às</Label>
                    <Input
                      type="time"
                      value={hour.end_time}
                      onChange={(e) => updateHour(index, 'end_time', e.target.value)}
                      className="w-28"
                      data-testid={`end-time-${hour.day_of_week}`}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-border bg-primary/5">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> Os clientes só poderão agendar nos dias e 
            horários configurados aqui. Certifique-se de manter os horários atualizados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
