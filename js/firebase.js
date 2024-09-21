    // Import the functions you need from the SDKs you need

    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
    
    // Firebase 配置什么
    const firebaseConfig = {
      apiKey: "AIzaSyCUEVjMFHilowCjviJSJ8aeWGItRSSvdbY",
      authDomain: "cool-citadel-427909-s2.firebaseapp.com",
      projectId: "cool-citadel-427909-s2",
      storageBucket: "cool-citadel-427909-s2.appspot.com",
      messagingSenderId: "307634775595",
      appId: "1:307634775595:web:c9d1e96d238eede3736c6e"
    };
    
          
        // 初始化 Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        console.log("Auth instance:", auth);
    
        export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged };