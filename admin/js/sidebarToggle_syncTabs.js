// Toggle side bar and enable the left space to close sidebar when clicked
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const backdrop = document.querySelector(".backdrop");

  sidebar.classList.toggle("show"); // Toggle the sidebar visibility on small screens
  backdrop.classList.toggle("show"); // Toggle the back drop visibility on small screens
}


// Listen for tab changes (from either sidebar or top tabs)
document.addEventListener("shown.bs.tab", function (event) {
  const targetTabId =
    event.target.getAttribute("data-bs-target") ||
    event.target.getAttribute("href");

  // Remove active class from all top tab buttons
  document.querySelectorAll(".admin-tabs .nav-link").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active class from all sidebar links
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.classList.remove("active");
  });

  // Add active class to matching top tab button
  const topTab = document.querySelector(
    `.admin-tabs .nav-link[data-bs-target="${targetTabId}"]`
  );
  if (topTab) topTab.classList.add("active");

  // Add active class to matching sidebar link
  const sidebarLink = document.querySelector(
    `.sidebar-link[href="${targetTabId}"]`
  );
  if (sidebarLink) sidebarLink.classList.add("active");
});
