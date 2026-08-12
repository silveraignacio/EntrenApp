import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

var firebaseConfig = {
  apiKey: "AIzaSyCC_yfQpTizyFkBr-tsPzS3aMSt79y24wE",
  authDomain: "entrenapp-d0b15.firebaseapp.com",
  projectId: "entrenapp-d0b15",
  storageBucket: "entrenapp-d0b15.firebasestorage.app",
  messagingSenderId: "509318665018",
  appId: "1:509318665018:web:696ea3baa7c6c690fe3603"
};

var app = initializeApp(firebaseConfig);
var auth = getAuth(app);
var db = getFirestore(app);

window.fb = {
  onAuthChange: function (cb) { return onAuthStateChanged(auth, cb); },
  signIn: function (email, pw) { return signInWithEmailAndPassword(auth, email, pw); },
  signUp: function (email, pw) { return createUserWithEmailAndPassword(auth, email, pw); },
  signOut: function () { return signOut(auth); },
  saveData: function (uid, data) { return setDoc(doc(db, "users", uid), data, { merge: true }); },
  loadData: function (uid) {
    return getDoc(doc(db, "users", uid)).then(function (snap) {
      return snap.exists() ? snap.data() : null;
    });
  }
};
window.dispatchEvent(new Event("fb-ready"));
