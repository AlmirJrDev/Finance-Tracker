export const playNotificationSound = () => {
  const audio = new Audio('/pop_notification.mp3'); // Substitua pelo caminho real do seu arquivo de som
  audio.play().catch(error => {
    console.error('Erro ao tocar o som de notificação:', error);
  });
};