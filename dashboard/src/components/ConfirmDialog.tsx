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
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" block className="sm:inline-flex sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={danger ? 'danger' : 'warn'}
            size="md"
            block
            className="sm:inline-flex sm:w-auto"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {okLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-ink-dim">{message}</p>
    </Modal>
  );
}
