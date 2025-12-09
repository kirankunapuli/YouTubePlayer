import { useEffect } from 'react';

const GoogleSearch = () => {
    useEffect(() => {
        // Check if script already exists to avoid duplicates
        if (!document.getElementById('gcse-script')) {
            const cx = '004488094107826005610:qizef8dq4is';
            const gcse = document.createElement('script');
            gcse.id = 'gcse-script';
            gcse.type = 'text/javascript';
            gcse.async = true;
            gcse.src = 'https://cse.google.com/cse.js?cx=' + cx;
            const s = document.getElementsByTagName('script')[0];
            s.parentNode.insertBefore(gcse, s);
        }
    }, []);

    return (
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '1rem', minHeight: '400px', background: 'white' }}>
            <h3 style={{ color: '#333', marginBottom: '1rem' }}>Google Video Search (Legacy)</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Tip: Copy the Video ID from the URL in the results and paste it into the Player.
            </p>
            <div className="gcse-search"></div>
        </div>
    );
};

export default GoogleSearch;
