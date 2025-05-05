import {
    db,
    query,
    orderBy,
    collection,
    doc,
    getDoc,
    getDocs,
  } from "../../admin/manage-resources/js/firebase-config.js";

  let currentPage = 1;
const postsPerPage = 6;
let filteredPublications = [];

  
  // Target container and search input
  const container = document.getElementById("publication-container");
  const resourceSearchInput = document.getElementById("resourceSearchInput");
  
  let allPublications = []; // Store all fetched publications
  
  // Fetch and render publications ordered by latest
  async function loadPublications() {
    const pubCollection = query(
      collection(db, "publications"),
      orderBy("dateCreated", "desc")
    );
    const pubSnapshot = await getDocs(pubCollection);
  
    allPublications = pubSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  
    filteredPublications = allPublications; // Initialize
    renderPublications(filteredPublications);
    attachSearchHandler();
    attachReadMoreHandlers();
  }
  
  
  // Render filtered or full publication list
  function renderPublications(publications) {
    container.innerHTML = "";
  
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedItems = publications.slice(startIndex, endIndex);
  
    paginatedItems.forEach((pub) => {
      const post = document.createElement("div");
      post.className =
        "post-item d-flex flex-wrap align-items-start py-4 border-bottom";
      post.innerHTML = `
          <div class="d-flex flex-wrap align-items-center text-muted mb-2 small">
            <span class="badge bg-primary me-2">${pub.category || ""}</span> &nbsp; &nbsp;
            <span class="me-3"><i class="fas fa-calendar-alt me-1"></i> ${new Date(
              pub.dateCreated?.toDate?.() || pub.dateModified?.toDate?.()
            ).toLocaleDateString()}</span>
            &nbsp; &nbsp;<span><i class="fas fa-user-circle me-1"></i> ${
              pub.author || "Admin"
            }</span>
          </div>
          <a href="#" class="continue-reading" data-id="${pub.id}">
          <h3 class="fw-semibold mb-2">${pub.title}</h3>
          <div class="post-img me-4" style="flex: 0 0 220px;">
            <img src="${pub.imageURL}" alt="Post Image"
                 class="img-fluid rounded"
                 style="height: 300px; object-fit: cover; width: 100%;">
          </div>
          </a>
          <div class="post-content" style="flex: 1 1 auto;">
            <p class="text-muted">
              ${getShortSummary(pub.summary)}
              <a href="#" class="continue-reading" data-id="${pub.id}">Continue Reading</a>
            </p>
          </div>
        `;
      container.appendChild(post);
    });
  
    attachReadMoreHandlers();
    renderPaginationControls(publications);
  }


//   render pagination controls
function renderPaginationControls(publications) {
    const paginationContainer = document.getElementById("pagination");
    paginationContainer.innerHTML = "";
  
    const totalPages = Math.ceil(publications.length / postsPerPage);
  
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "Previous";
    prevBtn.className = "btn btn-outline-primary mx-1";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      currentPage--;
      renderPublications(filteredPublications);
    };
  
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next";
    nextBtn.className = "btn btn-outline-primary mx-1";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      currentPage++;
      renderPublications(filteredPublications);
    };
  
    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(
      document.createTextNode(` Page ${currentPage} of ${totalPages} `)
    );
    paginationContainer.appendChild(nextBtn);
  }
  
  

  
  // Short summary display
  function getShortSummary(text) {
    const words = text.trim().split(/\s+/);
    return words.length <= 40 ? text : words.slice(0, 40).join(" ") + "...";
  }
  
  // Modal elements
  const readMoreModal = document.getElementById("readMoreModal");
  const closeModalBtn = document.getElementById("closeModal");
  const readMoreTitle = document.getElementById("readMoreTitle");
  const readMoreImage = document.getElementById("readMoreImage");
  const readMoreCategory = document.getElementById("readMoreCategory");
  const readMoreAuthor = document.getElementById("readMoreAuthor");
  const readMoreDate = document.getElementById("readMoreDate");
  const readMoreSummary = document.getElementById("readMoreSummary");
  
  // Open modal
  function openReadMoreModal(pub) {
    readMoreTitle.textContent = pub.title || "";
    readMoreImage.src = pub.imageURL || "placeholder.jpg";
    readMoreCategory.textContent = pub.category || "General";
    readMoreAuthor.textContent = pub.author || "Admin";
    readMoreDate.textContent = new Date(
      pub.dateCreated?.toDate?.() || pub.dateModified?.toDate?.()
    ).toLocaleDateString();
    readMoreSummary.textContent = pub.summary || "";
  
    readMoreModal.style.display = "block";
  }
  
  // Close modal
  closeModalBtn.onclick = () => {
    readMoreModal.style.display = "none";
  };
  window.onclick = (event) => {
    if (event.target === readMoreModal) {
      readMoreModal.style.display = "none";
    }
  };
  
  // Attach read more handlers
  function attachReadMoreHandlers() {
    document.querySelectorAll(".continue-reading").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const snap = await getDoc(doc(db, "publications", id));
        if (snap.exists()) {
          const pub = snap.data();
          openReadMoreModal(pub);
        }
      });
    });
  }
  
  // Search filter logic
  function attachSearchHandler() {
    resourceSearchInput.addEventListener("input", () => {
      const term = resourceSearchInput.value.trim().toLowerCase();
  
      filteredPublications = allPublications.filter((pub) => {
        const author = pub.author?.toLowerCase() || "";
        const title = pub.title?.toLowerCase() || "";
        const summary = pub.summary?.toLowerCase() || "";
        const category = pub.category?.toLowerCase() || "";
  
        return (
          author.includes(term) ||
          title.includes(term) ||
          summary.includes(term) ||
          category.includes(term)
        );
      });
  
      currentPage = 1; // Reset to page 1 on new search
      renderPublications(filteredPublications);
    });
  }
  
  
  // Sidebar insights
  async function populateSidebarInsights() {
    const pubRef = collection(db, "publications");
    const snapshot = await getDocs(pubRef);
  
    let totalPosts = snapshot.size;
    const categoryCount = {};
    const authorCount = {};
    let latestPost = { title: "N/A", dateCreated: null };
    let latestUpdatedPost = { title: "N/A", dateModified: null };
    let totalWords = 0;
    let postsWithContent = 0;
  
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
  
      const cat = data.category || "Uncategorized";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  
      const author = data.author || "Unknown";
      authorCount[author] = (authorCount[author] || 0) + 1;
  
      if (
        !latestPost.dateCreated ||
        data.dateCreated?.toMillis() > latestPost.dateCreated?.toMillis()
      ) {
        latestPost = { title: data.title || "Untitled", dateCreated: data.dateCreated };
      }
  
      if (
        data.dateModified &&
        (!latestUpdatedPost.dateModified ||
          data.dateModified?.toMillis() > latestUpdatedPost.dateModified?.toMillis())
      ) {
        latestUpdatedPost = { title: data.title || "Untitled", dateModified: data.dateModified };
      }
  
      const content = data.summary || "";
      const wordCount = content.trim().split(/\s+/).length;
      if (wordCount > 1) {
        totalWords += wordCount;
        postsWithContent++;
      }
    });
  
    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
    const topAuthor = Object.entries(authorCount).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
    const averageContentLength = postsWithContent ? totalWords / postsWithContent : 0;
  
    document.getElementById("totalPosts").innerText = totalPosts;
    document.getElementById("topCategory").innerText = topCategory[0];
    document.getElementById("topAuthor").innerText = topAuthor[0];
    document.getElementById("latestPost").innerText = latestPost.title;
    document.getElementById("latestUpdatedPost").innerText = latestUpdatedPost.title;
    document.getElementById("averageContentLength").innerText = `${Math.round(averageContentLength)} words`;
  }
  
  // Initialize
  loadPublications();
  populateSidebarInsights();
  