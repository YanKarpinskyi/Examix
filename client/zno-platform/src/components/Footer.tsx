export default function Footer() {
    return (
        <footer style={{ marginTop: 'auto', padding: '40px 20px', textAlign: 'center', backgroundColor: '#0e443c', borderTop: '1px solid #eee' }}>
            <p style={{ color: '#666', marginBottom: '8px' }}>
                &copy; {new Date().getFullYear()} <strong>Examix</strong>. All rights reserved.
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
                Developed by KNU student — <span style={{ color: '#ffffff', fontWeight: 600 }}>Yan Karpinskyi</span>
            </p>
        </footer>
    );
}