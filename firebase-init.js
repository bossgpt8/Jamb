import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firestore and Storage removed - all data stored in MongoDB
const app = initializeApp(CONFIG.firebase);
export const auth = getAuth(app);
