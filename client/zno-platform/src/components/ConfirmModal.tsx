import { createPortal } from 'react-dom';
import './ConfirmModal.scss';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string; 
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({ 
    isOpen, title, message, 
    confirmText = "Повернутися", 
    cancelText = "Завершити зараз", 
    onConfirm, onCancel 
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{title}</h2>
                <p>{message}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className="btn-primary" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}