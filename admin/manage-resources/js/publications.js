import {
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    limit,
    startAfter,
    addDoc,
    serverTimestamp,
    updateDoc,
    deleteDoc,
  } from "./firebase-config.js";
  
  // DOM Elements
  const container = document.getElementById("publicationsContainer");
  const readMoreModal = new bootstrap.Modal(document.getElementById("readMoreModal"));
  const readMoreTitle = document.getElementById("readMoreTitle");
  const readMoreImage = document.getElementById("readMoreImage");
  const readMoreCategory = document.getElementById("readMoreCategory");
  const readMoreAuthor = document.getElementById("readMoreAuthor");
  const readMoreDate = document.getElementById("readMoreDate");
  const readMoreSummary = document.getElementById("readMoreSummary");
  const form = document.getElementById("publicationsForm");
  const searchInputPublications = document.getElementById("searchInputPublications");

  
  const PAGE_SIZE = 6;
  let lastVisible = null;
  let fullList = [];
  let totalPages = 0;
  let currentPage = 1;
  
  // Short Summary
  function getShortSummary(text) {
    const words = text.trim().split(/\s+/);
    return words.length <= 40 ? text : words.slice(0, 40).join(' ') + '...';
  }


    // Search Functionality
searchInputPublications.addEventListener("input", () => {
    const searchTerm = searchInputPublications.value.trim().toLowerCase();
    
    // Filter the publications based on the search term
    const filteredList = fullList.filter((publication) => {
      const titleMatch = publication.title.toLowerCase().includes(searchTerm);
      const categoryMatch = publication.category.toLowerCase().includes(searchTerm);
      const summaryMatch = publication.summary.toLowerCase().includes(searchTerm);
      return titleMatch || categoryMatch || summaryMatch;
    });
  
    // Render the filtered publications
    renderPublications(filteredList);
    updatePagination(filteredList);
  });
  
  // Fetch Publications and Render
  async function fetchPublications(reset = false) {
    try {
      if (reset) {
        container.innerHTML = "";
        fullList = [];
        lastVisible = null;
        currentPage = 1;
      }
  
      const q = query(
        collection(db, "publications"),
        orderBy("dateModified", "desc"),
        ...(lastVisible ? [startAfter(lastVisible)] : []),
        limit(20)
      );
  
      const snap = await getDocs(q);
      if (!snap.empty) lastVisible = snap.docs[snap.docs.length - 1];
  
      fullList = [
        ...fullList,
        ...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ];
  
      // After fetching, apply search filtering (if there's an active search)
      const searchTerm = searchInputPublications.value.trim().toLowerCase();
      const filteredList = fullList.filter((publication) => {
        const titleMatch = publication.title.toLowerCase().includes(searchTerm);
        const categoryMatch = publication.category.toLowerCase().includes(searchTerm);
        const summaryMatch = publication.summary.toLowerCase().includes(searchTerm);
        return titleMatch || categoryMatch || summaryMatch;
      });
  
      renderPublications(filteredList);
      updatePagination(filteredList);
    } catch (err) {
      console.error("Error fetching publications:", err);
    }
  }
  
  // Pagination Update
  function updatePagination(filteredList) {
    totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
    const pagination = document.getElementById("paginationPublications");
    const maxPagesToShow = 4;
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
    let pageButtons = "";
    for (let i = startPage; i <= endPage; i++) {
      pageButtons += `<li class="page-item ${i === currentPage ? "active" : ""}">
        <button class="page-link" data-page="${i}">${i}</button>
      </li>`;
    }
  
    pagination.innerHTML = `
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <button class="page-link" data-page="${currentPage - 1}">Previous</button>
      </li>
      ${pageButtons}
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <button class="page-link" data-page="${currentPage + 1}">Next</button>
      </li>
    `;
  
    pagination.querySelectorAll("button.page-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          currentPage = page;
          renderPublications(filteredList);
          updatePagination(filteredList);
        }
      });
    });
  }  

  
  // Render Publications
  function renderPublications(list) {
    container.innerHTML = "";
    const start = (currentPage - 1) * PAGE_SIZE;
    const currentSlice = list.slice(start, start + PAGE_SIZE);
  
    currentSlice.forEach((p) => {
      const item = document.createElement("div");
      item.className = "publication-ite d-flex mb-4 pb-3 border-bottom";
      item.innerHTML = `
        <div class="flex-shrink-0 me-3">
          <img src="${p.imageURL || "../../assets/img/lms.jpg"}" class="img-fluid rounded"
            style="width: 120px; height: 100px; object-fit: cover;" />
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge bg-warning text-dark">${p.category}</span>
            <small class="text-muted">Posted on ${new Date(
              p.dateCreated?.toDate?.() || p.dateModified?.toDate?.()
            ).toLocaleDateString()} by ${p.author}</small>
          </div>
          <h6 class="mb-2">${p.title}</h6>
          <p class="text-muted small">${getShortSummary(p.summary)}</p>
          <div class="d-flex justify-content-between">
            <button class="btn btn-sm btn-outline-primary read-more-btn" data-id="${p.id}">Read More</button>
            <div>
              <button class="btn btn-sm btn-outline-info edit" data-id="${p.id}"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn btn-sm btn-outline-danger delete" data-id="${p.id}"><i class="fas fa-trash-alt"></i> Delete</button>
            </div>
          </div>
        </div>`;
      container.appendChild(item);
    });
  
    attachReadMoreHandlers();
  }
  
  // Attach Read More
  function attachReadMoreHandlers() {
    document.querySelectorAll(".read-more-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap = await getDoc(doc(db, "publications", btn.dataset.id));
        if (snap.exists()) {
          const d = snap.data();
          readMoreTitle.textContent = d.title;
          readMoreImage.src = d.imageURL || "placeholder.jpg";
          readMoreCategory.textContent = d.category;
          readMoreAuthor.textContent = d.author;
          readMoreDate.textContent = new Date(d.dateCreated?.toDate?.() || d.dateModified?.toDate?.()).toLocaleString();
          readMoreSummary.textContent = d.summary;
          readMoreModal.show();
        }
      });
    });
  }
  

  // Add or Update Publication
  document.getElementById("publicationsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    // Collect form data by ID
    const title = document.getElementById("publicationTitle").value.trim();
    const author = document.getElementById("publicationAuthor").value.trim();
    const category = document.getElementById("publicationCategory").value.trim();
    const summary = document.getElementById("publicationSummary").value.trim();
    const imageFile = document.getElementById("publicationImage").files[0]; // For image file
    const publicationId = document.getElementById("publicationId").value.trim(); // Hidden input ID
  
    // Ensure image file is handled (if needed for Firestore storage)
    let imageURL = '';
    if (imageFile) {
      // You can upload the image to Firebase Storage here and get the URL if required
      // e.g., imageURL = await uploadImageToFirebaseStorage(imageFile);
    }
  
    const publicationData = {
      title,
      author,
      category,
      imageURL, // leave empty or set from Firebase Storage
      summary,
      dateModified: serverTimestamp(),
    };
  
    try {
      if (publicationId) {
        // Update the existing publication
        await updateDoc(doc(db, "publications", publicationId), publicationData);
        Swal.fire("Updated!", "Publication has been updated.", "success");
      } else {
        // Add new publication
        await addDoc(collection(db, "publications"), {
          ...publicationData,
          dateCreated: serverTimestamp(),
        });
        Swal.fire("Added!", "Publication has been added.", "success");
      }
  
      // Close the modal
      bootstrap.Modal.getInstance(document.getElementById("publicationModal")).hide();
  
      // Fetch updated publications (assuming fetchPublications is a function you already have)
      fetchPublications(true);
  
      // Reset the form
      document.getElementById("publicationsForm").reset();
  
      // Clear hidden ID field after submission
      document.getElementById("publicationId").value = "";
    } catch (error) {
      console.error("Failed to save publication:", error);
      Swal.fire("Error!", "Something went wrong!", "error");
    }
  });
// Modal Add/Update Functionality

// Cancel button should close modal and reset form
document.getElementById("cancelPublicationModal").addEventListener("click", () => {
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("publicationModal")
    );
    modal.hide();
    document.getElementById("publicationsForm").reset();
  });
// Cancel button should close modal and reset form

  
  
// Edit Publication
document.addEventListener("click", async (e) => {
    if (e.target.closest(".edit")) {
      const id = e.target.closest(".edit").dataset.id;
      const snap = await getDoc(doc(db, "publications", id));
      if (snap.exists()) {
        const data = snap.data();
        
        // Set form fields using their IDs directly
        document.getElementById("publicationId").value = id;
        document.getElementById("publicationTitle").value = data.title;
        document.getElementById("publicationAuthor").value = data.author;
        document.getElementById("publicationCategory").value = data.category;
        document.getElementById("publicationSummary").value = data.summary;
        
        // Open modal
        new bootstrap.Modal(document.getElementById("publicationModal")).show();
      }
    }
  });  
// Edit Publication

  
  // Delete Publication
  document.addEventListener("click", async (e) => {
    if (e.target.closest(".delete")) {
      const id = e.target.closest(".delete").dataset.id;
      const confirmResult = await Swal.fire({
        title: "Are you sure?",
        text: "This will permanently delete the publication.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });
  
      if (confirmResult.isConfirmed) {
        try {
          await deleteDoc(doc(db, "publications", id));
          Swal.fire("Deleted!", "Publication has been removed.", "success");
          fetchPublications(true);
        } catch (error) {
          console.error("Delete error:", error);
          Swal.fire("Error!", "Could not delete publication.", "error");
        }
      }
    }
  });
  
  // Initial Fetch
  document.addEventListener("DOMContentLoaded", fetchPublications);
  