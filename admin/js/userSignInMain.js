import {
  db,
  collection,
  doc,
  getDoc,
  updateDoc,
} from "./firebase-config.js";

import {
  getAuth,
  signInWithEmailAndPassword,
} from "./firebase-config.js";

const auth = getAuth();
const usersColRef = collection(db, "users");

// Listen for network errors and alert the user
window.addEventListener('offline', function(event) {
  alert('Network connection lost! Please check your internet connection.');
});

const loginForm = document.getElementById("loginForm");
const emailInp = document.getElementById("emailInp");
const passwordInp = document.getElementById("passwordInp");
const loginBtn = document.getElementById("loginBtn");

const successToast = new bootstrap.Toast(document.getElementById("successToast"));
const errorToast = new bootstrap.Toast(document.getElementById("errorToast"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Prepare button for loading state
  loginBtn.disabled = true;
  loginBtn.innerHTML = `
    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    Signing in...
  `;

  const email = emailInp.value;
  const password = passwordInp.value;
  const lastLoginTime = new Date().toLocaleString();

  try {
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    const uid = credentials.user.uid;

    const userDocRef = doc(db, "users", uid);
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) throw new Error("User not found");

    const userData = userSnapshot.data();

    await updateDoc(userDocRef, { lastLogin: lastLoginTime });

    sessionStorage.setItem("user-information", JSON.stringify(userData));
    sessionStorage.setItem("user-credentials", JSON.stringify(credentials.user));

    successToast.show();

    setTimeout(() => {
      window.location.href = "/admin/manage-resources/";
    }, 1500);
  } catch (error) {
    const errorMsg = error.message === "User not found"
      ? "⛔ You no longer have access to this site."
      : "❌ Invalid email or password.";

    document.getElementById("errorToast").querySelector(".toast-body").textContent = errorMsg;
    errorToast.show();
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = "Login";
  }
});

// toggles the visibility of the password
document.getElementById("togglePassword").addEventListener("click", function () {
  const passwordInput = document.getElementById("passwordInp");
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});
// toggles the visibility of the password

