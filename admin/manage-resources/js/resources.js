import {
  db,
  ref,
  storage,
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  limit,
  startAfter,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "./firebase-config.js";

// DOM Elements
const form = document.querySelector("#resourceModal form");
const modalElement = document.getElementById("resourceModal");
const resourceModal = new bootstrap.Modal(modalElement);
const container = document.querySelector("#resources .row");
const searchInput = document.getElementById("searchInput");
const pagination = document.querySelector("#paginationResources");
const loadingIndicator = document.getElementById("loadingIndicator");

const idField = document.getElementById("resourceId");
const titleField = document.getElementById("resourceTitle");
const categoryField = document.getElementById("resourceCategory");
const authorField = document.getElementById("resourceAuthor");
const imageField = document.getElementById("resourceImage");
const fileField = document.getElementById("resourceFile");

const PAGE_SIZE = 6;
let lastVisible = null;
let fullList = [];
let isSaving = false;
let abortController = null;
let totalPages = 0;
let currentPage = 1;

function resetForm() {
  form.reset();
  idField.value = "";
}


function validateFile(file, allowedTypes, maxSizeMB, fileTypeLabel = "File") {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: `Invalid ${fileTypeLabel} type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      message: `${fileTypeLabel} size must be less than ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
}


function showLoading() {
  const loader = document.getElementById("loadingSpinner");
  if (loader) loader.style.display = "block";
}
function hideLoading() {
  const loader = document.getElementById("loadingSpinner");
  if (loader) loader.style.display = "none";
}


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSaving) return;

  isSaving = true;
  abortController = new AbortController();

  const submitBtn = form.querySelector("#saveResource");
  submitBtn.disabled = true;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

  showLoading();

  const id = idField.value || doc(collection(db, "resources")).id;
  const title = titleField.value.trim();
  const category = categoryField.value;
  const author = authorField.value.trim();
  const now = new Date().toISOString();

  const image = imageField.files[0];
  const docFile = fileField.files[0];

  let imageURL = null;
  let fileURL = null;

  const resourceRef = doc(db, "resources", id);
  const existingDoc = await getDoc(resourceRef);
  const oldData = existingDoc.exists() ? existingDoc.data() : {};

  try {
    if (image) {
      const imageValidation = validateFile(
        image,
        ["image/jpeg", "image/png"],
        5,
        "Image"
      );      
      if (!imageValidation.valid) {
        Swal.fire("Error", imageValidation.message, "error");
        return;
      }

      const imgRef = ref(storage, `eLibraryAndBlog/resourceImages/${id}/${image.name}`);
      await uploadBytes(imgRef, image);
      imageURL = await getDownloadURL(imgRef);

      if (oldData.imageURL && oldData.imageURL !== imageURL) {
        await deleteObject(ref(storage, oldData.imageURL));
      }
    }

    if (docFile) {
      const docValidation = validateFile(
        docFile,
        [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-powerpoint",
        ],
        50,
        "Document"
      );      
      if (!docValidation.valid) {
        Swal.fire("Error", docValidation.message, "error");
        return;
      }

      const fileRef = ref(storage, `eLibraryAndBlog/resourceFiles/${id}/${docFile.name}`);
      await uploadBytes(fileRef, docFile);
      fileURL = await getDownloadURL(fileRef);

      if (oldData.fileURL && oldData.fileURL !== fileURL) {
        await deleteObject(ref(storage, oldData.fileURL));
      }
    }

    const newData = {
      title,
      category,
      author,
      imageURL: imageURL || oldData.imageURL || "",
      fileURL: fileURL || oldData.fileURL || "",
      dateModified: now,
    };

    if (!existingDoc.exists()) newData.dateCreated = now;

    await setDoc(resourceRef, newData, { merge: true });

    Swal.fire("Success", "Resource uploaded successfully!", "success");
    await fetchResources(true);
    resourceModal.hide();
    resetForm();
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("Upload cancelled.");
    } else {
      console.error("Upload error:", err);
      Swal.fire("Error", "Error uploading. Check console.", "error");
    }
  } finally {
    isSaving = false;
    abortController = null;
    hideLoading();
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});


async function fetchResources(reset = false) {
  showLoading();
  try {
    if (reset) {
      container.innerHTML = "";
      fullList = [];
      lastVisible = null;
      currentPage = 1;
    }

    const q = query(
      collection(db, "resources"),
      orderBy("dateModified", "desc"),
      ...(lastVisible ? [startAfter(lastVisible)] : []),
      limit(20) // Load more in full list for filtering and pagination
    );

    const snap = await getDocs(q);
    if (!snap.empty) lastVisible = snap.docs[snap.docs.length - 1];

    fullList = [
      ...fullList,
      ...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    ];
    totalPages = Math.ceil(fullList.length / PAGE_SIZE);
    renderResources(fullList);
    updatePagination();
  } catch (err) {
    console.error("Error fetching resources:", err);
  } finally {
    hideLoading();
  }
}

function renderResources(list) {
  container.innerHTML = "";
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const currentSlice = list.slice(start, end);

  currentSlice.forEach((r) => {
    const card = document.createElement("div");
    card.className = "col-md-6 col-lg-4";
    card.innerHTML = `
        <div class="card shadow-sm mb-4">
            <div class="card-body">
                <img class="w-100 mb-2" src="${
                  r.imageURL || "../../assets/img/lmscover.png"
                }" alt="Image" style="height: 100px; object-fit: cover;">
                <h6 class="mb-2">${r.title}</h6>
                <p class="mb-1"><strong>Category:</strong> ${r.category}</p>
                <p class="mb-1"><strong>Author:</strong> ${r.author}</p>
                <p class="text-muted small">Uploaded: ${new Date(
                  r.dateCreated || r.dateModified
                ).toLocaleDateString()}</p>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-info editResource" data-id="${
                      r.id
                    }"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-outline-danger deleteResource" data-id="${
                      r.id
                    }"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
                <div class="mt-2 d-flex justify-content-between">
                    <a href="${
                      r.fileURL
                    }" target="_blank" class="btn btn-sm btn-primary w-100 me-1"><i class="fas fa-eye"></i> Read</a>
                    <a href="${
                      r.fileURL
                    }" download class="btn btn-sm btn-outline-secondary"><i class="fas fa-download"></i></a>
                </div>
            </div>
        </div>`;
    container.appendChild(card);
  });

  attachEditDeleteHandlers();
}

function attachEditDeleteHandlers() {
  container.querySelectorAll(".editResource").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const snap = await getDoc(doc(db, "resources", id));
      if (!snap.exists()) return;

      const data = snap.data();
      idField.value = id;
      titleField.value = data.title;
      categoryField.value = data.category;
      authorField.value = data.author;
      resourceModal.show();
    });
  });

  container.querySelectorAll(".deleteResource").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");

      Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then(async (result) => {
        if (result.isConfirmed) {
          const refDoc = doc(db, "resources", id);
          const snap = await getDoc(refDoc);
          if (!snap.exists()) return;

          const data = snap.data();
          await deleteDoc(refDoc);
          if (data.imageURL) await deleteObject(ref(storage, data.imageURL));
          if (data.fileURL) await deleteObject(ref(storage, data.fileURL));

          fullList = fullList.filter((item) => item.id !== id);
          totalPages = Math.ceil(fullList.length / PAGE_SIZE);
          renderResources(fullList);
          updatePagination();
          Swal.fire("Deleted!", "The resource has been deleted.", "success");
        }
      });
    });
  });
}

// Cancel button should close modal and reset form
document.getElementById("cancelResourceModal").addEventListener("click", () => {
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("resourceModal")
  );
  modal.hide();
  
  // Clear hidden ID
  idField.value = "";

  // Abort any saving
  if (isSaving && abortController) {
    abortController.abort();  // Trigger AbortError
  }

  // Reset form
  document.getElementById("resourceForm").reset();

  // Optional: also reset button and spinner if something broke mid-way
  const submitBtn = form.querySelector("#submitBtn");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Save Changes";
  }
});


// Search Functionality
searchInput.addEventListener("input", () => {
  const value = searchInput.value.toLowerCase();
  const filtered = fullList.filter(
    (r) =>
      r.title.toLowerCase().includes(value) ||
      r.category.toLowerCase().includes(value) ||
      r.author.toLowerCase().includes(value)
  );
  currentPage = 1;
  totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  renderResources(filtered);
  updatePagination();
});

function updatePagination() {
  const maxPagesToShow = 4;
  const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  let pageButtons = "";
  for (let i = startPage; i <= endPage; i++) {
    pageButtons += `
        <button 
          class="btn mx-1 px-3 py-1 rounded-pill ${
            i === currentPage ? "btn-primary" : "btn-secondary"
          }"
          onclick="goToPage(${i})"
        >
          ${i}
        </button>
      `;
  }

  pagination.innerHTML = `
      <div class="d-flex justify-content-center flex-wrap gap-2 mt-3">
        <button class="btn btn-secondary px-3 py-1 rounded-pill" 
          ${currentPage === 1 ? "disabled" : ""} 
          onclick="changePage('prev')">
          &laquo; Previous
        </button>
        ${pageButtons}
        <button class="btn btn-secondary px-3 py-1 rounded-pill" 
          ${currentPage === totalPages ? "disabled" : ""} 
          onclick="changePage('next')">
          Next &raquo;
        </button>
      </div>
    `;
}

function changePage(direction) {
  if (direction === "next" && currentPage < totalPages) {
    currentPage++;
  } else if (direction === "prev" && currentPage > 1) {
    currentPage--;
  }
  renderResources(fullList);
  updatePagination();
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderResources(fullList);
    updatePagination();
  }
}

window.changePage = function (direction) {
  if (direction === "prev" && currentPage > 1) {
    currentPage--;
  } else if (direction === "next" && currentPage < totalPages) {
    currentPage++;
  }
  renderResources(fullList);
  updatePagination();
};

window.goToPage = function (pageNumber) {
  currentPage = pageNumber;
  renderResources(fullList);
  updatePagination();
};

// Initial load
fetchResources(true);
