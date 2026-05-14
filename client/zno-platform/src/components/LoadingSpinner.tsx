export default function LoadingSpinner() {
    return (
        <div className="spinner-container">
            <div className="loader"></div>
            <style>{`
                .spinner-container { display: flex; justify-content: center; padding: 50px; }
                .loader {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 40px; height: 40px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}