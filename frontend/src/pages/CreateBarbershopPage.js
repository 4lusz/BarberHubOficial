import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Scissors, Store, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateBarbershopPage() {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/barbershops', { name });
      await checkAuth(); // Refresh user data
      toast.success('Barbearia criada com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar barbearia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="font-heading text-3xl uppercase">
              Crie sua Barbearia
            </CardTitle>
            <CardDescription>
              Último passo! Dê um nome para sua barbearia e comece a receber agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Barbearia</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: Barbearia do João"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    data-testid="barbershop-name-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este nome será exibido para seus clientes
                </p>
              </div>

              <Button
                type="submit"
                className="w-full btn-press"
                disabled={loading}
                data-testid="create-barbershop-button"
              >
                {loading ? 'Criando...' : 'Criar e Começar'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
