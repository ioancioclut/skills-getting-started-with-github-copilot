document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: create a human-friendly display name from an email or raw string
  function displayNameFromIdentifier(id) {
    const base = id.split("@")[0];
    const parts = base.split(/[\W_]+/).filter(Boolean);
    if (!parts.length) return base;
    return parts.map(p => p[0].toUpperCase() + p.slice(1)).join(" ");
  }

  // Helper: create initials (1-2 letters)
  function initialsFromIdentifier(id) {
    const base = id.split("@")[0];
    const parts = base.split(/[\W_]+/).filter(Boolean);
    if (!parts.length) return base.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select to only the placeholder option
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (pretty)
        let participantsHtml = "";
        if (details.participants.length > 0) {
          participantsHtml += `<div class="participants-section"><h5>Participants</h5><ul class="participants-list">`;
          details.participants.forEach((p) => {
            const initials = initialsFromIdentifier(p);
            const displayName = displayNameFromIdentifier(p);
            participantsHtml += `
              <li class="participant-item" data-participant="${p}" data-activity="${name}">
                <span class="avatar">${initials}</span>
                <span class="participant-name">${displayName}</span>
                <span class="delete-participant" title="Remove participant" style="cursor:pointer; margin-left:8px; color:#c62828; font-size:18px;">&#10060;</span>
              </li>`;
          });
          participantsHtml += `</ul></div>`;
        } else {
          participantsHtml += `<div class="participants-section"><h5>Participants</h5><div class="participant-empty">No participants yet — be the first!</div></div>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);
      // Add delete icon event listeners after rendering
      activityCard.querySelectorAll('.delete-participant').forEach((icon) => {
        icon.addEventListener('click', async (e) => {
          const li = e.target.closest('.participant-item');
          const participant = li.getAttribute('data-participant');
          const activity = li.getAttribute('data-activity');
          // Call backend to unregister first
          try {
            const response = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(participant)}`, {
              method: 'POST',
            });
            const result = await response.json();
            if (response.ok) {
              // On success, re-fetch activities so participant lists and availability update
              fetchActivities();
            } else {
              messageDiv.textContent = result.detail || "Failed to unregister participant.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
              setTimeout(() => { messageDiv.classList.add("hidden"); }, 5000);
            }
          } catch (error) {
            messageDiv.textContent = "Failed to unregister participant.";
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
            setTimeout(() => { messageDiv.classList.add("hidden"); }, 5000);
          }
        });
      });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly-registered participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
