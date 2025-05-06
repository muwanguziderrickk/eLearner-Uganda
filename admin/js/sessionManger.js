import { db, doc, getDoc } from "./firebase-config.js";
import { getAuth, onAuthStateChanged, signOut } from "./firebase-config.js";

const auth = getAuth();
const MessageHead = document.getElementById("message");
const GreetHead = document.getElementById("greet");
const SignoutBtn = document.getElementById("signoutbutton");

// Listen for network errors and alert the user
window.addEventListener("offline", function (event) {
  alert("Network connection lost! Please check your internet connection.");
});

// Role-based UI Elements
const adminOnly = document.querySelectorAll(".admin-only");
const managerOnly = document.querySelectorAll(".manager-only");

// Toasts
// Inject Signout Toast HTML into the DOM
const injectSignoutToast = () => {
  const toastHTML = `
      <div class="toast-container position-fixed top-0 end-0 p-3">
        <div id="signoutToast" class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">👋 You’ve been signed out successfully.</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>
    `;
  document.body.insertAdjacentHTML("beforeend", toastHTML);
};

// Call it immediately so toast is ready
injectSignoutToast();

const signoutToast = new bootstrap.Toast(
  document.getElementById("signoutToast")
);

// sign out function
let isSigningOut = false; // global flag

const Signout = async () => {
  try {
    isSigningOut = true; // set flag to prevent redirect
    await signOut(auth);
    sessionStorage.clear();
    signoutToast.show();

    setTimeout(() => {
      window.location.href = "/admin/";
    }, 2500);
  } catch (error) {
    console.error("Sign-out failed:", error);
  }
};

// Check session and fetch user info from Firestore
// JS: hide loader only when auth is verified
const CheckCredentials = async () => {
  onAuthStateChanged(auth, async (user) => {
    const loader = document.getElementById("loader");
    const main = document.getElementById("main-content");

    if (!user) {
      sessionStorage.clear();
      if (!isSigningOut) {
        window.location.href = "/admin/";
      }
      return;
    }

    const storedCreds = JSON.parse(sessionStorage.getItem("user-credentials"));
    const storedInfo = JSON.parse(sessionStorage.getItem("user-information"));

    // If no session data or UID mismatch, fetch fresh data
    if (!storedCreds || !storedInfo || storedCreds.uid !== user.uid) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userInfo = docSnap.data();
          sessionStorage.setItem(
            "user-credentials",
            JSON.stringify({ email: user.email, uid: user.uid })
          );
          sessionStorage.setItem("user-information", JSON.stringify(userInfo));

          updateUI(user, userInfo);
        } else {
          console.warn("No user data found in Firestore");
          Signout();
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        Swal.fire("Error", "Failed to fetch user info.", "error");
      }
    } else {
      updateUI(user, storedInfo);
    }

    if (loader) loader.style.display = "none";
    if (main) main.style.display = "block";
  });
};

function updateUI(user, userInfo) {
  if (MessageHead) MessageHead.innerText = `"${user.email}"`;
  if (GreetHead) GreetHead.innerText = `Hi, ${userInfo.fullName}!`;

  if (userInfo.role === "Admin") {
    adminOnly.forEach((el) => (el.style.display = "block"));
    managerOnly.forEach((el) => (el.style.display = "none"));
  } else if (userInfo.role === "Manager") {
    adminOnly.forEach((el) => (el.style.display = "none"));
    managerOnly.forEach((el) => (el.style.display = "block"));
  } else {
    adminOnly.forEach((el) => (el.style.display = "none"));
    managerOnly.forEach((el) => (el.style.display = "none"));
  }
}

// Start check
CheckCredentials();

// Signout button
window.addEventListener("load", () => {
  if (SignoutBtn) {
    SignoutBtn.addEventListener("click", Signout);
  }
});
