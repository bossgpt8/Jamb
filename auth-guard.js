import { auth } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { showAuthModal } from './auth-modal.js';

const OVERLAY_ID = 'auth-guard-overlay';

function createOverlay() {
    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:99999',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'backdrop-filter:blur(6px)',
        '-webkit-backdrop-filter:blur(6px)',
        'background:rgba(15,23,42,0.65)'
    ].join(';');

    el.innerHTML = `
        <div style="background:#fff;border-radius:1.5rem;padding:2.5rem 2rem;max-width:420px;width:92%;text-align:center;box-shadow:0 32px 64px rgba(0,0,0,0.3);animation:ag-pop 0.3s ease-out;">
            <style>
                @keyframes ag-pop {
                    from { opacity:0; transform:scale(0.92) translateY(16px); }
                    to   { opacity:1; transform:scale(1)   translateY(0); }
                }
                #auth-guard-btn {
                    background:#2563eb;color:#fff;padding:0.9rem 2rem;
                    border-radius:0.75rem;font-weight:700;font-size:1rem;
                    border:none;cursor:pointer;width:100%;margin-bottom:0.75rem;
                    transition:background 0.2s;
                }
                #auth-guard-btn:hover { background:#1d4ed8; }
            </style>
            <div style="width:72px;height:72px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            </div>
            <h2 style="font-size:1.5rem;font-weight:800;color:#111827;margin:0 0 0.5rem;">Sign In to Continue</h2>
            <p style="color:#6b7280;margin:0 0 1.75rem;line-height:1.5;">Create a free JambGenius account or sign in to access this feature and start preparing for JAMB.</p>
            <button id="auth-guard-btn">Sign In / Create Free Account</button>
            <a href="index.html" style="display:block;color:#9ca3af;font-size:0.875rem;text-decoration:none;margin-top:0.25rem;">← Back to Home</a>
        </div>
    `;

    return el;
}

function mountOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    const overlay = createOverlay();

    const mount = () => {
        if (!document.getElementById(OVERLAY_ID)) {
            document.body.appendChild(overlay);
        }
        const btn = document.getElementById('auth-guard-btn');
        if (btn) {
            btn.addEventListener('click', () => showAuthModal());
        }
    };

    if (document.body) {
        mount();
    } else {
        document.addEventListener('DOMContentLoaded', mount);
    }
}

function removeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
}

// Show overlay immediately while we wait for auth check
mountOverlay();

onAuthStateChanged(auth, (user) => {
    if (user) {
        removeOverlay();
    } else {
        mountOverlay();
    }
});
