import {
  db,
  collection,
  addDoc,
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

    row.innerHTML = `
      <td>${index++}</td>
      <td>${user.fullName}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${user.createdAt || "N/A"}</td>
      <td>${user.lastLogin || "N/A"}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1 edit-user" data-id="${
          docSnap.id
        }">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-user" data-id="${
          docSnap.id
        }">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    userTable.appendChild(row);
  });

  attachUserActions();
}

async function saveUser(e) {
  e.preventDefault();

  const id = document.getElementById("userId").value.trim();
  const fullName = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const password = document.getElementById("userPassword")?.value.trim();
  const role = document.getElementById("userRole").value.trim();

  if (!email || !fullName || !role) {
    Swal.fire("Missing info", "Name, email and role are required.", "warning");
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
        return;
      }

      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        Swal.fire("User Exists", "Email is already registered.", "info");
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(usersColRef, {
        fullName,
        email,
        role,
        status: "active",
        createdAt: new Date().toLocaleString(),
        lastLogin: "N/A",
        uid: cred.user.uid,
      });

      Swal.fire("Added!", "User added successfully.", "success");
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("userModal")
    );
    modal.hide();
    loadUsers();
  } catch (error) {
    console.error("Save error:", error);
    Swal.fire("Error", error.message, "error");
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

async function deleteUser(id) {
  const confirm = await Swal.fire({
    title: "Are you sure?",
    text: "This will permanently delete the user!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (confirm.isConfirmed) {
    try {
      await deleteDoc(doc(db, "users", id));
      Swal.fire("Deleted!", "User removed successfully.", "success");
      loadUsers();
    } catch (error) {
      Swal.fire("Error", "Could not delete user.", "error");
    }
  }
}

function attachUserActions() {
  document.querySelectorAll(".edit-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await populateForm(id);
    });
  });

  document.querySelectorAll(".delete-user").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");

      const confirm = await Swal.fire({
        title: "Delete user?",
        text: "This will remove the user from Firestore only.",
        icon: "warning",
        showCancelButton: true,
      });

      if (confirm.isConfirmed) {
        await deleteDoc(doc(db, "users", id));
        Swal.fire("Deleted!", "User removed.", "success");
        loadUsers();
      }
    });
  });
}

function resetUserForm() {
  document.getElementById("userForm").reset();
  document.getElementById("userId").value = "";
  document.getElementById("userEmail").disabled = false;

  // Show password field and re-add 'required'
  const passwordGroup = document.getElementById("passwordGroup");
  const passwordInput = document.getElementById("userPassword");

  if (passwordGroup && passwordInput) {
    passwordGroup.classList.remove("d-none"); // show
    passwordInput.setAttribute("required", ""); // re-add required
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
