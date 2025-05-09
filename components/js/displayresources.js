import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
} from "../../admin/js/firebase-config.js";

// DOM references
const resourceContainer = document.getElementById("resourceContainer");
const searchInput = document.getElementById("resourceSearchInput");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const currentPageDisplay = document.getElementById("currentPage");

let allResources = [];
let currentPage = 1;
const resourcesPerPage = 12;

// Utility: debounce function
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Load all resources ordered by latest first
async function loadResources() {
  const q = query(collection(db, "resources"), orderBy("dateCreated", "desc"));
  const snapshot = await getDocs(q);
  allResources = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  renderResources();
}

// Render current page of filtered resources
function renderResources() {
  const term = searchInput.value.trim().toLowerCase();

  const filtered = allResources.filter((res) => {
    const title = res.title?.toLowerCase() || "";
    const author = res.author?.toLowerCase() || "";
    const category = res.category?.toLowerCase() || "";
    return (
      title.includes(term) ||
      author.includes(term) ||
      category.includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / resourcesPerPage);
  currentPage = Math.min(currentPage, totalPages || 1);

  const startIndex = (currentPage - 1) * resourcesPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + resourcesPerPage);

  resourceContainer.innerHTML = "";

  if (currentItems.length === 0) {
    resourceContainer.innerHTML = `<p class="text-muted text-center">No matching search results found!</p>`;
    return;
  }

  currentItems.forEach((res) => {
    const card = document.createElement("article");
    card.className = "col-12 col-sm-6 col-md-6 col-lg-4 mb-5 ml-2";
    card.innerHTML = `
      <div class="card book-card h-100">
        <div class="book-img-wrapper">
          <img src="${res.imageURL || '../../assets/img/lmscover.png'}"
               class="card-img-top" loading="lazy"
               alt="${res.title} Image">
        </div>
        <div class="card-body">
          <h5 class="book-title">${res.title || "Untitled"}</h5>
          <p class="text-muted mb-1">Author <strong>${res.author || "Unknown"}</strong></p>
          <span class="badge badge-info mb-2">${res.category || "General"}</span> &nbsp; &nbsp;
          <span>${new Date(res.dateCreated).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <div class="d-flex flex-column gap-2 mt-4">
            <a href="${res.fileURL || 'javascript:void(0)'}" target="_blank" class="btn btn-dark btn-sm">⬇️ Read Online</a>
          </div>
        </div>
      </div>
    `;
    resourceContainer.appendChild(card);
  });

  // Pagination UI
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage >= totalPages;
  currentPageDisplay.textContent = `Page ${currentPage} of ${totalPages || 1}`;
}

// Handle search with debounce
const debouncedSearch = debounce(() => {
  currentPage = 1;
  renderResources();
}, 300); // 300ms delay

searchInput.addEventListener("input", debouncedSearch);

// Pagination buttons
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderResources();
  }
});

nextBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(allResources.length / resourcesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderResources();
  }
});

// Sidebar insights
async function populateSidebarInsights() {
  const pubRef = collection(db, "resources");
  const snapshot = await getDocs(pubRef);

  let totalPosts = snapshot.size;
  const categoryCount = {};
  const authorCount = {};
  let latestPost = { title: "N/A", dateCreated: null };
  let latestUpdatedPost = { title: "N/A", dateModified: null };

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    const cat = data.category || "Uncategorized";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;

    const author = data.author || "Unknown";
    authorCount[author] = (authorCount[author] || 0) + 1;

    if (
      data.dateCreated &&
      (!latestPost.dateCreated || new Date(data.dateCreated) > new Date(latestPost.dateCreated))
    ) {
      latestPost = { title: data.title || "Untitled", dateCreated: data.dateCreated };
    }

    if (
      data.dateModified &&
      (!latestUpdatedPost.dateModified || new Date(data.dateModified) > new Date(latestUpdatedPost.dateModified))
    ) {
      latestUpdatedPost = { title: data.title || "Untitled", dateModified: data.dateModified };
    }
  });

  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
  const topAuthor = Object.entries(authorCount).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

  document.getElementById("totalPosts").innerText = totalPosts;
  document.getElementById("topCategory").innerText = topCategory[0];
  document.getElementById("topAuthor").innerText = topAuthor[0];

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  document.getElementById("latestPost").innerText =
    `${latestPost.title} (${formatDateTime(latestPost.dateCreated)})`;
  document.getElementById("latestUpdatedPost").innerText =
    `${latestUpdatedPost.title} (${formatDateTime(latestUpdatedPost.dateModified)})`;
}

// Initialize
loadResources();
populateSidebarInsights();
