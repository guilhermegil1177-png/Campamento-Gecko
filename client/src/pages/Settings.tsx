import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useNotificationManager } from '@/hooks/useNotificationManager';
import { Bell, Wifi, WifiOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Settings Page - Configurações e testes
 */
export default function Settings() {
  const { getDays, saveDays } = useOfflineStorage();
  const { requestNotificationPermission, checkAndSendNotifications } =
    useNotificationManager();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState<string>('Verificando...');
  const [cacheSize, setCacheSize] = useState<string>('0 MB');

  useEffect(() => {
    // Verificar status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          if (registrations.length > 0) {
            setSwStatus('✅ Service Worker ativo');
          } else {
            setSwStatus('⚠️ Service Worker não registrado');
          }
        })
        .catch(() => setSwStatus('❌ Erro ao verificar Service Worker'));
    } else {
      setSwStatus('❌ Service Worker não suportado');
    }

    // Calcular tamanho do cache
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
        setCacheSize(`${usedMB} MB`);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast.success('Notificações ativadas!');
    } else {
      toast.error('Permissão de notificações recusada');
    }
  };

  const handleTestNotification = async () => {
    await checkAndSendNotifications();
    toast.info('Verificação de notificações concluída');
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
      toast.success('Cache limpo com sucesso');
      setCacheSize('0 MB');
    }
  };

  const handleClearData = async () => {
    if (confirm('Tem a certeza que quer apagar todos os dados?')) {
      await saveDays([]);
      toast.success('Dados apagados');
      // Recarregar página
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-muted pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-2 border-warm-tan bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-forest-green" style={{ fontFamily: "'Playfair Display', serif" }}>
            Configurações
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Status Section */}
        <Card className="p-6 border-2 border-warm-tan">
          <h2 className="text-xl font-bold text-charcoal mb-4">Status da Aplicação</h2>

          <div className="space-y-3">
            {/* Online Status */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <span className="font-semibold">Conexão</span>
              </div>
              <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Service Worker Status */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-semibold">Service Worker</span>
              <span className="text-sm">{swStatus}</span>
            </div>

            {/* Cache Size */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-semibold">Tamanho do Cache</span>
              <span className="text-sm">{cacheSize}</span>
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card className="p-6 border-2 border-warm-tan">
          <h2 className="text-xl font-bold text-charcoal mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </h2>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Receba notificações 10 minutos antes de cada atividade
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleRequestNotifications}
                className="flex-1 bg-forest-green hover:bg-forest-green/90"
              >
                Ativar Notificações
              </Button>

              <Button
                onClick={handleTestNotification}
                variant="outline"
                className="flex-1"
              >
                Testar Notificações
              </Button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <p>
                💡 <strong>Dica:</strong> Permita notificações no seu navegador para receber alertas de atividades.
              </p>
            </div>
          </div>
        </Card>

        {/* Storage Section */}
        <Card className="p-6 border-2 border-warm-tan">
          <h2 className="text-xl font-bold text-charcoal mb-4">Armazenamento</h2>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Gerencie o cache e os dados armazenados localmente
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleClearCache}
                variant="outline"
                className="flex-1"
              >
                Limpar Cache
              </Button>

              <Button
                onClick={handleClearData}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar Dados
              </Button>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
              <p>
                ⚠️ <strong>Aviso:</strong> Apagar dados é irreversível. Certifique-se de fazer backup antes.
              </p>
            </div>
          </div>
        </Card>

        {/* Info Section */}
        <Card className="p-6 border-2 border-warm-tan">
          <h2 className="text-xl font-bold text-charcoal mb-4">Sobre</h2>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Camp Daily Scheduler</strong> v1.0.0
            </p>
            <p>
              Aplicação PWA para gerir esquemas diários de acampamento com suporte offline e notificações.
            </p>
            <p className="pt-2">
              ✅ Funciona offline<br />
              ✅ Notificações automáticas<br />
              ✅ Sincronização de dados<br />
              ✅ Compatível com iPhone
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
