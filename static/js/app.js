document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "/api/students";

    // DOM Elements
    const studentForm = document.getElementById("studentForm");
    const editForm = document.getElementById("editForm");
    const editModal = document.getElementById("editModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const studentsTableBody = document.getElementById("studentsTableBody");
    const totalStudentsCount = document.getElementById("totalStudentsCount");
    const searchInput = document.getElementById("searchInput");
    const refreshBtn = document.getElementById("refreshBtn");
    const toast = document.getElementById("toast");

    let studentsData = [];

    // Notifications Toast
    function showToast(message, type = "success") {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove("hidden");
        setTimeout(() => {
            toast.classList.add("hidden");
        }, 3500);
    }

    // READ: Load all students
    async function loadStudents(search = "") {
        try {
            const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
            const response = await fetch(url);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to load students.");
            }

            studentsData = result.data || [];
            totalStudentsCount.textContent = studentsData.length;
            renderTable(studentsData);
        } catch (error) {
            showToast(error.message, "error");
            studentsTableBody.innerHTML = `<tr><td colspan="7" class="text-center">Error loading records.</td></tr>`;
        }
    }

    // Render Table Rows
    function renderTable(list) {
        if (!list || list.length === 0) {
            studentsTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No student records found.</td></tr>`;
            return;
        }

        studentsTableBody.innerHTML = list.map(student => `
            <tr>
                <td><strong>${escapeHtml(student.roll_number)}</strong></td>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.email)}</td>
                <td><span class="badge">${escapeHtml(student.department)}</span></td>
                <td>Year ${student.year_of_study}</td>
                <td>${student.gpa ? parseFloat(student.gpa).toFixed(2) : "0.00"}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal(${student.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDelete(${student.id}, '${escapeHtml(student.name)}')">Delete</button>
                </td>
            </tr>
        `).join("");
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // CREATE: Form Submission
    studentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const rollNumber = document.getElementById("rollNumber").value.trim();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const department = document.getElementById("department").value;
        const yearOfStudy = document.getElementById("yearOfStudy").value;
        const gpa = document.getElementById("gpa").value;

        if (!rollNumber || !name || !email || !department || !yearOfStudy) {
            showToast("Please fill in all mandatory fields (*).", "error");
            return;
        }

        const payload = {
            roll_number: rollNumber,
            name: name,
            email: email,
            department: department,
            year_of_study: parseInt(yearOfStudy),
            gpa: gpa ? parseFloat(gpa) : 0.00
        };

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                const errMsg = data.errors ? data.errors.join(" ") : data.message;
                throw new Error(errMsg || "Error creating student.");
            }

            showToast("Student created successfully!");
            studentForm.reset();
            loadStudents();
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // UPDATE: Open Modal & Populate
    window.openEditModal = async function(id) {
        try {
            const res = await fetch(`${API_URL}/${id}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Failed to fetch student details.");

            const student = data.data;
            document.getElementById("editStudentId").value = student.id;
            document.getElementById("editRollNumber").value = student.roll_number;
            document.getElementById("editName").value = student.name;
            document.getElementById("editEmail").value = student.email;
            document.getElementById("editDepartment").value = student.department;
            document.getElementById("editYearOfStudy").value = student.year_of_study;
            document.getElementById("editGpa").value = student.gpa;

            editModal.classList.remove("hidden");
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    function hideModal() {
        editModal.classList.add("hidden");
    }

    closeModalBtn.addEventListener("click", hideModal);
    cancelEditBtn.addEventListener("click", hideModal);

    // Save Updated Changes
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editStudentId").value;
        const payload = {
            roll_number: document.getElementById("editRollNumber").value.trim(),
            name: document.getElementById("editName").value.trim(),
            email: document.getElementById("editEmail").value.trim(),
            department: document.getElementById("editDepartment").value,
            year_of_study: parseInt(document.getElementById("editYearOfStudy").value),
            gpa: parseFloat(document.getElementById("editGpa").value || 0.0)
        };

        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                const errMsg = data.errors ? data.errors.join(" ") : data.message;
                throw new Error(errMsg || "Error updating record.");
            }

            showToast("Student updated successfully!");
            hideModal();
            loadStudents();
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    // DELETE: Confirmation and Delete
    window.confirmDelete = async function(id, name) {
        if (!confirm(`Are you sure you want to delete student "${name}"?`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "DELETE"
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Failed to delete student.");

            showToast("Student deleted successfully!");
            loadStudents();
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    // Live Search with Debounce
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadStudents(e.target.value.trim());
        }, 300);
    });

    refreshBtn.addEventListener("click", () => {
        searchInput.value = "";
        loadStudents();
    });

    // Initial Load
    loadStudents();
});