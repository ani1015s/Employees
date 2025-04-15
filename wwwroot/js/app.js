const API_BASE_URL = 'https://localhost:7179/api';

// Global state
let isAdmin = localStorage.getItem('isAdmin') === 'true';
let departments = [];
let employees = [];
let currentTheme = localStorage.getItem('theme') || 'light';

// DOM Elements
const employeesSection = document.getElementById('employeesSection');
const departmentsSection = document.getElementById('departmentsSection');
const addEmployeeForm = document.getElementById('addEmployeeForm');
const addDepartmentForm = document.getElementById('addDepartmentForm');
const welcomeMessage = document.getElementById('welcomeMessage');
const loginButton = document.getElementById('loginButton');
const adminControls = document.querySelectorAll('.admin-controls');

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme from localStorage
    initializeTheme();
    
    // Check login state
    isAdmin = localStorage.getItem('isAdmin') === 'true';
    updateUIState();
    
    // Load departments first (needed for employee display)
    await loadDepartments();
    
    // Hide all sections initially
    if (employeesSection) employeesSection.style.display = 'none';
    if (departmentsSection) departmentsSection.style.display = 'none';
    if (addEmployeeForm) addEmployeeForm.style.display = 'none';
    if (addDepartmentForm) addDepartmentForm.style.display = 'none';

    // Show appropriate section based on URL
    if (window.location.pathname.includes('directory.html')) {
        loadEmployees();
    } else if (window.location.pathname.includes('departments.html')) {
        // Show departments section and load departments data
        if (departmentsSection) {
            departmentsSection.style.display = 'block';
            displayDepartments();
        }
    }
    
    // Add event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
    
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleEmployeeSubmit);
    }

    const departmentForm = document.getElementById('departmentForm');
    if (departmentForm) {
        departmentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleDepartmentSubmit(e);
        });
    }
    
    // Setup password toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.querySelector('i').classList.toggle('bi-eye');
            togglePassword.querySelector('i').classList.toggle('bi-eye-slash');
        });
    }
    
    // Setup search and filter listeners
    const searchInput = document.getElementById('searchInput');
    const departmentFilter = document.getElementById('departmentFilter');
    const designationFilter = document.getElementById('designationFilter');
    
    if (searchInput && departmentFilter && designationFilter) {
        [searchInput, departmentFilter, designationFilter].forEach(element => {
            element.addEventListener('input', filterEmployees);
            element.addEventListener('change', filterEmployees);
        });
    }

    // Setup theme switch listener
    const themeSwitch = document.querySelector('.theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('click', toggleTheme);
    }
    const employeesGrid = document.getElementById('employeesGrid');
if (employeesGrid) {
    employeesGrid.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.btn-edit');
        const deleteBtn = event.target.closest('.btn-delete');
        if (editBtn) {
            const employeeCard = editBtn.closest('.employee-card');
            if (employeeCard) {
                const employeeID = parseInt(employeeCard.dataset.employeeId);
                editEmployee(employeeID);
            }
        } else if (deleteBtn) {
            const employeeCard = deleteBtn.closest('.employee-card');
            if (employeeCard) {
                const employeeID = parseInt(employeeCard.dataset.employeeId);
                deleteEmployee(employeeID);
            }
        }
    });
}
});

// Theme functions
function initializeTheme() {
    // Get theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    currentTheme = savedTheme;
    updateThemeIcon();
}

function toggleTheme() {
    // Toggle theme
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Update DOM and localStorage
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    
    // Update icon
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-switch i');
    if (themeIcon) {
        const isDark = currentTheme === 'dark';
        themeIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        themeIcon.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    }
}

// Login functions
function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const result = await response.json();

        if (response.ok) {
            isAdmin = true;
            localStorage.setItem('isAdmin', 'true');
            
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }
            
            // Update UI
            updateUIState();
            
            // Close modal
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (loginModal) {
                loginModal.hide();
            }
            
            showNotification('Login successful!', 'success');
            
            // Reload employees to show admin controls
            loadEmployees();
        } else {
            showNotification(result.message || 'Invalid username or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('An error occurred during login', 'error');
    }
}

function handleLogout() {
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('rememberedUsername');
    updateUIState();
    showNotification('Logged out successfully', 'info');
    loadEmployees(); // Reload to hide admin controls
}

function updateUIState() {
    // Update admin controls visibility
    adminControls.forEach(control => {
        if (control) {
            control.style.display = isAdmin ? 'block' : 'none';
        }
    });

    // Update welcome message and login button
    if (welcomeMessage) {
        welcomeMessage.style.display = isAdmin ? 'block' : 'none';
    }
    if (loginButton) {
        loginButton.style.display = isAdmin ? 'none' : 'block';
    }
}

// Employee functions
async function loadEmployees() {
    try {
        const response = await fetch(`${API_BASE_URL}/employee`);
        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }
        employees = await response.json();
        displayEmployees(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        showNotification('Error loading employees', 'error');
    }
}

function showAddEmployeeForm() {
    if (!isAdmin) {
        showLoginModal();
        return;
    }
    
    const employeesGrid = document.getElementById('employeesGrid');
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    
    if (employeesGrid && addEmployeeForm) {
        employeesGrid.style.display = 'none';
        addEmployeeForm.style.display = 'block';
        
        // Reset form if it exists
        const form = document.getElementById('employeeForm');
        if (form) {
            form.reset();
            form.dataset.mode = 'add';
            delete form.dataset.employeeId;
        }
        
        // Populate department dropdown
        populateDepartmentDropdown();
    }
}

function cancelAddEmployee() {
    const employeesGrid = document.getElementById('employeesGrid');
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    
    if (employeesGrid && addEmployeeForm) {
        employeesGrid.style.display = 'grid';
        addEmployeeForm.style.display = 'none';
    }
}

async function handleEmployeeSubmit(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showLoginModal();
        return;
    }

    const form = e.target;
    const isEdit = form.dataset.mode === 'edit';
    
    const employee = {
        employeeID: isEdit ? parseInt(form.dataset.employeeId) : Math.floor(Math.random() * 1000000) + 2000000,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        doj: document.getElementById('doj').value,
        designation: document.getElementById('designation').value,
        departmentID: parseInt(document.getElementById('departmentId').value)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/employee${isEdit ? `/${employee.employeeID}` : ''}`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employee)
        });

        if (response.ok) {
            showNotification(`Employee ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
            form.reset();
            cancelAddEmployee();
            loadEmployees();
        } else {
            const error = await response.json();
            showNotification(error.message || `Error ${isEdit ? 'updating' : 'adding'} employee`, 'error');
        }
    } catch (error) {
        console.error(`Error ${isEdit ? 'updating' : 'adding'} employee:`, error);
        showNotification(`Error ${isEdit ? 'updating' : 'adding'} employee`, 'error');
    }
}

// Department functions
async function loadDepartments() {
    try {
        const response = await fetch('/api/Department');
        if (!response.ok) {
            throw new Error('Failed to fetch departments');
        }
        departments = await response.json();
        console.log('Departments loaded:', departments);
        displayDepartments(departments);
    } catch (error) {
        console.error('Error loading departments:', error);
        showNotification('Error loading departments', 'error');
    }
}

function populateDepartmentDropdown() {
    const select = document.getElementById('departmentId');
    console.log('Populating dropdown with departments:', departments);
    if (select && departments.length > 0) {
        select.innerHTML = departments.map(dept => 
            `<option value="${dept.departmentID}">${dept.departmentName}</option>`
        ).join('');
    }
}

function updateDepartmentFilters() {
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter && departments.length > 0) {
        departmentFilter.innerHTML = '<option value="">All Departments</option>' +
            departments.map(dept => 
                `<option value="${dept.departmentID}">${dept.departmentName}</option>`
            ).join('');
    }
}

// Display functions
function displayEmployees(employees) {
    
    const employeesGrid = document.getElementById('employeesGrid');
    if (!employeesGrid) return;

    employeesGrid.style.display = 'grid';
    employeesGrid.innerHTML = '';

    // Update filters
    updateFilters(employees);

    employees.forEach(emp => {
        const initials = `${emp.firstName[0]}${emp.lastName[0]}`;
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.dataset.employeeId = emp.employeeID; // Add this line here
        card.innerHTML = `
            <div class="department-badge">${getDepartmentName(emp.departmentID)}</div>
            <div class="employee-avatar">${initials}</div>
            <div class="employee-name">${emp.firstName} ${emp.lastName}</div>
            <div class="employee-id">#${emp.employeeID}</div>
            <div class="employee-position">${emp.designation}</div>
            <div class="employee-details">
                <div><i class="bi bi-envelope"></i>${emp.email}</div>
                <div><i class="bi bi-telephone"></i>${emp.phoneNumber}</div>
                <div><i class="bi bi-calendar-event"></i>${new Date(emp.doj).toLocaleDateString()}</div>
            </div>
            ${isAdmin ? `
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary btn-edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            ` : ''}
        `;
        employeesGrid.appendChild(card);
    });
            ${isAdmin ? `
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary btn-edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            ` : ''}
        `;
        employeesGrid.appendChild(card);
    });
}

function getDepartmentName(departmentId) {
    const department = departments.find(d => d.departmentID === departmentId);
    return department ? department.departmentName : 'Unknown';
}


function editEmployee(employeeID) {
    if (!isAdmin) {
        showLoginModal();
        return;
    }

    const employee = employees.find(emp => emp.employeeID === employeeID);
    if (!employee) {
        showNotification('Employee not found', 'error');
        return;
    }

    const employeesGrid = document.getElementById('employeesGrid');
    const addEmployeeForm = document.getElementById('addEmployeeForm');

    if (employeesGrid && addEmployeeForm) {
        employeesGrid.style.display = 'none';
        addEmployeeForm.style.display = 'block';

        const form = document.getElementById('employeeForm');
        if (form) {
            form.dataset.mode = 'edit';
            form.dataset.employeeId = employeeID;

            document.getElementById('firstName').value = employee.firstName;
            document.getElementById('lastName').value = employee.lastName;
            document.getElementById('email').value = employee.email;
            document.getElementById('phoneNumber').value = employee.phoneNumber;
            document.getElementById('doj').value = employee.doj;
            document.getElementById('designation').value = employee.designation;
            document.getElementById('departmentId').value = employee.departmentID;

            // Populate department dropdown in case it is not populated
            populateDepartmentDropdown();
        }
    }
}
window.editEmployee = editEmployee;

async function deleteEmployee(employeeID) {
    if (!isAdmin) {
        showLoginModal();
        return;
    }

    if (!confirm('Are you sure you want to delete this employee?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/employee/${employeeID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Employee deleted successfully', 'success');
            loadEmployees();
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete employee');
        }
    } catch (error) {
        console.error('Error deleting employee:', error);
        showNotification(error.message, 'error');
    }
}
window.deleteEmployee = deleteEmployee;

function updateFilters(employees) {
    const designationFilter = document.getElementById('designationFilter');
    if (designationFilter) {
        const uniqueDesignations = [...new Set(employees.map(emp => emp.designation))];
        designationFilter.innerHTML = '<option value="">All Positions</option>' +
            uniqueDesignations.map(designation => 
                `<option value="${designation}">${designation}</option>`
            ).join('');
    }
}

function filterEmployees() {
    const searchValue = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const departmentValue = document.getElementById('departmentFilter')?.value || '';
    const designationValue = document.getElementById('designationFilter')?.value || '';

    const cards = document.querySelectorAll('.employee-card');
    cards.forEach(card => {
        const name = card.querySelector('.employee-name').textContent.toLowerCase();
        const department = card.querySelector('.department-badge').textContent;
        const designation = card.querySelector('.employee-position').textContent;

        const matchesSearch = name.includes(searchValue);
        const matchesDepartment = !departmentValue || department === getDepartmentName(parseInt(departmentValue));
        const matchesDesignation = !designationValue || designation === designationValue;

        card.style.display = matchesSearch && matchesDepartment && matchesDesignation ? 'block' : 'none';
    });
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        ${message}
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

async function displayDepartments(departments) {
    const tableContainer = document.getElementById('departmentsTable');
    if (!tableContainer) return;

    const table = document.createElement('table');
    table.className = 'table table-hover';

    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Department Name</th>
            <th>Employee Count</th>
            <th>Unique Designations</th>
            ${isAdmin ? '<th>Actions</th>' : ''}
        </tr>
    `;
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    departments.forEach(dept => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dept.departmentName}</td>
            <td>${dept.employeeCount}</td>
            <td>${dept.designations}</td>
            ${isAdmin ? `
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteDepartment(${dept.departmentID})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            ` : ''}
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // Clear previous content and add the new table
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);

    // Show admin controls if user is admin
    const adminControls = document.querySelector('.admin-controls');
    if (adminControls) {
        adminControls.style.display = isAdmin ? 'block' : 'none';
    }
}

async function deleteDepartment(departmentId) {
    if (!confirm('Are you sure you want to delete this department?')) {
        return;
    }

    try {
        const response = await fetch(`/api/Department/${departmentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Department deleted successfully', 'success');
            loadDepartments(); // Reload the departments list
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete department');
        }
    } catch (error) {
        console.error('Error deleting department:', error);
        showNotification(error.message, 'error');
    }
}

function editDepartment(departmentId) {
    if (!isAdmin) {
        showLoginModal();
        return;
    }

    const department = departments.find(d => d.departmentID === departmentId);
    if (!department) return;

    // Show the department form
    departmentsSection.style.display = 'none';
    addDepartmentForm.style.display = 'block';

    // Populate the form
    const form = document.getElementById('departmentForm');
    const nameInput = document.getElementById('departmentName');
    
    if (form && nameInput) {
        form.dataset.mode = 'edit';
        form.dataset.departmentId = departmentId;
        nameInput.value = department.departmentName;
    }
}

function showAddDepartmentForm() {
    if (!isAdmin) {
        showLoginModal();
        return;
    }

    departmentsSection.style.display = 'none';
    addDepartmentForm.style.display = 'block';

    // Reset form
    const form = document.getElementById('departmentForm');
    if (form) {
        form.reset();
        form.dataset.mode = 'add';
        delete form.dataset.departmentId;
    }
}

function cancelAddDepartment() {
    addDepartmentForm.style.display = 'none';
    departmentsSection.style.display = 'block';
}

async function handleDepartmentSubmit(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showLoginModal();
        return;
    }

    const form = e.target;
    const isEdit = form.dataset.mode === 'edit';
    const departmentId = isEdit ? parseInt(form.dataset.departmentId) : 0;
    
    const department = {
        departmentID: departmentId,
        departmentName: document.getElementById('departmentName').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/department${isEdit ? `/${departmentId}` : ''}`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(department)
        });

        if (response.ok) {
            showNotification(`Department ${isEdit ? 'updated' : 'added'} successfully`, 'success');
            cancelAddDepartment();
            displayDepartments();
        } else {
            const error = await response.json();
            showNotification(error.message || `Error ${isEdit ? 'updating' : 'adding'} department`, 'error');
        }
    } catch (error) {
        console.error('Error submitting department:', error);
        showNotification(`Error ${isEdit ? 'updating' : 'adding'} department`, 'error');
    }
} 