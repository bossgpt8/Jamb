import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCSVbZVsBO8luLUT-HznUQe57FGRZ_2U5g",
  authDomain: "jambgenius.firebaseapp.com",
  projectId: "jambgenius",
  storageBucket: "jambgenius.firebasestorage.app",
  messagingSenderId: "1057264829205",
  appId: "1:1057264829205:web:384c075641553eacd95f1c",
  measurementId: "G-ZTDYRGNW4N"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app
