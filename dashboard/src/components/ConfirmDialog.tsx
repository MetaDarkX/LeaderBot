import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function ConfirmDialog({
  open,
  title,
  message,
  okLabel = 'Confirmar',
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  okLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={danger ? 'danger' : 'warn'}
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {okLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-dim">{message}</p>
    </Modal>
  );
}
