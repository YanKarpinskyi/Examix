import { createPortal } from 'react-dom';
import './ConfirmModal.scss';

interface AlertModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
}

export default function AlertModal({ isOpen, message, onClose }: AlertModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Сповіщення</h2>
                <p>{message}</p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button className="btn-primary" onClick={onClose}>
                        Зрозуміло
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}