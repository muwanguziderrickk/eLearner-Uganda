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
// Save message to display on the login page(redirect) after successful signout
localStorage.setItem(
  "postLogoutToast",
  JSON.stringify({
    message: "👋 You’ve been signed out successfully",
    type: "success",
  })
);
// Save message to display on the login page(redirect) after successful signout

// sign out function
let isSigningOut = false;

document.addEventListener("DOMContentLoaded", () => {
  const userIcon = document.getElementById("userIcon");
  const userMenu = document.getElementById("customUserMenu");
  const userMenuContent = document.getElementById("userMenuContent");
  const signoutButton = document.getElementById("signoutbutton");

  userIcon.addEventListener("click", (e) => {
    e.preventDefault();
    if (!isSigningOut) {
      userMenu.classList.toggle("d-none");
      document.body.classList.toggle("showing-user-menu");
    }
  });

  // Prevent menu from closing if signing out
  document.addEventListener("click", (e) => {
    if (
      !isSigningOut &&
      !userMenu.contains(e.target) &&
      !userIcon.contains(e.target)
    ) {
      userMenu.classList.add("d-none");
      document.body.classList.remove("showing-user-menu");
    }
  });

  async function Signout() {
    if (isSigningOut) return;
    isSigningOut = true;

    userMenuContent.innerHTML = `
      <div class="text-center">
        <div class="spinner-border text-success" role="status"></div>
        <p class="mt-2">Signing out...</p>
      </div>
    `;

    try {
      await signOut(auth); // Ensure Firebase Auth `auth` is already initialized
      sessionStorage.clear();
      setTimeout(() => {
        window.location.href = "/admin/";
      }, 2500);
    } catch (error) {
      console.error("Sign-out error:", error);
      isSigningOut = false;
      userMenuContent.innerHTML = `
        <p class="text-danger">Failed to sign out! Try again.</p>
        <button id="signoutbutton" class="btn btn-sm btn-success w-100 mt-2">
          Try Again <i class="fas fa-sign-out-alt ms-1"></i>
        </button>
      `;
      document
        .getElementById("signoutbutton")
        .addEventListener("click", Signout);
    }
  }

  signoutButton.addEventListener("click", Signout);
});

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
  if (MessageHead) MessageHead.innerText = `${user.email}`;
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
