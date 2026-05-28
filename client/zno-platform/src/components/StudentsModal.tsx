import { createPortal } from "react-dom";
import { Users, GraduationCap } from "lucide-react";
import "./StudentsModal.scss";

interface Student {
  id: string;
  username: string | null;
  email: string;
}

interface StudentsModalProps {
  isOpen: boolean;
  groupName: string;
  students: Student[];
  loading: boolean;
  onClose: () => void;
}

export default function StudentsModal({
  isOpen,
  groupName,
  students,
  loading,
  onClose,
}: StudentsModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-content" onClick={(e) => e.stopPropagation()}>
        <div className="sm-header">
          <div className="sm-title">
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={22} className="sm-icon"/>
                <h2>Список студентів</h2>
              </div>
              <p className="sm-subtitle">{groupName}</p>
            </div>
          </div>
          <button className="sm-close" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>

        <div className="sm-body">
          {loading ? (
            <div className="sm-loading">
              <div className="sm-spinner" />
              <span>Завантаження студентів...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="sm-empty">
              <GraduationCap size={40} className="sm-empty-icon" />
              <p>В групі поки немає студентів.</p>
            </div>
          ) : (
            <>
              <p className="sm-count">
                Всього студентів: <strong>{students.length}</strong>
              </p>
              <ul className="sm-list">
                {students.map((s, i) => (
                  <li key={s.id} className="sm-item">
                    <span className="sm-index">{i + 1}</span>
                    <div className="sm-student-info">
                      <span className="sm-username">{s.username || "—"}</span>
                      <span className="sm-email">{s.email}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="sm-footer">
          <button className="sm-btn-close" onClick={onClose}>
            Закрити
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}