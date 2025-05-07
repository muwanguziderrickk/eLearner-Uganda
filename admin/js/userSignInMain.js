import { db, collection, doc, getDoc, updateDoc } from "./firebase-config.js";

import { getAuth, signInWithEmailAndPassword } from "./firebase-config.js";

const auth = getAuth();
const usersColRef = collection(db, "users");

// Listen for network errors and alert the user
window.addEventListener("offline", function (event) {
  alert("Network connection lost! Please check your internet connection.");
});

const loginForm = document.getElementById("loginForm");
const emailInp = document.getElementById("emailInp");
const passwordInp = document.getElementById("passwordInp");
const loginBtn = document.getElementById("loginBtn");

// const errorToast = new bootstrap.Toast(document.getElementById("errorToast"));

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
    sessionStorage.setItem(
      "user-credentials",
      JSON.stringify(credentials.user)
    );

    // Toasts
    // Save message to display on the "/admin/manage-resources/"" page(redirect) after successful login
    localStorage.setItem(
      "postLoginToast",
      JSON.stringify({
        message: "✅ Login successful!",
        type: "success",
      })
    );
    // Save message to display on the "/admin/manage-resources/"" page(redirect) after successful login

    setTimeout(() => {
      window.location.href = "/admin/manage-resources/";
    });
  } catch (error) {
    const errorMsg =
      error.message === "User not found"
        ? "⛔ You no longer have access to this site."
        : "❌ Invalid email or password.";

    // Create the toast element
    // Toast Container (top right corner)
    const toastEl = document.createElement("div");
    toastEl.classList.add(
      "toast",
      "align-items-center",
      "text-bg-danger",
      "border-0",
      "position-fixed",
      "top-0",
      "end-0",
      "m-3"
    );
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");

    // Create the toast content
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${errorMsg}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    // Append the toast to the body or a container element
    document.body.appendChild(toastEl);
    // Create and show the toast using Bootstrap's Toast API
    const bsToast = new bootstrap.Toast(toastEl);
    bsToast.show();
    // Optionally remove the toast after it disappears
    toastEl.addEventListener("hidden.bs.toast", () => {
      toastEl.remove(); // Remove the toast from the DOM after it's hidden
    });
  } finally {
    // loginBtn.disabled = false;
    // loginBtn.innerHTML = "Login";
  }
});

// toggles the visibility of the password
document
  .getElementById("togglePassword")
  .addEventListener("click", function () {
    const passwordInput = document.getElementById("passwordInp");
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });
// toggles the visibility of the password
