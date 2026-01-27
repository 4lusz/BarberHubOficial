import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function AuthCallback() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);

      if (!sessionIdMatch) {
        toast.error('Sessão inválida');
        navigate('/login');
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const { user, needs_payment } = await loginWithGoogle(sessionId);
        
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
        
        toast.success('Login realizado com sucesso!');
        
        if (user.role === 'barber') {
          if (needs_payment || !user.barbershop_id) {
            navigate('/escolher-plano', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          navigate('/minha-area', { replace: true });
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Erro ao autenticar com Google');
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-primary text-xl mb-2">
          Autenticando...
        </div>
        <p className="text-muted-foreground">Por favor, aguarde</p>
      </div>
    </div>
  );
}
