if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(err => {
        console.log('Service Worker registration failed:', err);
      });
  });
}


const IMGBB_API_KEY = "c12d2b42657974d2d5a3f1f7d71fac99";

// Firebase config (your config with compat SDK)
const firebaseConfig = {
  apiKey: "AIzaSyA9CuLfvgV6E-1OCGMTt5VlUA2XXvvOmjk",
  authDomain: "lulu-staff-app.firebaseapp.com",
  projectId: "lulu-staff-app",
  storageBucket: "lulu-staff-app.firebasestorage.app",
  messagingSenderId: "254386149054",
  appId: "1:254386149054:web:ade6700c66f62f4ad930ef",
  measurementId: "G-9E5BWHR318"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const branchModal = document.getElementById("branchModal");
const branchButtons = document.querySelectorAll(".branch-btn");
const selectedBranchSection = document.getElementById("selectedBranchSection");
const selectedBranchNameSpan = document.getElementById("selectedBranchName");
const changeBranchBtn = document.getElementById("changeBranchBtn");

const staffFormSection = document.getElementById("add-staff-form");
const staffListSection = document.getElementById("staff-list-section");
const staffList = document.getElementById("staff-list");
const staffForm = document.getElementById("staffForm");

const branchDocForm = document.getElementById("branchDocForm");
const branchDocTypeInput = document.getElementById("branchDocType");
const branchDocFileInput = document.getElementById("branchDocFile");
const branchDocumentsList = document.getElementById("branchDocumentsList");
const branchDocumentsSection = document.getElementById("branch-documents-section");

const loadingSpinner = document.getElementById("loadingSpinner");

const reminderArea = document.getElementById("reminder-area");
const remindersModal = document.getElementById("remindersModal");
const showRemindersBtn = document.getElementById("showRemindersBtn");
const closeRemindersBtn = document.getElementById("closeRemindersBtn");

const cancelEditBtn = document.getElementById("cancelEditBtn");
const submitBtn = document.getElementById("submitBtn");
const photoInput = document.getElementById("photo");

let currentBranch = null;
let editStaffId = null;
let branchReminders = [];

// Helper to sanitize text inputs
function sanitizeInput(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Upload file to ImgBB returns URL or null
async function uploadFileToImgBB(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result.split(",")[1];
      const formData = new FormData();
      formData.append("key", IMGBB_API_KEY);
      formData.append("image", base64Image);
      try {
        const res = await fetch("https://api.imgbb.com/1/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) resolve(data.data.url);
        else resolve(null);
      } catch (err) {
        console.error("Upload failed:", err);
        resolve(null);
      }
    };
    reader.onerror = () => reject("File read error");
  });
}

function openBranchModal() {
  branchModal.style.display = "flex";
  branchModal.querySelector(".modal-content").focus();
  staffFormSection.classList.add("hidden");
  staffListSection.classList.add("hidden");
  selectedBranchSection.classList.add("hidden");
  showRemindersBtn.classList.add("hidden");
  branchDocumentsSection.classList.add("hidden");
}

// Select branch event
branchButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentBranch = btn.getAttribute("data-branch");
    branchModal.style.display = "none";
    selectedBranchSection.classList.remove("hidden");
    staffFormSection.classList.remove("hidden");
    staffListSection.classList.remove("hidden");
    selectedBranchNameSpan.textContent = currentBranch;
    showRemindersBtn.classList.remove("hidden");

    branchDocumentsSection.classList.remove("hidden");
loadBranchDocuments();

    loadStaff();
    resetForm();
  });
});

changeBranchBtn.addEventListener("click", openBranchModal);

cancelEditBtn.addEventListener("click", resetForm);

showRemindersBtn.addEventListener("click", () => {
  reminderArea.innerHTML = "";

  if (!branchReminders.length) {
    reminderArea.innerHTML = "<p>No expiry reminders for next 30 days.</p>";
  } else {
    branchReminders.forEach(({ text }) => {
      const remDiv = document.createElement("div");
      remDiv.classList.add("reminder");
      remDiv.textContent = text;
      reminderArea.appendChild(remDiv);
    });
  }

  remindersModal.style.display = "flex";
  remindersModal.querySelector(".modal-content").focus();
});

closeRemindersBtn.addEventListener("click", () => {
  remindersModal.style.display = "none";
});

async function loadStaff() {
  staffList.innerHTML = "";
  reminderArea.innerHTML = "";
  branchReminders = [];

  if (!currentBranch) return;

  try {
    const snapshot = await db.collection("staff")
      .where("branch", "==", currentBranch)
      .orderBy("createdAt", "desc")
      .get();

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    snapshot.forEach((doc) => {
      const staff = doc.data();
      staff.id = doc.id;

      [
        { label: "Passport", date: staff.passportExpiry },
        { label: "Visa", date: staff.visaExpiry },
        { label: "ID Card", date: staff.idExpiry },
        { label: "Labour Card", date: staff.labourExpiry },
        { label: "OHC Card", date: staff.ohcExpiry },
      ].forEach(({ label, date }) => {
        if (date) {
          const d = new Date(date);
          if (d >= now && d <= in30Days) {
            branchReminders.push({
              text: `${staff.name} - ${label} expires on ${formatDate(date)}`,
              date: d,
            });
          }
        }
      });

      const card = document.createElement("div");
      card.classList.add("staff-card");
      card.innerHTML = `
        <img src="${staff.imageUrl || "https://via.placeholder.com/260x180?text=No+Photo"}" alt="${staff.name}" />
        <h3>${staff.name}</h3>
        <p><strong>Position:</strong> ${staff.position}</p>
        <p><strong>Passport Expiry:</strong> ${formatDate(staff.passportExpiry)}</p>
        <p><strong>Visa Expiry:</strong> ${formatDate(staff.visaExpiry)}</p>
        <p><strong>ID Card Expiry:</strong> ${formatDate(staff.idExpiry)}</p>
        <p><strong>Labour Card Expiry:</strong> ${formatDate(staff.labourExpiry)}</p>
        <p><strong>OHC Card Expiry:</strong> ${formatDate(staff.ohcExpiry)}</p>

        <p><strong>Documents:</strong></p>
        <ul>
          ${staff.documents?.passport ? `<li><a href="${staff.documents.passport}" target="_blank" rel="noopener noreferrer">Passport</a></li>` : ""}
          ${staff.documents?.id ? `<li><a href="${staff.documents.id}" target="_blank" rel="noopener noreferrer">ID Card</a></li>` : ""}
          ${staff.documents?.visa ? `<li><a href="${staff.documents.visa}" target="_blank" rel="noopener noreferrer">Visa</a></li>` : ""}
          ${staff.documents?.labourCard ? `<li><a href="${staff.documents.labourCard}" target="_blank" rel="noopener noreferrer">Labour Card</a></li>` : ""}
          ${staff.documents?.ohcCard ? `<li><a href="${staff.documents.ohcCard}" target="_blank" rel="noopener noreferrer">OHC Card</a></li>` : ""}
        </ul>

        <button class="download-photo-btn btn" title="Download Photo">Download Photo</button>
        <div>
          <button class="edit-btn btn" title="Edit">Edit</button>
          <button class="delete-btn btn" title="Delete">Delete</button>
        </div>
      `;

      // Download photo button
      card.querySelector(".download-photo-btn").addEventListener("click", () => {
        if (!staff.imageUrl) {
          alert("No photo to download.");
          return;
        }
        const a = document.createElement("a");
        a.href = staff.imageUrl;
        a.download = `${staff.name}-photo.jpg`;
        a.click();
      });

      // Edit button
      card.querySelector(".edit-btn").addEventListener("click", () => {
        fillFormForEdit(staff);
      });

      // Delete button
      card.querySelector(".delete-btn").addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete ${staff.name}?`)) {
          showLoading(true);
          try {
            await db.collection("staff").doc(staff.id).delete();
            alert("Staff deleted successfully.");
            loadStaff();
            resetForm();
          } catch (err) {
            alert("Error deleting staff: " + err.message);
          }
          showLoading(false);
        }
      });

      staffList.appendChild(card);
    });

  } catch (err) {
    alert("Error loading staff: " + err.message);
  }
}

function fillFormForEdit(staff) {
  editStaffId = staff.id;
  staffFormSection.scrollIntoView({ behavior: "smooth" });

  document.getElementById("staffId").value = staff.id;
  document.getElementById("name").value = staff.name || "";
  document.getElementById("position").value = staff.position || "";
  document.getElementById("passportExpiry").value = staff.passportExpiry || "";
  document.getElementById("visaExpiry").value = staff.visaExpiry || "";
  document.getElementById("idExpiry").value = staff.idExpiry || "";
  document.getElementById("labourExpiry").value = staff.labourExpiry || "";
  document.getElementById("ohcExpiry").value = staff.ohcExpiry || "";

  // Reset file inputs (cannot set file inputs for security)
  photoInput.value = "";
  document.getElementById("passportDoc").value = "";
  document.getElementById("idDoc").value = "";
  document.getElementById("visaDoc").value = "";
  document.getElementById("labourCardDoc").value = "";
  document.getElementById("ohcCardDoc").value = "";

  document.getElementById("formTitle").textContent = "Edit Staff Member";
  submitBtn.textContent = "Update Staff";
  cancelEditBtn.classList.remove("hidden");
}

function resetForm() {
  editStaffId = null;
  staffForm.reset();
  document.getElementById("staffId").value = "";
  document.getElementById("formTitle").textContent = "Add Staff Member";
  submitBtn.textContent = "Add Staff";
  cancelEditBtn.classList.add("hidden");
}

function showLoading(show) {
  if (show) loadingSpinner.classList.remove("hidden");
  else loadingSpinner.classList.add("hidden");
}

async function handleStaffFormSubmit(e) {
  e.preventDefault();

  if (!currentBranch) {
    alert("Please select a branch first.");
    return;
  }

  const name = sanitizeInput(document.getElementById("name").value.trim());
  const position = sanitizeInput(document.getElementById("position").value.trim());
  if (!name || !position) {
    alert("Name and Position are required.");
    return;
  }

  showLoading(true);

  // Prepare expiry dates
  const passportExpiry = document.getElementById("passportExpiry").value || "";
  const visaExpiry = document.getElementById("visaExpiry").value || "";
  const idExpiry = document.getElementById("idExpiry").value || "";
  const labourExpiry = document.getElementById("labourExpiry").value || "";
  const ohcExpiry = document.getElementById("ohcExpiry").value || "";

  // Upload photo if new
  let imageUrl = null;
  if (photoInput.files.length > 0) {
    imageUrl = await uploadFileToImgBB(photoInput.files[0]);
    if (!imageUrl) {
      showLoading(false);
      alert("Failed to upload photo.");
      return;
    }
  }

  // Upload documents (if selected)
  async function uploadDoc(inputId) {
    const fileInput = document.getElementById(inputId);
    if (fileInput.files.length === 0) return null;
    return await uploadFileToImgBB(fileInput.files[0]);
  }

  const passportDocUrl = await uploadDoc("passportDoc");
  const idDocUrl = await uploadDoc("idDoc");
  const visaDocUrl = await uploadDoc("visaDoc");
  const labourCardDocUrl = await uploadDoc("labourCardDoc");
  const ohcCardDocUrl = await uploadDoc("ohcCardDoc");

  // Prepare documents object
  const documents = {};
  if (passportDocUrl) documents.passport = passportDocUrl;
  if (idDocUrl) documents.id = idDocUrl;
  if (visaDocUrl) documents.visa = visaDocUrl;
  if (labourCardDocUrl) documents.labourCard = labourCardDocUrl;
  if (ohcCardDocUrl) documents.ohcCard = ohcCardDocUrl;

  // If editing, fetch existing doc to keep imageUrl and documents if user didn't upload new files
  if (editStaffId) {
    try {
      const docRef = db.collection("staff").doc(editStaffId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const oldData = docSnap.data();
        if (!imageUrl) imageUrl = oldData.imageUrl || null;

        // Merge old documents if new docs not uploaded
        if (!documents.passport && oldData.documents?.passport) documents.passport = oldData.documents.passport;
        if (!documents.id && oldData.documents?.id) documents.id = oldData.documents.id;
        if (!documents.visa && oldData.documents?.visa) documents.visa = oldData.documents.visa;
        if (!documents.labourCard && oldData.documents?.labourCard) documents.labourCard = oldData.documents.labourCard;
        if (!documents.ohcCard && oldData.documents?.ohcCard) documents.ohcCard = oldData.documents.ohcCard;
      }
    } catch (err) {
      alert("Error loading old staff data: " + err.message);
      showLoading(false);
      return;
    }
  }

  // Prepare data to save
  const staffData = {
    name,
    position,
    branch: currentBranch,
    imageUrl: imageUrl || null,
    passportExpiry,
    visaExpiry,
    idExpiry,
    labourExpiry,
    ohcExpiry,
    documents,
    updatedAt: new Date(),
  };

  if (!editStaffId) {
    staffData.createdAt = new Date();
  }

  try {
    if (editStaffId) {
      await db.collection("staff").doc(editStaffId).set(staffData, { merge: true });
      alert("Staff updated successfully.");
    } else {
      await db.collection("staff").add(staffData);
      alert("Staff added successfully.");
    }
    loadStaff();
    resetForm();
  } catch (err) {
    alert("Error saving staff: " + err.message);
  }

  showLoading(false);
}

staffForm.addEventListener("submit", handleStaffFormSubmit);

// Show branch modal at start
openBranchModal();

// When window loads, schedule splash removal
window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  // Wait for the pop animation + a short pause
  setTimeout(() => {
    // Trigger fade‐out over 0.5s
    splash.style.animation = 'splashFade 0.5s ease-out forwards';
  }, 1400); // 1s animation + 0.2s delay + 0.2s pause
  
  // Finally remove from DOM after fade completes
  splash.addEventListener('animationend', (e) => {
    if (e.animationName === 'splashFade') {
      splash.remove();
    }
  });
});

async function loadBranchDocuments() {
  branchDocumentsList.innerHTML = "";
  if (!currentBranch) return;

  try {
    const snapshot = await db.collection("branch_documents")
      .where("branch", "==", currentBranch)
      .orderBy("uploadedAt", "desc")
      .get();

    if (snapshot.empty) {
      branchDocumentsList.innerHTML = "<p>No branch documents uploaded yet.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const docData = doc.data();
      const div = document.createElement("div");
      div.className = "branch-doc-item";
      div.innerHTML = `
        <strong>${docData.type}</strong> - Uploaded on ${new Date(docData.uploadedAt.seconds * 1000).toLocaleDateString()}
        <br/>
        <a href="${docData.fileUrl}" target="_blank" rel="noopener noreferrer">View / Download</a>
        <button class="btn btn-secondary btn-sm delete-branch-doc-btn" data-id="${doc.id}">Delete</button>
      `;

      div.querySelector(".delete-branch-doc-btn").addEventListener("click", async () => {
        if (confirm(`Delete ${docData.type}?`)) {
          try {
            await db.collection("branch_documents").doc(doc.id).delete();
            alert("Document deleted.");
            loadBranchDocuments();
          } catch (err) {
            alert("Error deleting document: " + err.message);
          }
        }
      });

      branchDocumentsList.appendChild(div);
    });
  } catch (err) {
    alert("Error loading branch documents: " + err.message);
  }
}

branchDocForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentBranch) {
    alert("Please select a branch first.");
    return;
  }

  const docType = branchDocTypeInput.value.trim();
  const file = branchDocFileInput.files[0];

  if (!docType) {
    alert("Please enter document type.");
    return;
  }
  if (!file) {
    alert("Please select a file to upload.");
    return;
  }

  showLoading(true);
  const fileUrl = await uploadFileToImgBB(file);
  if (!fileUrl) {
    alert("Failed to upload document.");
    showLoading(false);
    return;
  }

  try {
    await db.collection("branch_documents").add({
      branch: currentBranch,
      type: docType,
      fileUrl,
      uploadedAt: new Date(),
    });
    alert("Branch document uploaded.");
    branchDocForm.reset();
    loadBranchDocuments();
  } catch (err) {
    alert("Error saving document: " + err.message);
  }

  showLoading(false);
});
