import {
  db,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
} from "./firebase-config.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signOut,
} from "./firebase-config.js";

const usersColRef = collection(db, "users");
const auth = getAuth();

export async function loadUsers() {
  const snapshot = await getDocs(usersColRef);
  const userTable = document.getElementById("user-table-body");
  userTable.innerHTML = "";
  let index = 1;

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const row = document.createElement("tr");
    const isProtected = user.protected === true;

    row.setAttribute("data-protected", isProtected); // for JS logic
    row.innerHTML = `
      <td>${index++}</td>
      <td>${user.fullName}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${user.createdAt || "N/A"}</td>
      <td>${user.lastLogin || "N/A"}</td>
      ${
        isProtected
          ? `<td>🔒</td>`
          : `
      <td>
        <button class="btn btn-sm btn-primary me-1 edit-user" data-id="${docSnap.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-user" data-id="${docSnap.id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>`
      }
    `;
    userTable.appendChild(row);
  });
  attachUserActions();
}

async function saveUser(e) {
  e.preventDefault();

  const saveBtn = document.getElementById("saveUserBtn");
  const originalBtnHTML = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Saving...`;

  const id = document.getElementById("userId").value.trim();
  const fullName = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const password = document.getElementById("userPassword")?.value.trim();
  const role = document.getElementById("userRole").value.trim();

  if (!email || !fullName || !role) {
    Swal.fire("Missing info", "Name, email and role are required.", "warning");
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalBtnHTML;
    return;
  }

  try {
    if (id) {
      const userRef = doc(db, "users", id);
      await updateDoc(userRef, { fullName, role });
      Swal.fire("Updated!", "User updated successfully.", "success");
    } else {
      if (password.length < 6) {
        Swal.fire(
          "Error",
          "Password must be at least 6 characters.",
          "warning"
        );
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHTML;
        return;
      }

      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        Swal.fire("User Exists", "Email is already registered.", "info");
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHTML;
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        fullName,
        email,
        role,
        createdAt: new Date().toLocaleString(),
        lastLogin: "N/A",
      });

      // Upon confirming swal ok, sign the user out to avoid proceeding in newly created user accout
      Swal.fire({
        title: "User Account Created",
        text: "For security reasons, you will now be signed out because creating a new user automatically logged you into that account.",
        icon: "success",
        confirmButtonText: "OK, Sign me out"
      }).then(async () => {
        localStorage.setItem("postLogoutToast", JSON.stringify({
          message: "You were signed out because a new user session started. Please log in again!",
          type: "info"
        }));
        await signOut(auth);
      });
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("userModal")
    );
    modal.hide();
    resetUserForm();
    loadUsers();
  } catch (error) {
    console.error("Save error:", error);
    Swal.fire("Error", error.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalBtnHTML;
  }
}

async function populateForm(id) {
  try {
    const userDoc = await getDoc(doc(db, "users", id));
    if (!userDoc.exists()) return;

    const data = userDoc.data();

    document.getElementById("userId").value = id;
    document.getElementById("userName").value = data.fullName;
    document.getElementById("userEmail").value = data.email;
    document.getElementById("userEmail").disabled = true;
    document.getElementById("userRole").value = data.role;

    // Hide password field and remove 'required'
    const passwordGroup = document.getElementById("passwordGroup");
    const passwordInput = document.getElementById("userPassword");

    if (passwordGroup && passwordInput) {
      passwordGroup.classList.add("d-none"); // hide
      passwordInput.removeAttribute("required"); // remove required
    }

    const modal = new bootstrap.Modal(document.getElementById("userModal"));
    modal.show();
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Failed to load user data.", "error");
  }
}

function attachUserActions() {
  const currentUserId = auth.currentUser?.uid;

  document.querySelectorAll(".edit-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const row = btn.closest("tr");
      const isProtected = row.getAttribute("data-protected") === "true";
      if (isProtected) {
        Swal.fire("Not Allowed", "This admin account is protected.", "info");
        return;
      }
      await populateForm(id);
    });
  });

  document.querySelectorAll(".delete-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");

      // Prevent deleting own account
      if (id === currentUserId) {
        Swal.fire(
          "Action Denied",
          "You can't delete your own account.",
          "warning"
        );
        return;
      }

      // Check if the account is protected
      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.protected) {
          Swal.fire(
            "Action Denied",
            "This account is protected and cannot be deleted.",
            "warning"
          );
          return;
        }
      }

      // Confirm and delete
      const confirm = await Swal.fire({
        title: "Delete user?",
        text: "This will permanently remove the user from the system.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete",
        cancelButtonText: "Cancel",
      });

      if (confirm.isConfirmed) {
        await deleteDoc(userRef);
        Swal.fire("Deleted!", "User has been removed.", "success");
        loadUsers();
      }
    });
  });
}

function resetUserForm() {
  document.getElementById("userForm").reset();
  document.getElementById("userId").value = "";
  document.getElementById("userEmail").disabled = false;

  const passwordGroup = document.getElementById("passwordGroup");
  const passwordInput = document.getElementById("userPassword");

  if (passwordGroup && passwordInput) {
    passwordGroup.classList.remove("d-none");
    passwordInput.setAttribute("required", "");
    passwordInput.value = ""; // Ensure it clears
  }
}

// Cancel button should close modal and reset form
document.getElementById("cancelUserModal").addEventListener("click", () => {
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("userModal")
  );
  modal.hide();
  resetUserForm();
});

// Reset when modal closes via backdrop or other ways
document
  .getElementById("userModal")
  .addEventListener("hidden.bs.modal", resetUserForm);

// Save form
document.querySelector("#userModal form").addEventListener("submit", saveUser);

// Load initial users
document.addEventListener("DOMContentLoaded", loadUsers);
