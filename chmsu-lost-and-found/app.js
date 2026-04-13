/**
 * CHMSU OSAS Binalbagan - Lost and Found Cloud System
 * WP 06 Compliant Application
 * 
 * Features:
 * - Supabase Cloud Database Integration
 * - Authentication & Session Management
 * - Item Management (CRUD) with Automatic Coding
 * - Inventory & Reports (F.18, F.19, F.20, F.21, F.22, F.23)
 * - CSV Backup Download
 * - Disposal Tracking with Retention Periods
 */

// ============================================
// SUPABASE CONFIGURATION
// Priority: 1) config.js (GitHub Secrets) 2) Hardcoded values 3) Demo mode
// ============================================
let SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
let SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Check if config.js loaded (for GitHub Pages deployment)
if (typeof SUPABASE_CONFIG !== 'undefined') {
    SUPABASE_URL = SUPABASE_CONFIG.URL;
    SUPABASE_ANON_KEY = SUPABASE_CONFIG.ANON_KEY;
    console.log('Loaded Supabase config from config.js');
}

// Initialize Supabase client
let supabase;
function initSupabase() {
    try {
        if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && 
            SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
            return true;
        }
    } catch (e) {
        console.error('Supabase initialization error:', e);
    }
    console.warn('Supabase not configured. Running in demo mode.');
    supabase = null;
    return false;
}

// Initialize on load
initSupabase();

// ============================================
// GLOBAL STATE
// ============================================
const AppState = {
    isLoggedIn: false,
    currentUser: null,
    adminName: 'OSAS Clerk',
    adminProfilePicture: null,
    foundItems: [],
    lostItems: [],
    disposedItems: [],
    currentItemCode: { V: 0, NV: 0, ID: 0 },
    itemImageBase64: null
};

// ============================================
// LOGIN & AUTHENTICATION
// ============================================

const VALID_CREDENTIALS = {
    username: 'osasbinalbagan',
    password: 'osas.123'
};

document.addEventListener('DOMContentLoaded', function() {
    // Check for existing session
    const session = localStorage.getItem('chmsu_session');
    if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.isLoggedIn) {
            AppState.isLoggedIn = true;
            AppState.currentUser = sessionData.user;
            AppState.adminName = sessionData.adminName || 'OSAS Clerk';
            AppState.adminProfilePicture = sessionData.adminProfilePicture || null;
            showMainApp();
        }
    }

    // Initialize date/time display
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Set default dates
    document.getElementById('dateFound').valueAsDate = new Date();
    document.getElementById('dateLost').valueAsDate = new Date();
    document.getElementById('disposalDate').valueAsDate = new Date();
    document.getElementById('dateClaimed').valueAsDate = new Date();

    // Load initial data
    loadData();

    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Profile form handler
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
});

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
        AppState.isLoggedIn = true;
        AppState.currentUser = { username };
        
        // Save session
        localStorage.setItem('chmsu_session', JSON.stringify({
            isLoggedIn: true,
            user: AppState.currentUser,
            adminName: AppState.adminName,
            adminProfilePicture: AppState.adminProfilePicture,
            timestamp: new Date().toISOString()
        }));

        errorDiv.classList.add('d-none');
        showMainApp();
    } else {
        errorDiv.classList.remove('d-none');
        document.getElementById('password').value = '';
    }
}

function logout() {
    AppState.isLoggedIn = false;
    AppState.currentUser = null;
    localStorage.removeItem('chmsu_session');
    
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('mainApp').classList.add('d-none');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('mainApp').classList.remove('d-none');
    document.getElementById('adminName').textContent = AppState.adminName;
    
    if (AppState.adminProfilePicture) {
        document.getElementById('profilePicturePreview').src = AppState.adminProfilePicture;
    }
    
    updateDashboardStats();
    loadRecentItems();
}

// ============================================
// NAVIGATION
// ============================================

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('d-none');
    });

    // Show selected section
    document.getElementById(sectionId).classList.remove('d-none');

    // Update nav active state
    document.querySelectorAll('.app-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    // Load section-specific data
    if (sectionId === 'foundItems') {
        loadFoundItemsTable();
    } else if (sectionId === 'lostReports') {
        loadLostItemsTable();
    } else if (sectionId === 'inventory') {
        loadInventory();
    } else if (sectionId === 'disposal') {
        loadDisposalItems();
    } else if (sectionId === 'dashboard') {
        updateDashboardStats();
        loadRecentItems();
    }
}

// ============================================
// DATA MANAGEMENT
// ============================================

async function loadData() {
    // In demo mode, use sample data
    if (!supabase) {
        loadDemoData();
        return;
    }

    try {
        // Load found items
        const { data: foundItems, error: foundError } = await supabase
            .from('found_items')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (foundError) throw foundError;
        AppState.foundItems = foundItems || [];

        // Load lost items
        const { data: lostItems, error: lostError } = await supabase
            .from('lost_items')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (lostError) throw lostError;
        AppState.lostItems = lostItems || [];

        // Load disposed items
        const { data: disposedItems, error: disposedError } = await supabase
            .from('disposed_items')
            .select('*')
            .order('disposal_date', { ascending: false });
        
        if (disposedError) throw disposedError;
        AppState.disposedItems = disposedItems || [];

        updateDashboardStats();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data. Using demo mode.', 'error');
        loadDemoData();
    }
}

function loadDemoData() {
    // Sample data for demonstration
    AppState.foundItems = [
        {
            id: '1',
            item_code: 'V-0001-0426',
            item_name: 'iPhone 13 Pro',
            category: 'Valuable',
            date_found: '2026-04-10',
            location_found: 'Library - 2nd Floor',
            description: 'Black iPhone 13 Pro with clear case, 80% battery',
            found_by: 'Juan Dela Cruz',
            status: 'Posted',
            created_at: '2026-04-10T10:00:00Z'
        },
        {
            id: '2',
            item_code: 'NV-0001-0426',
            item_name: 'Blue Umbrella',
            category: 'Non-Valuable',
            date_found: '2026-04-12',
            location_found: 'Canteen Area',
            description: 'Blue folding umbrella, slightly wet',
            found_by: 'Maria Santos',
            status: 'Logged',
            created_at: '2026-04-12T14:30:00Z'
        },
        {
            id: '3',
            item_code: 'V-0002-0426',
            item_name: 'Gold Necklace',
            category: 'Valuable',
            date_found: '2026-04-05',
            location_found: 'AVR Room',
            description: '18k gold chain necklace with small pendant',
            found_by: 'Pedro Reyes',
            status: 'Claimed',
            created_at: '2026-04-05T09:15:00Z',
            date_claimed: '2026-04-08',
            claimant_name: 'Ana Garcia'
        },
        {
            id: '4',
            item_code: 'ID-0001-0426',
            item_name: 'Student ID - John Smith',
            category: 'ID',
            date_found: '2026-04-11',
            location_found: 'Main Gate',
            description: 'CHMSU Student ID, BSIT 3rd Year',
            found_by: 'Security Guard',
            status: 'Claimed',
            created_at: '2026-04-11T16:00:00Z',
            date_claimed: '2026-04-12'
        }
    ];

    AppState.lostItems = [
        {
            id: '1',
            item_name: 'Black Wallet',
            category: 'Valuable',
            date_lost: '2026-04-11',
            location_lost: 'Canteen Area',
            description: 'Black leather wallet with IDs and cash',
            reporter_name: 'Carlos Mendoza',
            reporter_contact: '09123456789',
            reporter_email: 'carlos@email.com',
            status: 'Pending',
            created_at: '2026-04-11T08:00:00Z'
        }
    ];

    AppState.disposedItems = [];
    updateDashboardStats();
}

// ============================================
// ITEM CODE GENERATION (WP 06 Standard)
// ============================================

function generateItemCode() {
    const category = document.getElementById('itemCategory').value;
    const codeInput = document.getElementById('itemCode');
    
    if (!category) {
        codeInput.value = '';
        return;
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const mmYY = `${month}${year}`;

    // Get next series number for category
    const prefix = category === 'Valuable' ? 'V' : category === 'Non-Valuable' ? 'NV' : 'ID';
    
    // Count existing items of this category for this month
    const existingItems = AppState.foundItems.filter(item => 
        item.category === category && item.item_code && item.item_code.endsWith(`-${mmYY}`)
    );
    
    const nextSeries = existingItems.length + 1;
    const seriesStr = String(nextSeries).padStart(4, '0');
    
    codeInput.value = `${prefix}-${seriesStr}-${mmYY}`;
}

// ============================================
// FOUND ITEMS CRUD
// ============================================

function openFoundItemModal(itemId = null) {
    const modal = new bootstrap.Modal(document.getElementById('foundItemModal'));
    const form = document.getElementById('foundItemForm');
    
    form.reset();
    document.getElementById('itemImagePreview').innerHTML = '';
    AppState.itemImageBase64 = null;
    
    if (itemId) {
        // Edit mode
        const item = AppState.foundItems.find(i => i.id === itemId);
        if (item) {
            document.getElementById('foundItemId').value = item.id;
            document.getElementById('itemName').value = item.item_name;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemCode').value = item.item_code;
            document.getElementById('dateFound').value = item.date_found;
            document.getElementById('locationFound').value = item.location_found;
            document.getElementById('foundBy').value = item.found_by || '';
            document.getElementById('itemDescription').value = item.description;
            document.getElementById('itemStatus').value = item.status;
            
            if (item.image) {
                document.getElementById('itemImagePreview').innerHTML = 
                    `<img src="${item.image}" class="img-thumbnail" style="max-height: 100px;">`;
            }
        }
    } else {
        // Add mode
        document.getElementById('foundItemId').value = '';
        document.getElementById('dateFound').valueAsDate = new Date();
        generateItemCode();
    }
    
    modal.show();
}

async function saveFoundItem() {
    const itemId = document.getElementById('foundItemId').value;
    const itemData = {
        item_name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        item_code: document.getElementById('itemCode').value,
        date_found: document.getElementById('dateFound').value,
        location_found: document.getElementById('locationFound').value,
        found_by: document.getElementById('foundBy').value,
        description: document.getElementById('itemDescription').value,
        status: document.getElementById('itemStatus').value,
        image: AppState.itemImageBase64,
        updated_at: new Date().toISOString()
    };

    // Validation
    if (!itemData.item_name || !itemData.category || !itemData.date_found || !itemData.location_found || !itemData.description) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }

    try {
        if (supabase) {
            if (itemId) {
                // Update existing
                const { error } = await supabase
                    .from('found_items')
                    .update(itemData)
                    .eq('id', itemId);
                if (error) throw error;
            } else {
                // Create new
                itemData.created_at = new Date().toISOString();
                const { error } = await supabase
                    .from('found_items')
                    .insert([itemData]);
                if (error) throw error;
            }
            await loadData();
        } else {
            // Demo mode
            if (itemId) {
                const index = AppState.foundItems.findIndex(i => i.id === itemId);
                if (index !== -1) {
                    AppState.foundItems[index] = { ...AppState.foundItems[index], ...itemData };
                }
            } else {
                itemData.id = Date.now().toString();
                AppState.foundItems.unshift(itemData);
            }
        }

        bootstrap.Modal.getInstance(document.getElementById('foundItemModal')).hide();
        showNotification(itemId ? 'Item updated successfully!' : 'Item added successfully!', 'success');
        
        // Refresh current view
        const activeSection = document.querySelector('.content-section:not(.d-none)').id;
        if (activeSection === 'dashboard') {
            updateDashboardStats();
            loadRecentItems();
        } else if (activeSection === 'foundItems') {
            loadFoundItemsTable();
        }
    } catch (error) {
        console.error('Error saving item:', error);
        showNotification('Error saving item. Please try again.', 'error');
    }
}

async function deleteFoundItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        if (supabase) {
            const { error } = await supabase
                .from('found_items')
                .delete()
                .eq('id', itemId);
            if (error) throw error;
            await loadData();
        } else {
            AppState.foundItems = AppState.foundItems.filter(i => i.id !== itemId);
        }

        showNotification('Item deleted successfully!', 'success');
        loadFoundItemsTable();
        updateDashboardStats();
    } catch (error) {
        console.error('Error deleting item:', error);
        showNotification('Error deleting item.', 'error');
    }
}

function handleItemImageChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            AppState.itemImageBase64 = e.target.result;
            document.getElementById('itemImagePreview').innerHTML = 
                `<img src="${e.target.result}" class="img-thumbnail" style="max-height: 100px;">`;
        };
        reader.readAsDataURL(file);
    }
}

// ============================================
// LOST ITEMS CRUD
// ============================================

function openLostItemModal(itemId = null) {
    const modal = new bootstrap.Modal(document.getElementById('lostItemModal'));
    const form = document.getElementById('lostItemForm');
    
    form.reset();
    
    if (itemId) {
        const item = AppState.lostItems.find(i => i.id === itemId);
        if (item) {
            document.getElementById('lostItemId').value = item.id;
            document.getElementById('lostItemName').value = item.item_name;
            document.getElementById('lostItemCategory').value = item.category;
            document.getElementById('dateLost').value = item.date_lost;
            document.getElementById('locationLost').value = item.location_lost;
            document.getElementById('lostItemDescription').value = item.description;
            document.getElementById('reporterName').value = item.reporter_name;
            document.getElementById('reporterContact').value = item.reporter_contact;
            document.getElementById('reporterEmail').value = item.reporter_email || '';
            document.getElementById('reporterId').value = item.reporter_id || '';
        }
    } else {
        document.getElementById('lostItemId').value = '';
        document.getElementById('dateLost').valueAsDate = new Date();
    }
    
    modal.show();
}

async function saveLostItem() {
    const itemId = document.getElementById('lostItemId').value;
    const itemData = {
        item_name: document.getElementById('lostItemName').value,
        category: document.getElementById('lostItemCategory').value,
        date_lost: document.getElementById('dateLost').value,
        location_lost: document.getElementById('locationLost').value,
        description: document.getElementById('lostItemDescription').value,
        reporter_name: document.getElementById('reporterName').value,
        reporter_contact: document.getElementById('reporterContact').value,
        reporter_email: document.getElementById('reporterEmail').value,
        reporter_id: document.getElementById('reporterId').value,
        status: 'Pending',
        updated_at: new Date().toISOString()
    };

    if (!itemData.item_name || !itemData.category || !itemData.date_lost || 
        !itemData.location_lost || !itemData.description || !itemData.reporter_name || 
        !itemData.reporter_contact) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }

    try {
        if (supabase) {
            if (itemId) {
                const { error } = await supabase
                    .from('lost_items')
                    .update(itemData)
                    .eq('id', itemId);
                if (error) throw error;
            } else {
                itemData.created_at = new Date().toISOString();
                const { error } = await supabase
                    .from('lost_items')
                    .insert([itemData]);
                if (error) throw error;
            }
            await loadData();
        } else {
            if (itemId) {
                const index = AppState.lostItems.findIndex(i => i.id === itemId);
                if (index !== -1) {
                    AppState.lostItems[index] = { ...AppState.lostItems[index], ...itemData };
                }
            } else {
                itemData.id = Date.now().toString();
                AppState.lostItems.unshift(itemData);
            }
        }

        bootstrap.Modal.getInstance(document.getElementById('lostItemModal')).hide();
        showNotification(itemId ? 'Report updated!' : 'Lost item reported!', 'success');
        loadLostItemsTable();
    } catch (error) {
        console.error('Error saving lost item:', error);
        showNotification('Error saving report.', 'error');
    }
}

// ============================================
// CLAIM & DISPOSAL
// ============================================

function openClaimModal(itemId) {
    const item = AppState.foundItems.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('claimItemId').value = itemId;
    document.getElementById('claimItemName').textContent = item.item_name;
    document.getElementById('claimItemCode').textContent = item.item_code;
    document.getElementById('dateClaimed').valueAsDate = new Date();

    new bootstrap.Modal(document.getElementById('claimItemModal')).show();
}

async function confirmClaimItem() {
    const itemId = document.getElementById('claimItemId').value;
    const claimData = {
        claimant_name: document.getElementById('claimantName').value,
        claimant_id: document.getElementById('claimantId').value,
        claimant_contact: document.getElementById('claimantContact').value,
        date_claimed: document.getElementById('dateClaimed').value,
        claim_remarks: document.getElementById('claimRemarks').value,
        status: 'Claimed'
    };

    if (!claimData.claimant_name || !claimData.claimant_id || !claimData.claimant_contact || !claimData.date_claimed) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }

    try {
        if (supabase) {
            const { error } = await supabase
                .from('found_items')
                .update(claimData)
                .eq('id', itemId);
            if (error) throw error;
            await loadData();
        } else {
            const index = AppState.foundItems.findIndex(i => i.id === itemId);
            if (index !== -1) {
                AppState.foundItems[index] = { ...AppState.foundItems[index], ...claimData };
            }
        }

        bootstrap.Modal.getInstance(document.getElementById('claimItemModal')).hide();
        showNotification('Item claimed successfully!', 'success');
        updateDashboardStats();
        loadFoundItemsTable();
    } catch (error) {
        console.error('Error claiming item:', error);
        showNotification('Error claiming item.', 'error');
    }
}

function openDisposeModal(itemId) {
    const item = AppState.foundItems.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('disposeItemId').value = itemId;
    document.getElementById('disposeItemName').textContent = item.item_name;
    document.getElementById('disposeItemCode').textContent = item.item_code;
    document.getElementById('disposalDate').valueAsDate = new Date();

    new bootstrap.Modal(document.getElementById('disposeItemModal')).show();
}

async function confirmDisposeItem() {
    const itemId = document.getElementById('disposeItemId').value;
    const item = AppState.foundItems.find(i => i.id === itemId);
    
    const disposalData = {
        item_id: itemId,
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category,
        disposal_date: document.getElementById('disposalDate').value,
        disposed_to: document.getElementById('disposedTo').value,
        received_by: document.getElementById('receivedBy').value,
        remarks: document.getElementById('disposalRemarks').value,
        form_f20_number: `F.20-${Date.now()}`,
        created_at: new Date().toISOString()
    };

    if (!disposalData.disposal_date || !disposalData.disposed_to || !disposalData.received_by) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }

    try {
        if (supabase) {
            // Add to disposed items
            const { error: disposeError } = await supabase
                .from('disposed_items')
                .insert([disposalData]);
            if (disposeError) throw disposeError;

            // Update item status
            const { error: updateError } = await supabase
                .from('found_items')
                .update({ status: 'Disposed' })
                .eq('id', itemId);
            if (updateError) throw updateError;

            await loadData();
        } else {
            AppState.disposedItems.unshift(disposalData);
            const index = AppState.foundItems.findIndex(i => i.id === itemId);
            if (index !== -1) {
                AppState.foundItems[index].status = 'Disposed';
            }
        }

        bootstrap.Modal.getInstance(document.getElementById('disposeItemModal')).hide();
        showNotification('Item disposed successfully! Form F.20 generated.', 'success');
        updateDashboardStats();
        loadDisposalItems();
    } catch (error) {
        console.error('Error disposing item:', error);
        showNotification('Error disposing item.', 'error');
    }
}

// ============================================
// DASHBOARD & TABLES
// ============================================

function updateDashboardStats() {
    const found = AppState.foundItems;
    const total = found.length;
    const pending = found.filter(i => i.status === 'Logged' || i.status === 'Posted').length;
    const claimed = found.filter(i => i.status === 'Claimed').length;
    const disposed = found.filter(i => i.status === 'Disposed').length;

    document.getElementById('statTotalFound').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statClaimed').textContent = claimed;
    document.getElementById('statDisposed').textContent = disposed;
}

function loadRecentItems() {
    const tbody = document.getElementById('recentItemsTable');
    const recentItems = AppState.foundItems.slice(0, 5);
    
    tbody.innerHTML = recentItems.map(item => `
        <tr>
            <td><span class="badge bg-secondary">${item.item_code}</span></td>
            <td>${item.item_name}</td>
            <td><span class="badge ${getCategoryBadgeClass(item.category)}">${item.category}</span></td>
            <td>${formatDate(item.date_found)}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openFoundItemModal('${item.id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadFoundItemsTable() {
    const tbody = document.getElementById('foundItemsTableBody');
    
    tbody.innerHTML = AppState.foundItems.map(item => `
        <tr>
            <td><strong>${item.item_code}</strong></td>
            <td>${item.item_name}</td>
            <td><span class="badge ${getCategoryBadgeClass(item.category)}">${item.category}</span></td>
            <td>${formatDate(item.date_found)}</td>
            <td>${item.location_found}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="openFoundItemModal('${item.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${item.status !== 'Claimed' && item.status !== 'Disposed' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="openClaimModal('${item.id}')" title="Claim">
                            <i class="bi bi-check-circle"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFoundItem('${item.id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadLostItemsTable() {
    const tbody = document.getElementById('lostItemsTableBody');
    
    tbody.innerHTML = AppState.lostItems.map(item => `
        <tr>
            <td><strong>#${item.id.slice(-4)}</strong></td>
            <td>${item.item_name}</td>
            <td>${item.reporter_name}</td>
            <td>${item.reporter_contact}</td>
            <td>${formatDate(item.date_lost)}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="openLostItemModal('${item.id}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteLostItem('${item.id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function deleteLostItem(itemId) {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
        if (supabase) {
            const { error } = await supabase
                .from('lost_items')
                .delete()
                .eq('id', itemId);
            if (error) throw error;
            await loadData();
        } else {
            AppState.lostItems = AppState.lostItems.filter(i => i.id !== itemId);
        }

        showNotification('Report deleted successfully!', 'success');
        loadLostItemsTable();
    } catch (error) {
        console.error('Error deleting report:', error);
        showNotification('Error deleting report.', 'error');
    }
}

// ============================================
// FILTERING
// ============================================

function applyFilters() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const category = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();

    let filtered = [...AppState.foundItems];

    if (startDate) {
        filtered = filtered.filter(i => i.date_found >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(i => i.date_found <= endDate);
    }
    if (category) {
        filtered = filtered.filter(i => i.category === category);
    }
    if (status) {
        filtered = filtered.filter(i => i.status === status);
    }
    if (search) {
        filtered = filtered.filter(i => 
            i.item_name.toLowerCase().includes(search) ||
            i.item_code.toLowerCase().includes(search) ||
            i.description.toLowerCase().includes(search)
        );
    }

    const tbody = document.getElementById('foundItemsTableBody');
    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td><strong>${item.item_code}</strong></td>
            <td>${item.item_name}</td>
            <td><span class="badge ${getCategoryBadgeClass(item.category)}">${item.category}</span></td>
            <td>${formatDate(item.date_found)}</td>
            <td>${item.location_found}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="openFoundItemModal('${item.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${item.status !== 'Claimed' && item.status !== 'Disposed' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="openClaimModal('${item.id}')">
                            <i class="bi bi-check-circle"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFoundItem('${item.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================
// INVENTORY & REPORTS
// ============================================

function showCurrentMonth() {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('inventoryMonth').value = monthStr;
    loadInventory();
}

function loadInventory() {
    const monthYear = document.getElementById('inventoryMonth').value;
    const formType = document.getElementById('inventoryFormType').value;
    
    if (!monthYear) {
        showNotification('Please select a month and year.', 'error');
        return;
    }

    const [year, month] = monthYear.split('-');
    const mmYY = `${month}${year.slice(-2)}`;

    let categoryFilter = '';
    let title = '';
    
    switch(formType) {
        case 'F.21':
            categoryFilter = 'Valuable';
            title = 'Inventory of Valuable Items (F.21)';
            break;
        case 'F.22':
            categoryFilter = 'Non-Valuable';
            title = 'Inventory of Non-Valuable Items (F.22)';
            break;
        case 'F.23':
            categoryFilter = 'ID';
            title = 'Inventory of Found IDs (F.23)';
            break;
    }

    document.getElementById('inventoryTitle').textContent = title;
    document.getElementById('preparedByName').textContent = AppState.adminName;

    // Filter items by month and category
    const filteredItems = AppState.foundItems.filter(item => 
        item.category === categoryFilter && 
        item.item_code && 
        item.item_code.endsWith(`-${mmYY}`)
    );

    const tbody = document.getElementById('inventoryTableBody');
    
    if (filteredItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h5>No items found</h5>
                        <p>No ${categoryFilter.toLowerCase()} items recorded for ${formatMonthYear(monthYear)}.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredItems.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.item_code}</td>
            <td>${item.item_name}</td>
            <td>${item.description}</td>
            <td>${formatDate(item.date_found)}</td>
            <td>${item.location_found}</td>
            <td>${item.status}</td>
            <td>${item.date_claimed ? formatDate(item.date_claimed) : '-'}</td>
        </tr>
    `).join('');
}

function printInventoryReport() {
    const monthYear = document.getElementById('inventoryMonth').value;
    const formType = document.getElementById('inventoryFormType').value;
    
    if (!monthYear) {
        showNotification('Please select a month and year first.', 'error');
        return;
    }

    const [year, month] = monthYear.split('-');
    const mmYY = `${month}${year.slice(-2)}`;

    let categoryFilter = '';
    let title = '';
    
    switch(formType) {
        case 'F.21':
            categoryFilter = 'Valuable';
            title = 'Inventory of Valuable Items (F.21)';
            break;
        case 'F.22':
            categoryFilter = 'Non-Valuable';
            title = 'Inventory of Non-Valuable Items (F.22)';
            break;
        case 'F.23':
            categoryFilter = 'ID';
            title = 'Inventory of Found IDs (F.23)';
            break;
    }

    const filteredItems = AppState.foundItems.filter(item => 
        item.category === categoryFilter && 
        item.item_code && 
        item.item_code.endsWith(`-${mmYY}`)
    );

    const printContent = `
        <div class="print-report">
            <div class="text-center mb-4">
                <img src="logo.png" alt="CHMSU Logo" style="max-width: 100px; margin-bottom: 15px;">
                <h4>CARLOS HILADO MEMORIAL STATE UNIVERSITY</h4>
                <h5>Office of Student Affairs and Services - Binalbagan</h5>
                <hr>
                <h4>${title}</h4>
                <p><strong>For the Month of ${formatMonthYear(monthYear)}</strong></p>
            </div>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Item Code</th>
                        <th>Item Name</th>
                        <th>Description</th>
                        <th>Date Found</th>
                        <th>Location Found</th>
                        <th>Status</th>
                        <th>Date Claimed/Disposed</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredItems.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.item_code}</td>
                            <td>${item.item_name}</td>
                            <td>${item.description}</td>
                            <td>${formatDate(item.date_found)}</td>
                            <td>${item.location_found}</td>
                            <td>${item.status}</td>
                            <td>${item.date_claimed ? formatDate(item.date_claimed) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="mt-5 row">
                <div class="col-6">
                    <p><strong>Prepared by:</strong></p>
                    <p style="margin-top: 40px; border-top: 1px solid #000; display: inline-block; padding-top: 5px;">
                        ${AppState.adminName}
                    </p>
                    <p><small>OSAS Clerk</small></p>
                </div>
                <div class="col-6 text-end">
                    <p><strong>Approved by:</strong></p>
                    <p style="margin-top: 40px; border-top: 1px solid #000; display: inline-block; padding-top: 5px;">
                        ____________________
                    </p>
                    <p><small>OSAS Director/Coordinator</small></p>
                </div>
            </div>
            <div class="mt-4 text-center">
                <small class="text-muted">Generated on ${new Date().toLocaleString()}</small>
            </div>
        </div>
    `;

    document.getElementById('printReportContent').innerHTML = printContent;
    new bootstrap.Modal(document.getElementById('printReportModal')).show();
}

// ============================================
// DISPOSAL TRACKING
// ============================================

function loadDisposalItems() {
    const tbody = document.getElementById('disposalTableBody');
    const now = new Date();

    // Find items that are past retention period
    const itemsForDisposal = AppState.foundItems.filter(item => {
        if (item.status === 'Disposed' || item.status === 'Claimed') return false;
        
        const dateFound = new Date(item.date_found);
        const daysDiff = Math.floor((now - dateFound) / (1000 * 60 * 60 * 24));
        
        // Retention periods: Valuables = 180 days (6 months), Non-Valuables = 90 days (3 months)
        const retentionDays = item.category === 'Valuable' ? 180 : 
                              item.category === 'Non-Valuable' ? 90 : 30;
        
        return daysDiff > retentionDays;
    }).map(item => {
        const dateFound = new Date(item.date_found);
        const daysDiff = Math.floor((now - dateFound) / (1000 * 60 * 60 * 24));
        const retentionDays = item.category === 'Valuable' ? 180 : 
                              item.category === 'Non-Valuable' ? 90 : 30;
        const daysOverdue = daysDiff - retentionDays;
        
        return { ...item, daysOverdue };
    });

    if (itemsForDisposal.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="empty-state">
                        <i class="bi bi-check-circle"></i>
                        <h5>No items for disposal</h5>
                        <p>All items are within their retention periods.</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = itemsForDisposal.map(item => `
            <tr class="overdue-row">
                <td><strong>${item.item_code}</strong></td>
                <td>${item.item_name}</td>
                <td><span class="badge ${getCategoryBadgeClass(item.category)}">${item.category}</span></td>
                <td>${formatDate(item.date_found)}</td>
                <td>${item.category === 'Valuable' ? '6 months' : item.category === 'Non-Valuable' ? '3 months' : '1 month'}</td>
                <td><span class="badge bg-danger">${item.daysOverdue} days</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="openDisposeModal('${item.id}')">
                        <i class="bi bi-trash me-1"></i>Dispose
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Load disposed items log
    const disposedTbody = document.getElementById('disposedItemsTableBody');
    disposedTbody.innerHTML = AppState.disposedItems.map(item => `
        <tr>
            <td>${item.form_f20_number}</td>
            <td>${item.item_code}</td>
            <td>${item.item_name}</td>
            <td>${formatDate(item.disposal_date)}</td>
            <td>${item.disposed_to}</td>
            <td>${item.received_by}</td>
        </tr>
    `).join('');
}

// ============================================
// CSV BACKUP
// ============================================

function downloadBackup() {
    // Prepare data for CSV
    const allData = {
        found_items: AppState.foundItems,
        lost_items: AppState.lostItems,
        disposed_items: AppState.disposedItems
    };

    // Convert to CSV
    let csvContent = 'CHMSU OSAS Binalbagan - Lost and Found System Backup\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Found Items
    csvContent += 'FOUND ITEMS\n';
    csvContent += 'ID,Item Code,Item Name,Category,Date Found,Location Found,Found By,Description,Status,Date Claimed,Claimant Name\n';
    AppState.foundItems.forEach(item => {
        csvContent += `"${item.id}","${item.item_code || ''}","${item.item_name || ''}","${item.category || ''}","${item.date_found || ''}","${item.location_found || ''}","${item.found_by || ''}","${(item.description || '').replace(/"/g, '""')}","${item.status || ''}","${item.date_claimed || ''}","${item.claimant_name || ''}"\n`;
    });

    csvContent += '\nLOST ITEM REPORTS\n';
    csvContent += 'ID,Item Name,Category,Date Lost,Location Lost,Reporter Name,Reporter Contact,Reporter Email,Status\n';
    AppState.lostItems.forEach(item => {
        csvContent += `"${item.id}","${item.item_name || ''}","${item.category || ''}","${item.date_lost || ''}","${item.location_lost || ''}","${item.reporter_name || ''}","${item.reporter_contact || ''}","${item.reporter_email || ''}","${item.status || ''}"\n`;
    });

    csvContent += '\nDISPOSED ITEMS (F.20)\n';
    csvContent += 'Form F.20 No.,Item Code,Item Name,Category,Disposal Date,Disposed To,Received By,Remarks\n';
    AppState.disposedItems.forEach(item => {
        csvContent += `"${item.form_f20_number || ''}","${item.item_code || ''}","${item.item_name || ''}","${item.category || ''}","${item.disposal_date || ''}","${item.disposed_to || ''}","${item.received_by || ''}","${(item.remarks || '').replace(/"/g, '""')}"\n`;
    });

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = URL.createObjectURL(blob);
    link.download = `CHMSU_LostFound_Backup_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Update last backup date
    document.getElementById('lastBackupDate').textContent = new Date().toLocaleString();
    
    showNotification('Full system backup downloaded successfully!', 'success');
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

function handleProfilePictureChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            AppState.adminProfilePicture = e.target.result;
            document.getElementById('profilePicturePreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function handleProfileUpdate(e) {
    e.preventDefault();
    
    AppState.adminName = document.getElementById('adminNameInput').value;
    document.getElementById('adminName').textContent = AppState.adminName;
    document.getElementById('preparedByName').textContent = AppState.adminName;

    // Update session
    const session = JSON.parse(localStorage.getItem('chmsu_session') || '{}');
    session.adminName = AppState.adminName;
    session.adminProfilePicture = AppState.adminProfilePicture;
    localStorage.setItem('chmsu_session', JSON.stringify(session));

    showNotification('Profile updated successfully!', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getStatusBadge(status) {
    const badges = {
        'Logged': '<span class="badge badge-logged"><i class="bi bi-journal-text me-1"></i>Logged</span>',
        'Posted': '<span class="badge badge-posted"><i class="bi bi-megaphone me-1"></i>Posted</span>',
        'Claimed': '<span class="badge badge-claimed"><i class="bi bi-check-circle me-1"></i>Claimed</span>',
        'Disposed': '<span class="badge badge-disposed"><i class="bi bi-trash me-1"></i>Disposed</span>',
        'Pending': '<span class="badge badge-logged"><i class="bi bi-clock me-1"></i>Pending</span>'
    };
    return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function getCategoryBadgeClass(category) {
    const classes = {
        'Valuable': 'bg-warning text-dark',
        'Non-Valuable': 'bg-info text-dark',
        'ID': 'bg-primary'
    };
    return classes[category] || 'bg-secondary';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatMonthYear(monthYearString) {
    if (!monthYearString) return '';
    const [year, month] = monthYearString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function updateDateTime() {
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }) + ' ' + now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const element = document.getElementById('currentDateTime');
    if (element) {
        element.textContent = dateTimeStr;
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} notification-toast`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ============================================
// SUPABASE DATABASE SCHEMA (for reference)
// ============================================
/*
-- Found Items Table
CREATE TABLE found_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date_found DATE NOT NULL,
    location_found VARCHAR(255) NOT NULL,
    found_by VARCHAR(255),
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Logged',
    image TEXT,
    claimant_name VARCHAR(255),
    claimant_id VARCHAR(100),
    claimant_contact VARCHAR(100),
    date_claimed DATE,
    claim_remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lost Items Table
CREATE TABLE lost_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date_lost DATE NOT NULL,
    location_lost VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reporter_name VARCHAR(255) NOT NULL,
    reporter_contact VARCHAR(100) NOT NULL,
    reporter_email VARCHAR(255),
    reporter_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Disposed Items Table (F.20)
CREATE TABLE disposed_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES found_items(id),
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    disposal_date DATE NOT NULL,
    disposed_to VARCHAR(255) NOT NULL,
    received_by VARCHAR(255) NOT NULL,
    remarks TEXT,
    form_f20_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
*/
