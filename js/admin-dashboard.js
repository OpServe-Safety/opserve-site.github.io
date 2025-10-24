// Admin Dashboard - To be connected with Supabase later
let currentView = 'analytics';

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    checkAuth();
    
    // Initialize settings if not exist
    await initializeSettings();
    
    // Load analytics view (default)
    renderAnalyticsView();
    
    // Event listeners
    setupEventListeners();
});

// Check if user is authenticated
async function checkAuth() {
    try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (!session || error) {
            // Not authenticated, redirect to login
            window.location.href = 'admin-login.html';
            return;
        }
        
        // Set admin email in header
        const emailElement = document.getElementById('adminEmail');
        if (emailElement) {
            emailElement.textContent = session.user.email;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'admin-login.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    const navLinks = document.querySelectorAll('.dashboard-nav a[data-view]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.dataset.view;
            switchView(view);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Filter buttons (only if they exist)
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterApplications(this.dataset.status);
        });
    });
    
    // Search (only if it exists)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchApplications(e.target.value);
        });
    }
    
    // Modal close
    const closeModal = document.getElementById('closeApplicationModal');
    const modal = document.getElementById('applicationModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
            modal.classList.remove('active');
        });
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }
}

// Logout
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await window.supabaseClient.auth.signOut();
            sessionStorage.removeItem('adminAuth');
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        }
    }
}

// Load applications
async function loadApplications() {
    try {
        // Load from Supabase
        const { data, error } = await window.supabaseClient
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transform Supabase data to match UI format
        const applications = (data || []).map(app => ({
            id: app.id,
            firstName: app.name ? app.name.split(' ')[0] : '',
            lastName: app.name ? app.name.split(' ').slice(1).join(' ') : '',
            email: app.email,
            phone: app.phone,
            position: app.position,
            other_position: app.other_position,
            experience: app.experience,
            workHistory: app.work_history || [],
            file_urls: app.file_urls || [],
            status: app.status || 'new',
            createdAt: app.created_at,
            notes: app.notes
        }));
        
        // Update stats
        updateStats(applications);
        
        // Render applications
        renderApplications(applications);
        
        // Store for filtering
        window.allApplications = applications;
    } catch (error) {
        console.error('Error loading applications:', error);
        showError('Failed to load applications. ' + error.message);
    }
}

// Update statistics
function updateStats(applications) {
    const stats = {
        total: applications.length,
        new: applications.filter(app => app.status === 'new').length,
        review: applications.filter(app => app.status === 'review').length,
        approved: applications.filter(app => app.status === 'approved').length
    };
    
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statNew').textContent = stats.new;
    document.getElementById('statReview').textContent = stats.review;
    document.getElementById('statApproved').textContent = stats.approved;
}

// Render applications table
function renderApplications(applications) {
    const tbody = document.getElementById('applicationsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (applications.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = applications.map(app => `
        <tr onclick="viewApplication('${app.id}')">
            <td>
                <div class="applicant-name">${app.firstName} ${app.lastName}</div>
                <div class="applicant-email">${app.email}</div>
            </td>
            <td>${app.position}</td>
            <td>${formatDate(app.createdAt)}</td>
            <td>
                <span class="status-badge status-${app.status}">${formatStatus(app.status)}</span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="event.stopPropagation(); viewApplication('${app.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); changeStatus('${app.id}')" title="Change Status">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteApplication('${app.id}')" title="Delete Application" style="color: #dc3545;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// View application details
function viewApplication(id) {
    const application = window.allApplications.find(app => app.id === id);
    if (!application) return;
    
    const modal = document.getElementById('applicationModal');
    const content = document.getElementById('applicationDetailContent');
    
    content.innerHTML = `
        <h2>${application.firstName} ${application.lastName}</h2>
        <div style="color: #6c757d; margin-bottom: 30px;">
            Applied for: <strong>${application.position}</strong> • 
            ${formatDate(application.createdAt)}
        </div>
        
        <div style="margin-bottom: 30px;">
            <h3 style="margin-bottom: 15px;">Contact Information</h3>
            <p><strong>Email:</strong> <a href="mailto:${application.email}">${application.email}</a></p>
            <p><strong>Phone:</strong> ${application.phone || 'Not provided'}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h3 style="margin-bottom: 15px;">Experience</h3>
            <p style="white-space: pre-line;">${application.experience}</p>
        </div>
        
        ${application.workHistory && application.workHistory.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px;">Work History</h3>
                ${application.workHistory.map(work => `
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-weight: 600; margin-bottom: 5px;">${work.jobTitle} at ${work.company}</div>
                        <div style="color: #6c757d; font-size: 0.9rem; margin-bottom: 10px;">
                            ${work.startDate} - ${work.endDate || 'Present'}
                        </div>
                        <p style="margin: 0;">${work.description || ''}</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${application.file_urls && application.file_urls.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px;">Uploaded Files</h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${application.file_urls.map(file => `
                        <a href="${file.url}" target="_blank" rel="noopener noreferrer" 
                           style="display: flex; align-items: center; gap: 10px; padding: 12px 15px; background: #f8f9fa; border-radius: 8px; text-decoration: none; color: #333; transition: background 0.2s;">
                            <i class="fas fa-file-${getFileIcon(file.name)}" style="color: var(--primary-color); font-size: 1.2rem;"></i>
                            <span style="flex: 1;">${file.name}</span>
                            <i class="fas fa-external-link-alt" style="color: #6c757d; font-size: 0.9rem;"></i>
                        </a>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div style="margin-bottom: 30px;">
            <h3 style="margin-bottom: 15px;">Current Status</h3>
            <span class="status-badge status-${application.status}">${formatStatus(application.status)}</span>
        </div>
        
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="updateApplicationStatus('${id}', 'review')">
                Move to Review
            </button>
            <button class="btn btn-secondary" onclick="updateApplicationStatus('${id}', 'approved')" 
                style="background: #28a745; border-color: #28a745; color: white;">
                Approve
            </button>
            <button class="btn btn-secondary" onclick="updateApplicationStatus('${id}', 'denied')"
                style="background: #dc3545; border-color: #dc3545; color: white;">
                Deny
            </button>
            <button class="btn btn-secondary" onclick="emailApplicant('${application.email}')">
                <i class="fas fa-envelope"></i> Email Applicant
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

// Update application status
function updateApplicationStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to change the status to "${formatStatus(newStatus)}"?`)) {
        return;
    }
    
    // TODO: Update in Supabase
    const appIndex = window.allApplications.findIndex(app => app.id === id);
    if (appIndex !== -1) {
        window.allApplications[appIndex].status = newStatus;
        window.allApplications[appIndex].updatedAt = new Date().toISOString();
        
        // Re-render
        updateStats(window.allApplications);
        renderApplications(window.allApplications);
        
        // Close modal
        document.getElementById('applicationModal').style.display = 'none';
        
        // Show success message
        showSuccess(`Application status updated to "${formatStatus(newStatus)}"`);
    }
}

// Delete application
async function deleteApplication(id) {
    const application = window.allApplications.find(app => app.id === id);
    if (!application) return;
    
    const confirmMsg = `Are you sure you want to delete the application from ${application.firstName} ${application.lastName}?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        // Delete from Supabase
        const { error } = await window.supabaseClient
            .from('applications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Remove from local array
        window.allApplications = window.allApplications.filter(app => app.id !== id);
        
        // Re-render
        updateStats(window.allApplications);
        renderApplications(window.allApplications);
        
        showSuccess('Application deleted successfully');
    } catch (error) {
        console.error('Error deleting application:', error);
        showError('Failed to delete application: ' + error.message);
    }
}

// Email applicant
function emailApplicant(email) {
    if (!email) {
        alert('No email address available for this applicant.');
        return;
    }
    
    // Create a temporary anchor element and click it
    const mailtoLink = document.createElement('a');
    mailtoLink.href = `mailto:${email}`;
    mailtoLink.target = '_blank';
    mailtoLink.click();
}

// Filter applications
function filterApplications(status) {
    if (status === 'all') {
        renderApplications(window.allApplications);
    } else {
        const filtered = window.allApplications.filter(app => app.status === status);
        renderApplications(filtered);
    }
}

// Search applications
function searchApplications(query) {
    if (!query.trim()) {
        renderApplications(window.allApplications);
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const filtered = window.allApplications.filter(app => 
        app.firstName.toLowerCase().includes(searchTerm) ||
        app.lastName.toLowerCase().includes(searchTerm) ||
        app.email.toLowerCase().includes(searchTerm) ||
        app.position.toLowerCase().includes(searchTerm)
    );
    
    renderApplications(filtered);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatStatus(status) {
    const statusMap = {
        'new': 'New',
        'review': 'Under Review',
        'approved': 'Approved',
        'denied': 'Denied',
        'onboarded': 'Onboarded'
    };
    return statusMap[status] || status;
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch(ext) {
        case 'pdf':
            return 'pdf';
        case 'doc':
        case 'docx':
            return 'word';
        default:
            return 'alt';
    }
}

function showSuccess(message) {
    // TODO: Implement toast notification
    alert(message);
}

function showError(message) {
    // TODO: Implement toast notification
    alert('Error: ' + message);
}

// Sample data (to be replaced with Supabase data)
function getSampleApplications() {
    return [
        {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '(240) 555-0101',
            position: 'Security Agent',
            experience: 'Former military police officer with 5 years of experience in crowd management and event security. Trained in conflict resolution and emergency response.',
            status: 'new',
            createdAt: '2025-01-20T10:30:00',
            updatedAt: '2025-01-20T10:30:00',
            workHistory: [
                {
                    company: 'US Army',
                    position: 'Military Police',
                    startDate: '2018-01',
                    endDate: '2023-06',
                    description: 'Responsible for maintaining law and order on military installations.'
                }
            ]
        },
        {
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '(240) 555-0102',
            position: 'Safety Supervisor',
            experience: '8 years of experience in event security management. Certified in CPR and First Aid. Experience managing teams of 10+ security personnel.',
            status: 'review',
            createdAt: '2025-01-19T14:15:00',
            updatedAt: '2025-01-19T14:15:00',
            workHistory: []
        },
        {
            id: '3',
            firstName: 'Michael',
            lastName: 'Johnson',
            email: 'michael.j@example.com',
            phone: '(240) 555-0103',
            position: 'Event Staff',
            experience: '2 years of customer service experience. Looking to transition into security. Excellent communication skills.',
            status: 'new',
            createdAt: '2025-01-18T09:45:00',
            updatedAt: '2025-01-18T09:45:00',
            workHistory: []
        }
    ];
}

// ===== SETTINGS MANAGEMENT =====

// Initialize default settings
async function initializeSettings() {
    // Load positions from Supabase
    let savedPositions = null;
    try {
        const { data, error } = await window.supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'positions')
            .single();
        
        if (!error && data) {
            savedPositions = data.value;
        }
    } catch (error) {
        console.log('No saved positions in database, using defaults');
    }
    
    const defaultSettings = {
        positions: savedPositions || [
            { value: 'admin', label: 'Admin', active: true },
            { value: 'event-staff', label: 'Event Staff', active: true },
            { value: 'agent', label: 'Agent', active: true },
            { value: 'safety-agent', label: 'Safety Agent', active: true },
            { value: 'safety-supervisor', label: 'Safety Supervisor', active: true },
            { value: 'manager', label: 'Manager', active: true },
            { value: 'other', label: 'Other', active: true }
        ],
        emailNotifications: {
            enabled: true,
            adminEmail: 'admin@opservesafetygroup.com',
            notifyOnApplication: true,
            notifyOnContact: true,
            autoReplyEnabled: true,
            autoReplySubject: 'Application Received - OpServe Safety Group',
            autoReplyMessage: 'Thank you for your application to OpServe Safety Group. We have received your submission and will review it shortly. We will contact you if your qualifications match our current openings.\n\nBest regards,\nOpServe Safety Group Team'
        },
        security: {
            sessionTimeout: 24, // hours
            requirePasswordChange: false,
            twoFactorEnabled: false
        },
        integrations: {
            supabase: {
                connected: false,
                url: '',
                anonKey: ''
            },
            emailService: {
                provider: 'none', // none, sendgrid, mailgun, resend
                apiKey: ''
            },
            analytics: {
                googleAnalyticsId: '',
                enabled: false
            },
            recaptcha: {
                siteKey: '',
                secretKey: '',
                enabled: false
            },
            quoteSettings: {
                defaultTaxRate: 0.06,
                quoteNumberPrefix: 'OSG',
                validityDays: 30,
                stateTaxRates: {
                    'AL': 0.04, 'AK': 0.00, 'AZ': 0.056, 'AR': 0.065, 'CA': 0.0725,
                    'CO': 0.029, 'CT': 0.0635, 'DE': 0.00, 'FL': 0.06, 'GA': 0.04,
                    'HI': 0.04, 'ID': 0.06, 'IL': 0.0625, 'IN': 0.07, 'IA': 0.06,
                    'KS': 0.065, 'KY': 0.06, 'LA': 0.0445, 'ME': 0.055, 'MD': 0.06,
                    'MA': 0.0625, 'MI': 0.06, 'MN': 0.06875, 'MS': 0.07, 'MO': 0.04225,
                    'MT': 0.00, 'NE': 0.055, 'NV': 0.0685, 'NH': 0.00, 'NJ': 0.06625,
                    'NM': 0.05125, 'NY': 0.04, 'NC': 0.0475, 'ND': 0.05, 'OH': 0.0575,
                    'OK': 0.045, 'OR': 0.00, 'PA': 0.06, 'RI': 0.07, 'SC': 0.06,
                    'SD': 0.045, 'TN': 0.07, 'TX': 0.0625, 'UT': 0.0485, 'VT': 0.06,
                    'VA': 0.053, 'WA': 0.065, 'WV': 0.06, 'WI': 0.05, 'WY': 0.04,
                    'DC': 0.06
                },
                positionRates: {
                    'admin': 50,
                    'event-staff': 30,
                    'agent': 35,
                    'safety-agent': 40,
                    'safety-supervisor': 50,
                    'manager': 60
                },
                serviceDurations: {
                    'event-security': 8,
                    'executive-protection': 24,
                    'crowd-management': 6,
                    'risk-assessment': 1
                },
                paymentTerms: [
                    '50% deposit, balance due day of event',
                    '50% deposit, balance due 24 hours before service',
                    'Net 30',
                    'Net 15',
                    'Due upon service'
                ]
            }
        },
        websiteContent: {
            hero: {
                headline: 'Professional Event Security Management',
                subtitle: 'Ensuring safety and security for events of all sizes in Maryland and beyond.',
                backgroundImage: 'images/hero-bg.jpg',
                ctaPrimaryText: 'Get in Touch',
                ctaSecondaryText: 'Our Services'
            },
            about: {
                title: 'About OpServe Safety Group',
                subtitle: 'Your trusted partner in event security solutions',
                paragraph1: 'OpServe Safety Group LLC is a premier event security management company based in Maryland, dedicated to providing top-tier security services for events of all sizes. Our team of highly trained professionals is committed to ensuring the safety and security of your guests, staff, and venue.',
                paragraph2: 'With years of experience in the security industry, we understand the unique challenges that events present and provide customized security solutions to meet your specific needs.',
                teamImage: 'images/team-photo.jpg'
            },
            services: {
                title: 'Our Services',
                subtitle: 'Comprehensive security solutions for your events',
                crowdManagement: {
                    title: 'Crowd Management',
                    description: 'Professional crowd control and management to ensure smooth event operations and guest safety.',
                    icon: 'fa-users'
                },
                eventSecurity: {
                    title: 'Event Security',
                    description: 'Comprehensive security services tailored to your specific event requirements and venue.',
                    icon: 'fa-shield-alt'
                },
                executiveProtection: {
                    title: 'Executive Protection',
                    description: 'Discreet and professional protection services for VIPs and high-profile guests.',
                    icon: 'fa-user-shield'
                },
                riskAssessment: {
                    title: 'Risk Assessment',
                    description: 'Comprehensive security evaluations to identify and mitigate potential risks for your event.',
                    icon: 'fa-clipboard-check'
                }
            }
        }
    };
    
    const existingSettings = localStorage.getItem('adminSettings');
    
    if (!existingSettings) {
        // No settings exist, save defaults
        localStorage.setItem('adminSettings', JSON.stringify(defaultSettings));
        // Sync website content to separate key for easy access
        localStorage.setItem('websiteContent', JSON.stringify(defaultSettings.websiteContent));
        
        // Save positions to Supabase if not already there
        if (!savedPositions) {
            try {
                await window.supabaseClient
                    .from('settings')
                    .upsert({
                        key: 'positions',
                        value: defaultSettings.positions
                    }, {
                        onConflict: 'key'
                    });
                console.log('Initial positions saved to Supabase');
            } catch (error) {
                console.error('Error saving initial positions:', error);
            }
        }
    } else {
        // Merge existing settings with defaults (in case new properties were added)
        const settings = JSON.parse(existingSettings);
        
        // Merge top-level properties
        const mergedSettings = {
            positions: settings.positions || defaultSettings.positions,
            emailNotifications: { ...defaultSettings.emailNotifications, ...(settings.emailNotifications || {}) },
            security: { ...defaultSettings.security, ...(settings.security || {}) },
            integrations: {
                supabase: { ...defaultSettings.integrations.supabase, ...(settings.integrations?.supabase || {}) },
                emailService: { ...defaultSettings.integrations.emailService, ...(settings.integrations?.emailService || {}) },
                analytics: { ...defaultSettings.integrations.analytics, ...(settings.integrations?.analytics || {}) },
                recaptcha: { ...defaultSettings.integrations.recaptcha, ...(settings.integrations?.recaptcha || {}) }
            },
            quoteSettings: settings.quoteSettings ? {
                ...defaultSettings.integrations.quoteSettings,
                ...settings.quoteSettings
            } : defaultSettings.integrations.quoteSettings,
            websiteContent: settings.websiteContent ? {
                hero: { ...defaultSettings.websiteContent.hero, ...(settings.websiteContent.hero || {}) },
                about: { ...defaultSettings.websiteContent.about, ...(settings.websiteContent.about || {}) },
                services: {
                    title: settings.websiteContent.services?.title || defaultSettings.websiteContent.services.title,
                    subtitle: settings.websiteContent.services?.subtitle || defaultSettings.websiteContent.services.subtitle,
                    crowdManagement: { ...defaultSettings.websiteContent.services.crowdManagement, ...(settings.websiteContent.services?.crowdManagement || {}) },
                    eventSecurity: { ...defaultSettings.websiteContent.services.eventSecurity, ...(settings.websiteContent.services?.eventSecurity || {}) },
                    executiveProtection: { ...defaultSettings.websiteContent.services.executiveProtection, ...(settings.websiteContent.services?.executiveProtection || {}) },
                    riskAssessment: { ...defaultSettings.websiteContent.services.riskAssessment, ...(settings.websiteContent.services?.riskAssessment || {}) }
                }
            } : defaultSettings.websiteContent
        };
        
        localStorage.setItem('adminSettings', JSON.stringify(mergedSettings));
        // Sync website content to separate key for easy access
        localStorage.setItem('websiteContent', JSON.stringify(mergedSettings.websiteContent));
        
        // Save positions to Supabase if not already there
        if (!savedPositions) {
            try {
                await window.supabaseClient
                    .from('settings')
                    .upsert({
                        key: 'positions',
                        value: mergedSettings.positions
                    }, {
                        onConflict: 'key'
                    });
                console.log('Positions synced to Supabase');
            } catch (error) {
                console.error('Error syncing positions:', error);
            }
        }
    }
}

// Switch between views
function switchView(view) {
    currentView = view;
    const mainContent = document.querySelector('.dashboard-main');
    
    switch(view) {
        case 'applications':
            renderApplicationsView();
            break;
        case 'contacts':
            renderContactsView();
            break;
        case 'quotes':
            renderQuotesView();
            break;
        case 'analytics':
            renderAnalyticsView();
            break;
        case 'settings':
            renderSettingsView();
            break;
    }
}

// Render applications view (existing content)
function renderApplicationsView() {
    const mainContent = document.querySelector('.dashboard-main');
    mainContent.innerHTML = `
        <!-- Header -->
        <div class="dashboard-header">
            <h1>Applications</h1>
            <div class="dashboard-user">
                <i class="fas fa-user-shield"></i>
                <span id="adminEmail">admin@opservesafetygroup.com</span>
            </div>
        </div>
        
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Applications</h3>
                <div class="stat-number" id="statTotal">0</div>
                <div class="stat-label">All time</div>
            </div>
            <div class="stat-card">
                <h3>New Applications</h3>
                <div class="stat-number" id="statNew">0</div>
                <div class="stat-label">Awaiting review</div>
            </div>
            <div class="stat-card">
                <h3>Under Review</h3>
                <div class="stat-number" id="statReview">0</div>
                <div class="stat-label">In progress</div>
            </div>
            <div class="stat-card">
                <h3>Approved</h3>
                <div class="stat-number" id="statApproved">0</div>
                <div class="stat-label">Ready to onboard</div>
            </div>
        </div>
        
        <!-- Filters -->
        <div class="filters-bar">
            <div class="filter-group">
                <button class="filter-btn active" data-status="all">All</button>
                <button class="filter-btn" data-status="new">New</button>
                <button class="filter-btn" data-status="review">Under Review</button>
                <button class="filter-btn" data-status="approved">Approved</button>
                <button class="filter-btn" data-status="denied">Denied</button>
                <button class="filter-btn" data-status="onboarded">Onboarded</button>
            </div>
            <div class="search-box">
                <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="Search by name, email, or position..."
                >
            </div>
        </div>
        
        <!-- Applications Table -->
        <div class="applications-container">
            <div class="table-responsive">
                <table class="applications-table">
                    <thead>
                        <tr>
                            <th>Applicant</th>
                            <th>Position</th>
                            <th>Applied</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="applicationsTableBody">
                        <!-- Will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>
            
            <!-- Empty State -->
            <div class="empty-state" id="emptyState" style="display: none;">
                <i class="fas fa-inbox"></i>
                <h3>No applications found</h3>
                <p>Applications will appear here when submitted.</p>
            </div>
        </div>
    `;
    
    // Reload applications
    loadApplications();
    
    // Re-attach event listeners for this view
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterApplications(this.dataset.status);
        });
    });
    
    document.getElementById('searchInput').addEventListener('input', function(e) {
        searchApplications(e.target.value);
    });
}

// Render settings view
function renderSettingsView() {
    let settings = JSON.parse(localStorage.getItem('adminSettings'));
    
    // Ensure quoteSettings exists
    if (!settings.quoteSettings) {
        // Re-initialize settings to add missing properties
        initializeSettings();
        settings = JSON.parse(localStorage.getItem('adminSettings'));
    }
    
    // Fallback if still missing
    if (!settings.quoteSettings) {
        settings.quoteSettings = {
            defaultTaxRate: 0.06,
            quoteNumberPrefix: 'OSG',
            validityDays: 30,
            stateTaxRates: {},
            positionRates: {},
            serviceDurations: {
                'event-security': 8,
                'executive-protection': 24,
                'crowd-management': 6,
                'risk-assessment': 1
            },
            paymentTerms: ['50% deposit, balance due day of event', '50% deposit, balance due 24 hours before service', 'Net 30', 'Net 15', 'Due upon service']
        };
    }
    
    // Ensure stateTaxRates exists
    if (!settings.quoteSettings.stateTaxRates || Object.keys(settings.quoteSettings.stateTaxRates).length === 0) {
        settings.quoteSettings.stateTaxRates = {
            'AL': 0.04, 'AK': 0.00, 'AZ': 0.056, 'AR': 0.065, 'CA': 0.0725,
            'CO': 0.029, 'CT': 0.0635, 'DE': 0.00, 'FL': 0.06, 'GA': 0.04,
            'HI': 0.04, 'ID': 0.06, 'IL': 0.0625, 'IN': 0.07, 'IA': 0.06,
            'KS': 0.065, 'KY': 0.06, 'LA': 0.0445, 'ME': 0.055, 'MD': 0.06,
            'MA': 0.0625, 'MI': 0.06, 'MN': 0.06875, 'MS': 0.07, 'MO': 0.04225,
            'MT': 0.00, 'NE': 0.055, 'NV': 0.0685, 'NH': 0.00, 'NJ': 0.06625,
            'NM': 0.05125, 'NY': 0.04, 'NC': 0.0475, 'ND': 0.05, 'OH': 0.0575,
            'OK': 0.045, 'OR': 0.00, 'PA': 0.06, 'RI': 0.07, 'SC': 0.06,
            'SD': 0.045, 'TN': 0.07, 'TX': 0.0625, 'UT': 0.0485, 'VT': 0.06,
            'VA': 0.053, 'WA': 0.065, 'WV': 0.06, 'WI': 0.05, 'WY': 0.04,
            'DC': 0.06
        };
    }
    
    // Ensure all positions have rates
    if (!settings.quoteSettings.positionRates) {
        settings.quoteSettings.positionRates = {};
    }
    
    // Add default rates for any missing positions
    settings.positions.forEach(pos => {
        if (pos.value !== 'other' && !settings.quoteSettings.positionRates[pos.value]) {
            settings.quoteSettings.positionRates[pos.value] = 35; // Default rate
        }
    });
    
    // Ensure serviceDurations exists with defaults
    if (!settings.quoteSettings.serviceDurations) {
        settings.quoteSettings.serviceDurations = {
            'event-security': 8,
            'executive-protection': 24,
            'crowd-management': 6,
            'risk-assessment': 1
        };
    }
    
    // Ensure paymentTerms exists
    if (!settings.quoteSettings.paymentTerms || settings.quoteSettings.paymentTerms.length === 0) {
        settings.quoteSettings.paymentTerms = [
            '50% deposit, balance due day of event',
            '50% deposit, balance due 24 hours before service',
            'Net 30',
            'Net 15',
            'Due upon service'
        ];
    }
    
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    const mainContent = document.querySelector('.dashboard-main');
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h1>Settings</h1>
            <div class="dashboard-user">
                <i class="fas fa-user-shield"></i>
                <span id="adminEmail">admin@opservesafetygroup.com</span>
            </div>
        </div>
        
        <div class="settings-container">
            <!-- Admin & Security Section -->
            <div class="settings-section">
                <h2><i class="fas fa-shield-alt"></i> Admin & Security</h2>
                <div class="section-content">
                    <p style="color: #6c757d; margin-bottom: 25px;">Manage admin account security and session settings.</p>
                    
                    <div class="setting-row">
                    <label class="setting-label-full">Session Timeout (hours)</label>
                    <input type="number" id="sessionTimeout" value="${settings.security.sessionTimeout}" 
                           onchange="updateSecuritySetting('sessionTimeout', parseInt(this.value))"
                           min="1" max="168"
                           style="width: 200px; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <small style="display: block; color: #6c757d; margin-top: 5px;">Auto-logout after this many hours of inactivity</small>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Change Password</label>
                    <button class="btn btn-secondary" onclick="changeAdminPassword()">
                        <i class="fas fa-key"></i> Change Password
                    </button>
                    <small style="display: block; color: #6c757d; margin-top: 5px;">Update your admin password</small>
                </div>
                
                <div class="setting-row">
                    <label class="setting-toggle">
                        <span class="setting-label">Two-Factor Authentication (Coming Soon)</span>
                        <input type="checkbox" disabled title="Feature coming soon">
                        <span class="toggle-slider" style="opacity: 0.5;"></span>
                    </label>
                </div>
                </div>
            </div>
            
            <!-- Website Content Section -->
            <div class="settings-section">
                <h2><i class="fas fa-globe"></i> Website Content</h2>
                <div class="section-content">
                    <p style="color: #6c757d; margin-bottom: 25px;">Edit the content displayed on your main website.</p>
                
                <!-- Hero Section -->
                <h3 style="margin-top: 20px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-image" style="color: #e43b04;"></i> Hero Section
                </h3>
                
                <div class="setting-row">
                    <label class="setting-label-full">Main Headline</label>
                    <input type="text" id="heroHeadline" value="${settings.websiteContent.hero.headline}" 
                           onchange="updateWebsiteContent('hero', 'headline', this.value)"
                           placeholder="Professional Event Security Management"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Subtitle</label>
                    <input type="text" id="heroSubtitle" value="${settings.websiteContent.hero.subtitle}" 
                           onchange="updateWebsiteContent('hero', 'subtitle', this.value)"
                           placeholder="Ensuring safety and security..."
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Background Image URL</label>
                    <input type="text" id="heroImage" value="${settings.websiteContent.hero.backgroundImage}" 
                           onchange="updateWebsiteContent('hero', 'backgroundImage', this.value)"
                           placeholder="images/hero-bg.jpg"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <small style="display: block; color: #6c757d; margin-top: 5px;">Use a relative path or full URL</small>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="setting-row">
                        <label class="setting-label-full">Primary Button Text</label>
                        <input type="text" id="heroCta1" value="${settings.websiteContent.hero.ctaPrimaryText}" 
                               onchange="updateWebsiteContent('hero', 'ctaPrimaryText', this.value)"
                               placeholder="Get in Touch"
                               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    </div>
                    <div class="setting-row">
                        <label class="setting-label-full">Secondary Button Text</label>
                        <input type="text" id="heroCta2" value="${settings.websiteContent.hero.ctaSecondaryText}" 
                               onchange="updateWebsiteContent('hero', 'ctaSecondaryText', this.value)"
                               placeholder="Our Services"
                               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    </div>
                </div>
                
                <!-- About Section -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-info-circle" style="color: #e43b04;"></i> About Section
                </h3>
                
                <div class="setting-row">
                    <label class="setting-label-full">Section Title</label>
                    <input type="text" id="aboutTitle" value="${settings.websiteContent.about.title}" 
                           onchange="updateWebsiteContent('about', 'title', this.value)"
                           placeholder="About OpServe Safety Group"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Subtitle</label>
                    <input type="text" id="aboutSubtitle" value="${settings.websiteContent.about.subtitle}" 
                           onchange="updateWebsiteContent('about', 'subtitle', this.value)"
                           placeholder="Your trusted partner..."
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">First Paragraph</label>
                    <textarea id="aboutPara1" onchange="updateWebsiteContent('about', 'paragraph1', this.value)"
                              rows="3" placeholder="OpServe Safety Group LLC is a premier..."
                              style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">${settings.websiteContent.about.paragraph1}</textarea>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Second Paragraph</label>
                    <textarea id="aboutPara2" onchange="updateWebsiteContent('about', 'paragraph2', this.value)"
                              rows="3" placeholder="With years of experience..."
                              style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">${settings.websiteContent.about.paragraph2}</textarea>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Team Photo URL</label>
                    <input type="text" id="aboutImage" value="${settings.websiteContent.about.teamImage}" 
                           onchange="updateWebsiteContent('about', 'teamImage', this.value)"
                           placeholder="images/team-photo.jpg"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <!-- Services Section -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-briefcase" style="color: #e43b04;"></i> Services Section
                </h3>
                
                <div class="setting-row">
                    <label class="setting-label-full">Section Title</label>
                    <input type="text" id="servicesTitle" value="${settings.websiteContent.services.title}" 
                           onchange="updateWebsiteContent('services', 'title', this.value)"
                           placeholder="Our Services"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Subtitle</label>
                    <input type="text" id="servicesSubtitle" value="${settings.websiteContent.services.subtitle}" 
                           onchange="updateWebsiteContent('services', 'subtitle', this.value)"
                           placeholder="Comprehensive security solutions..."
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <!-- Service Cards -->
                <div style="margin-top: 20px; display: grid; gap: 20px;">
                    <!-- Crowd Management -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <h4 style="margin-bottom: 15px; color: #333;"><i class="fas fa-users" style="color: #e43b04;"></i> Crowd Management</h4>
                        <div class="setting-row">
                            <label class="setting-label-full">Card Title</label>
                            <input type="text" value="${settings.websiteContent.services.crowdManagement.title}" 
                                   onchange="updateServiceCard('crowdManagement', 'title', this.value)"
                                   style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        </div>
                        <div class="setting-row">
                            <label class="setting-label-full">Description</label>
                            <textarea onchange="updateServiceCard('crowdManagement', 'description', this.value)"
                                      rows="2" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">${settings.websiteContent.services.crowdManagement.description}</textarea>
                        </div>
                    </div>
                    
                    <!-- Event Security -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <h4 style="margin-bottom: 15px; color: #333;"><i class="fas fa-shield-alt" style="color: #e43b04;"></i> Event Security</h4>
                        <div class="setting-row">
                            <label class="setting-label-full">Card Title</label>
                            <input type="text" value="${settings.websiteContent.services.eventSecurity.title}" 
                                   onchange="updateServiceCard('eventSecurity', 'title', this.value)"
                                   style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        </div>
                        <div class="setting-row">
                            <label class="setting-label-full">Description</label>
                            <textarea onchange="updateServiceCard('eventSecurity', 'description', this.value)"
                                      rows="2" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">${settings.websiteContent.services.eventSecurity.description}</textarea>
                        </div>
                    </div>
                    
                    <!-- Executive Protection -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <h4 style="margin-bottom: 15px; color: #333;"><i class="fas fa-user-shield" style="color: #e43b04;"></i> Executive Protection</h4>
                        <div class="setting-row">
                            <label class="setting-label-full">Card Title</label>
                            <input type="text" value="${settings.websiteContent.services.executiveProtection.title}" 
                                   onchange="updateServiceCard('executiveProtection', 'title', this.value)"
                                   style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        </div>
                        <div class="setting-row">
                            <label class="setting-label-full">Description</label>
                            <textarea onchange="updateServiceCard('executiveProtection', 'description', this.value)"
                                      rows="2" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">${settings.websiteContent.services.executiveProtection.description}</textarea>
                        </div>
                    </div>
                    
                    <!-- Risk Assessment -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <h4 style="margin-bottom: 15px; color: #333;"><i class="fas fa-clipboard-check" style="color: #e43b04;"></i> Risk Assessment</h4>
                        <div class="setting-row">
                            <label class="setting-label-full">Card Title</label>
                            <input type="text" value="${settings.websiteContent.services.riskAssessment.title}" 
                                   onchange="updateServiceCard('riskAssessment', 'title', this.value)"
                                   style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        </div>
                        <div class="setting-row">
                            <label class="setting-label-full">Description</label>
                            <textarea onchange="updateServiceCard('riskAssessment', 'description', this.value)"
                                      rows="2" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">${settings.websiteContent.services.riskAssessment.description}</textarea>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            
            <!-- Application Positions Section -->
            <div class="settings-section">
                <h2><i class="fas fa-briefcase"></i> Application Positions</h2>
                <div class="section-content">
                    <p style="color: #6c757d; margin-bottom: 25px;">
                    Select which positions should appear in the Apply Now form dropdown. Uncheck positions you're not currently recruiting for.
                    <br><strong>Tip:</strong> Drag and drop positions to reorder them. The "Other" position always stays at the end and cannot be deleted.
                </p>
                
                <div class="positions-list" id="positionsList">
                    ${settings.positions.map((pos, index) => `
                        <div class="position-item ${pos.value === 'other' ? 'position-locked' : ''}" 
                             style="position: relative;" 
                             draggable="${pos.value !== 'other'}" 
                             data-position-value="${pos.value}"
                             data-position-index="${index}">
                            ${pos.value !== 'other' ? `
                                <div class="drag-handle" title="Drag to reorder">
                                    <i class="fas fa-grip-vertical"></i>
                                </div>
                            ` : `
                                <div class="drag-handle" style="color: #ccc;" title="Other position always stays at the end">
                                    <i class="fas fa-lock"></i>
                                </div>
                            `}
                            <label class="position-checkbox">
                                <input 
                                    type="checkbox" 
                                    value="${pos.value}" 
                                    ${pos.active ? 'checked' : ''}
                                    onchange="togglePosition('${pos.value}')"
                                >
                                <span class="checkbox-custom"></span>
                                <span class="position-label">${pos.label}</span>
                            </label>
                            ${pos.value !== 'other' ? `
                                <button 
                                    onclick="deletePosition('${pos.value}')" 
                                    class="position-delete-btn"
                                    title="Delete position"
                                >
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 30px; padding-top: 30px; border-top: 2px solid #e0e0e0;">
                    <h3 style="margin-bottom: 15px; font-size: 1.2rem;">
                        <i class="fas fa-plus-circle" style="color: #e43b04;"></i> Add New Position
                    </h3>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                        <input 
                            type="text" 
                            id="newPositionLabel" 
                            placeholder="Position Name (e.g., Event Coordinator)"
                            style="flex: 1; min-width: 250px; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        >
                        <button 
                            class="add-position-btn" 
                            onclick="addNewPosition()" 
                            title="Add Position"
                        >
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                </div>
            </div>
            
            <!-- Email Notifications Section -->
            <div class="settings-section">
                <h2><i class="fas fa-envelope"></i> Email Notifications</h2>
                <div class="section-content">
                    <p style="color: #6c757d; margin-bottom: 25px;">Configure how you receive notifications about applications and contact form submissions.</p>
                
                <div class="setting-row">
                    <label class="setting-toggle">
                        <span class="setting-label">Enable Email Notifications</span>
                        <input type="checkbox" id="emailEnabled" ${settings.emailNotifications.enabled ? 'checked' : ''} onchange="updateEmailSetting('enabled', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Admin Email Address</label>
                    <input type="email" id="adminEmail" value="${settings.emailNotifications.adminEmail}" 
                           onchange="updateEmailSetting('adminEmail', this.value)"
                           placeholder="admin@opservesafetygroup.com"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-toggle">
                        <span class="setting-label">Notify on New Applications</span>
                        <input type="checkbox" id="notifyApplication" ${settings.emailNotifications.notifyOnApplication ? 'checked' : ''} 
                               onchange="updateEmailSetting('notifyOnApplication', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <label class="setting-toggle">
                        <span class="setting-label">Notify on Contact Form Submissions</span>
                        <input type="checkbox" id="notifyContact" ${settings.emailNotifications.notifyOnContact ? 'checked' : ''} 
                               onchange="updateEmailSetting('notifyOnContact', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <label class="setting-toggle">
                        <span class="setting-label">Send Auto-Reply to Applicants</span>
                        <input type="checkbox" id="autoReply" ${settings.emailNotifications.autoReplyEnabled ? 'checked' : ''} 
                               onchange="updateEmailSetting('autoReplyEnabled', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Auto-Reply Subject</label>
                    <input type="text" id="autoReplySubject" value="${settings.emailNotifications.autoReplySubject}" 
                           onchange="updateEmailSetting('autoReplySubject', this.value)"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Auto-Reply Message</label>
                    <textarea id="autoReplyMessage" rows="5" 
                              onchange="updateEmailSetting('autoReplyMessage', this.value)"
                              style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">${settings.emailNotifications.autoReplyMessage}</textarea>
                </div>
                </div>
            </div>
            
            <!-- Quote Settings Section -->
            <div class="settings-section">
                <h2><i class="fas fa-file-invoice-dollar"></i> Quote Settings</h2>
                <div class="section-content">
                    <p style="color: #6c757d; margin-bottom: 25px;">Configure pricing, rates, and defaults for quote generation.</p>
                
                <!-- General Settings -->
                <h3 style="margin-top: 20px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-cog" style="color: #e43b04;"></i> General
                </h3>
                
                <div class="setting-row">
                    <label class="setting-label-full">Default Tax Rate (%)</label>
                    <input type="number" id="defaultTaxRate" value="${(settings.quoteSettings.defaultTaxRate * 100).toFixed(2)}" 
                           onchange="updateQuoteSetting('defaultTaxRate', parseFloat(this.value) / 100)"
                           min="0" max="100" step="0.01"
                           style="width: 200px; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <small style="display: block; color: #6c757d; margin-top: 5px;">Used as fallback when client state is unknown. State-specific rates auto-apply in quotes.</small>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Quote Number Prefix</label>
                    <input type="text" id="quotePrefix" value="${settings.quoteSettings.quoteNumberPrefix}" 
                           onchange="updateQuoteSetting('quoteNumberPrefix', this.value)"
                           placeholder="OSG"
                           style="width: 200px; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <small style="display: block; color: #6c757d; margin-top: 5px;">Example: ${settings.quoteSettings.quoteNumberPrefix}-2025-001</small>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Quote Validity (days)</label>
                    <input type="number" id="validityDays" value="${settings.quoteSettings.validityDays}" 
                           onchange="updateQuoteSetting('validityDays', parseInt(this.value))"
                           min="1" max="365"
                           style="width: 200px; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <small style="display: block; color: #6c757d; margin-top: 5px;">How long quotes remain valid</small>
                </div>
                
                <!-- Position Rates -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-dollar-sign" style="color: #e43b04;"></i> Position Hourly Rates
                </h3>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="color: #666; margin-bottom: 15px;">Set hourly rates for each position. These rates will be pre-filled when creating quotes.</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                        ${settings.positions.filter(pos => pos.value !== 'other').map(position => {
                            const rate = settings.quoteSettings.positionRates[position.value] || 35;
                            return `
                            <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e0e0e0;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">${position.label}</label>
                                <div style="position: relative;">
                                    <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                                    <input type="number" value="${rate}" 
                                           onchange="updatePositionRate('${position.value}', parseFloat(this.value))"
                                           min="0" step="0.01"
                                           style="width: 100%; padding: 8px 8px 8px 25px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                                    <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; font-size: 0.85rem;">/hr</span>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- Service Default Durations -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-clock" style="color: #e43b04;"></i> Service Default Duration
                </h3>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="color: #666; margin-bottom: 15px;">Default hours pre-filled when creating quotes for each service type.</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e0e0e0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;"><i class="fas fa-user-shield"></i> Event Security</label>
                            <div style="position: relative;">
                                <input type="number" value="${settings.quoteSettings.serviceDurations['event-security']}" 
                                       onchange="updateServiceDuration('event-security', parseInt(this.value))"
                                       min="1"
                                       style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                                <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; font-size: 0.85rem;">hours</span>
                            </div>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e0e0e0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;"><i class="fas fa-user-secret"></i> Executive Protection</label>
                            <div style="position: relative;">
                                <input type="number" value="${settings.quoteSettings.serviceDurations['executive-protection']}" 
                                       onchange="updateServiceDuration('executive-protection', parseInt(this.value))"
                                       min="1"
                                       style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                                <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; font-size: 0.85rem;">hours</span>
                            </div>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e0e0e0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;"><i class="fas fa-users"></i> Crowd Management</label>
                            <div style="position: relative;">
                                <input type="number" value="${settings.quoteSettings.serviceDurations['crowd-management']}" 
                                       onchange="updateServiceDuration('crowd-management', parseInt(this.value))"
                                       min="1"
                                       style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                                <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; font-size: 0.85rem;">hours</span>
                            </div>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #e0e0e0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;"><i class="fas fa-clipboard-check"></i> Risk Assessment</label>
                            <div style="position: relative;">
                                <input type="number" value="${settings.quoteSettings.serviceDurations['risk-assessment']}" 
                                       onchange="updateServiceDuration('risk-assessment', parseInt(this.value))"
                                       min="1"
                                       style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                                <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; font-size: 0.85rem;">hours</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Service Add-ons -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-plus-circle" style="color: #e43b04;"></i> Service Add-ons
                </h3>
                
                <p style="color: #666; margin-bottom: 15px;">Manage add-on services for each service type. These will appear as checkboxes in the quote builder.</p>
                
                ${['event-security', 'executive-protection', 'crowd-management', 'risk-assessment'].map(serviceKey => {
                    const template = servicePricingTemplates[serviceKey];
                    return `
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="margin-bottom: 15px; color: #333;"><i class="fas ${getServiceIcon(serviceKey)}" style="color: #e43b04;"></i> ${template.name}</h4>
                        
                        ${template.addons.map((addon, index) => `
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: center;">
                                <input type="text" value="${addon.name}" 
                                       onchange="updateAddonName('${serviceKey}', ${index}, this.value)"
                                       placeholder="Add-on name"
                                       style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                                <input type="number" value="${addon.price}" 
                                       onchange="updateAddonPrice('${serviceKey}', ${index}, parseFloat(this.value))"
                                       min="0" step="0.01" placeholder="Price"
                                       style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                                <input type="text" value="${addon.unit}" 
                                       onchange="updateAddonUnit('${serviceKey}', ${index}, this.value)"
                                       placeholder="per unit"
                                       style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                                <button onclick="removeAddon('${serviceKey}', ${index})" class="btn btn-icon" style="background: #dc3545; color: white; opacity: 0.7; transition: all 0.2s;" 
                                        onmouseover="this.style.opacity='1'; this.style.transform='scale(1.1)'; this.style.background='#c82333';" 
                                        onmouseout="this.style.opacity='0.7'; this.style.transform='scale(1)'; this.style.background='#dc3545';" 
                                        title="Remove">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; margin-top: 15px; align-items: center;">
                            <input type="text" id="newAddonName_${serviceKey}" placeholder="Add-on name..." 
                                   style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                            <input type="number" id="newAddonPrice_${serviceKey}" placeholder="Price" min="0" step="0.01" 
                                   style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                            <input type="text" id="newAddonUnit_${serviceKey}" placeholder="per unit" 
                                   style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                            <button onclick="addAddon('${serviceKey}')" class="add-position-btn" title="Add add-on">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('')}
                
                <!-- Payment Terms -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-credit-card" style="color: #e43b04;"></i> Payment Terms Options
                </h3>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                    ${settings.quoteSettings.paymentTerms.map((term, index) => `
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="flex: 1; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">${term}</span>
                            <button onclick="removePaymentTerm(${index})" class="btn btn-icon" style="background: #dc3545; color: white; opacity: 0.7; transition: all 0.2s;" 
                                    onmouseover="this.style.opacity='1'; this.style.transform='scale(1.1)'; this.style.background='#c82333';" 
                                    onmouseout="this.style.opacity='0.7'; this.style.transform='scale(1)'; this.style.background='#dc3545';" 
                                    title="Remove">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <input type="text" id="newPaymentTerm" placeholder="Add new payment term..."
                               style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        <button onclick="addPaymentTerm()" class="add-position-btn" title="Add payment term">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                </div>
            </div>
            
            <!-- Integration Settings Section -->
            <div class="settings-section">
                <h2><i class="fas fa-plug"></i> Integration Settings</h2>
                <div class="section-content">
                    <p style="color: #6c757d; margin-bottom: 25px;">Connect third-party services and configure integrations.</p>
                
                <!-- Supabase -->
                <h3 style="margin-top: 20px; margin-bottom: 15px; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
                    <span>
                        <i class="fas fa-database" style="color: #e43b04;"></i> Supabase Database
                    </span>
                    <span class="status-badge ${settings.integrations.supabase.connected ? 'status-connected' : 'status-disconnected'}">
                        ${settings.integrations.supabase.connected ? 'Connected' : 'Not Connected'}
                    </span>
                </h3>
                
                <div class="setting-row">
                    <label class="setting-label-full">Supabase URL</label>
                    <input type="text" id="supabaseUrl" value="${settings.integrations.supabase.url}" 
                           onchange="updateIntegrationSetting('supabase', 'url', this.value)"
                           placeholder="https://your-project.supabase.co"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: monospace;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Supabase Anon Key</label>
                    <input type="password" id="supabaseKey" value="${settings.integrations.supabase.anonKey}" 
                           onchange="updateIntegrationSetting('supabase', 'anonKey', this.value)"
                           placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: monospace;">
                </div>
                
                <div class="setting-row" style="text-align: center;">
                    <button class="btn btn-primary" onclick="testSupabaseConnection()">
                        <i class="fas fa-plug"></i> Test Connection
                    </button>
                </div>
                
                <!-- Email Service -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-paper-plane" style="color: #e43b04;"></i> Email Service
                </h3>
                
                <div class="setting-row">
                    <label class="setting-label-full">Email Provider</label>
                    <select id="emailProvider" onchange="updateIntegrationSetting('emailService', 'provider', this.value)"
                            style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        <option value="none" ${settings.integrations.emailService.provider === 'none' ? 'selected' : ''}>None (Manual Only)</option>
                        <option value="sendgrid" ${settings.integrations.emailService.provider === 'sendgrid' ? 'selected' : ''}>SendGrid</option>
                        <option value="mailgun" ${settings.integrations.emailService.provider === 'mailgun' ? 'selected' : ''}>Mailgun</option>
                        <option value="resend" ${settings.integrations.emailService.provider === 'resend' ? 'selected' : ''}>Resend</option>
                    </select>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">API Key</label>
                    <input type="password" id="emailApiKey" value="${settings.integrations.emailService.apiKey}" 
                           onchange="updateIntegrationSetting('emailService', 'apiKey', this.value)"
                           placeholder="Enter your API key"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: monospace;">
                </div>
                
                <!-- Google Analytics -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-chart-line" style="color: #e43b04;"></i> Google Analytics
                </h3>
                
                <div class="setting-row">
                    <label class="setting-toggle">
                        <span class="setting-label">Enable Google Analytics</span>
                        <input type="checkbox" id="gaEnabled" ${settings.integrations.analytics.enabled ? 'checked' : ''} 
                               onchange="updateIntegrationSetting('analytics', 'enabled', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Google Analytics Measurement ID</label>
                    <input type="text" id="gaId" value="${settings.integrations.analytics.googleAnalyticsId}" 
                           onchange="updateIntegrationSetting('analytics', 'googleAnalyticsId', this.value)"
                           placeholder="G-XXXXXXXXXX"
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: monospace;">
                </div>
                
                <!-- reCAPTCHA -->
                <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="fas fa-robot" style="color: #e43b04;"></i> Google reCAPTCHA
                </h3>
                
                <div class="setting-row">
                    <label class="setting-toggle">
                        <span class="setting-label">Enable reCAPTCHA on Forms</span>
                        <input type="checkbox" id="recaptchaEnabled" ${settings.integrations.recaptcha.enabled ? 'checked' : ''} 
                               onchange="updateIntegrationSetting('recaptcha', 'enabled', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Site Key</label>
                    <input type="text" id="recaptchaSite" value="${settings.integrations.recaptcha.siteKey}" 
                           onchange="updateIntegrationSetting('recaptcha', 'siteKey', this.value)"
                           placeholder="6Lc..."
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: monospace;">
                </div>
                
                <div class="setting-row">
                    <label class="setting-label-full">Secret Key</label>
                    <input type="password" id="recaptchaSecret" value="${settings.integrations.recaptcha.secretKey}" 
                           onchange="updateIntegrationSetting('recaptcha', 'secretKey', this.value)"
                           placeholder="6Lc..."
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: monospace;">
                </div>
                </div>
            </div>
        </div>
    `;
    
    // Set admin email
    const auth = JSON.parse(sessionStorage.getItem('adminAuth'));
    document.getElementById('adminEmail').textContent = auth.email;
    
    // Initialize drag and drop
    initializeDragAndDrop();
    
    // Initialize collapsible sections
    initializeCollapsibleSections();
}

// Initialize collapsible settings sections (accordion style - only one open at a time)
function initializeCollapsibleSections() {
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => {
        const header = section.querySelector('h2');
        const content = section.querySelector('.section-content');
        
        if (header && content) {
            // Add collapse icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-chevron-down section-toggle-icon';
            icon.style.cssText = 'float: right; transition: transform 0.3s ease; color: #e43b04; cursor: pointer;';
            header.appendChild(icon);
            
            // Make header clickable
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            
            // Collapse by default
            content.style.display = 'none';
            
            // Toggle on click (accordion behavior)
            header.addEventListener('click', function() {
                const isCurrentlyCollapsed = content.style.display === 'none';
                
                // Close all sections first
                sections.forEach(otherSection => {
                    const otherContent = otherSection.querySelector('.section-content');
                    const otherIcon = otherSection.querySelector('.section-toggle-icon');
                    if (otherContent) {
                        otherContent.style.display = 'none';
                    }
                    if (otherIcon) {
                        otherIcon.style.transform = 'rotate(0deg)';
                    }
                });
                
                // Open the clicked section if it was closed
                if (isCurrentlyCollapsed) {
                    content.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                }
            });
        }
    });
}

// Render contacts view
async function renderContactsView() {
    const mainContent = document.querySelector('.dashboard-main');
    
    // Load contacts from Supabase
    try {
        const { data, error } = await window.supabaseClient
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allContacts = data || [];
        filteredContacts = allContacts;
    } catch (error) {
        console.error('Error loading contacts:', error);
        allContacts = [];
        filteredContacts = [];
    }
    
    // Calculate stats
    const stats = {
        total: allContacts.length,
        new: allContacts.filter(c => c.status === 'new').length,
        contacted: allContacts.filter(c => c.status === 'contacted').length,
        converted: allContacts.filter(c => c.status === 'converted').length
    };
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h1>Messages</h1>
            <div class="dashboard-user">
                <i class="fas fa-user-shield"></i>
                <span id="adminEmail">admin@opservesafetygroup.com</span>
            </div>
        </div>
        
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Inquiries</h3>
                <div class="stat-number" id="statTotalContacts">${stats.total}</div>
                <div class="stat-label">All time</div>
            </div>
            <div class="stat-card">
                <h3>New</h3>
                <div class="stat-number" id="statNewContacts">${stats.new}</div>
                <div class="stat-label">Need response</div>
            </div>
            <div class="stat-card">
                <h3>In Progress</h3>
                <div class="stat-number" id="statContactedContacts">${stats.contacted}</div>
                <div class="stat-label">Being handled</div>
            </div>
            <div class="stat-card">
                <h3>Converted</h3>
                <div class="stat-number" id="statConvertedContacts">${stats.converted}</div>
                <div class="stat-label">Became clients</div>
            </div>
        </div>
        
        <!-- Filters -->
        <div class="filters-bar">
            <div class="filter-group">
                <button class="filter-btn active" data-status="all">All</button>
                <button class="filter-btn" data-status="new">New</button>
                <button class="filter-btn" data-status="contacted">Contacted</button>
                <button class="filter-btn" data-status="quote-sent">Quote Sent</button>
                <button class="filter-btn" data-status="converted">Converted</button>
                <button class="filter-btn" data-status="not-interested">Not Interested</button>
            </div>
            <div class="search-box">
                <input 
                    type="text" 
                    id="searchContactsInput" 
                    placeholder="Search by name, email, company, or service..."
                >
            </div>
        </div>
        
        <!-- Contacts Table -->
        <div class="applications-container">
            <div class="table-responsive">
                <table class="applications-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Service</th>
                            <th>Contact Info</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="contactsTableBody">
                        <!-- Will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>
            
            <!-- Empty State -->
            <div class="empty-state" id="emptyContactsState" style="display: none;">
                <i class="fas fa-inbox"></i>
                <h3>No contact submissions found</h3>
                <p>Contact form submissions will appear here.</p>
            </div>
        </div>
        
        <!-- Contact Detail Modal -->
        <div id="contactModal" class="modal">
            <div class="modal-content" style="max-width: 700px;">
                <span class="close-modal" id="closeContactModal">&times;</span>
                <div id="contactModalContent">
                    <!-- Will be populated when viewing a contact -->
                </div>
            </div>
        </div>
        
        <!-- Quote Builder Modal -->
        <div id="quoteBuilderModal" class="modal">
            <div class="modal-content" style="max-width: 900px;">
                <span class="close-modal" id="closeQuoteBuilderModal">&times;</span>
                <div id="quoteBuilderContent">
                    <!-- Will be populated when creating a quote -->
                </div>
            </div>
        </div>
    `;
    
    // Set admin email
    const auth = JSON.parse(sessionStorage.getItem('adminAuth'));
    document.getElementById('adminEmail').textContent = auth.email;
    
    // Render contacts table
    renderContactsTable(filteredContacts);
    
    // Attach event listeners
    setupContactsEventListeners();
}

// Render quotes view
async function renderQuotesView() {
    const mainContent = document.querySelector('.dashboard-main');
    
    // Load quotes from Supabase
    try {
        const { data, error } = await window.supabaseClient
            .from('quotes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transform database format to UI format
        allQuotes = (data || []).map(quote => ({
            id: quote.id,
            quoteNumber: quote.quote_number,
            contactId: quote.contact_id,
            clientName: quote.client_name,
            clientEmail: quote.client_email,
            clientPhone: quote.client_phone,
            service: quote.service,
            serviceName: {
                'event-security': 'Event Security',
                'crowd-management': 'Crowd Management',
                'executive-protection': 'Executive Protection',
                'risk-assessment': 'Risk Assessment',
                'other': 'Other'
            }[quote.service] || quote.service,
            details: {
                eventDate: quote.event_date,
                duration: quote.event_duration,
                venueSize: quote.expected_attendance || 0,
                personnel: quote.line_items ? 
                    quote.line_items
                        .filter(item => item.type === 'personnel')
                        .reduce((acc, item) => {
                            acc[item.description.split(' ')[0].toLowerCase()] = {
                                label: item.description.split(' ')[0],
                                count: item.quantity,
                                rate: item.rate
                            };
                            return acc;
                        }, {}) : {},
                addons: quote.line_items ?
                    quote.line_items
                        .filter(item => item.type === 'addon')
                        .map(item => item.description) : []
            },
            pricing: {
                personnelCost: quote.line_items ?
                    quote.line_items.filter(item => item.type === 'personnel')
                        .reduce((sum, item) => sum + item.amount, 0) : 0,
                addonsCost: quote.line_items ?
                    quote.line_items.filter(item => item.type === 'addon')
                        .reduce((sum, item) => sum + item.amount, 0) : 0,
                subtotal: quote.subtotal,
                tax: quote.tax,
                taxRate: quote.tax / quote.subtotal,
                taxState: quote.client_state,
                total: quote.total
            },
            terms: {
                paymentTerms: quote.notes || '',
                validUntil: quote.valid_until
            },
            status: quote.status,
            createdAt: quote.created_at,
            sentAt: null,
            viewedAt: null,
            notes: []
        }));
        
        filteredQuotes = allQuotes;
    } catch (error) {
        console.error('Error loading quotes:', error);
        allQuotes = [];
        filteredQuotes = [];
    }
    
    // Calculate stats
    const stats = {
        total: allQuotes.length,
        pending: allQuotes.filter(q => q.status === 'draft').length,
        sent: allQuotes.filter(q => q.status === 'sent').length,
        accepted: allQuotes.filter(q => q.status === 'accepted').length,
        revenue: allQuotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + parseFloat(q.pricing?.total || 0), 0)
    };
    
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h1>Quotes</h1>
            <div class="dashboard-user">
                <i class="fas fa-user-shield"></i>
                <span id="adminEmail">admin@opservesafetygroup.com</span>
            </div>
        </div>
        
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Quotes</h3>
                <div class="stat-number" id="statTotalQuotes">${stats.total}</div>
                <div class="stat-label">All time</div>
            </div>
            <div class="stat-card">
                <h3>Pending</h3>
                <div class="stat-number" id="statPendingQuotes">${stats.pending}</div>
                <div class="stat-label">Drafts unsent</div>
            </div>
            <div class="stat-card">
                <h3>Sent</h3>
                <div class="stat-number" id="statSentQuotes">${stats.sent}</div>
                <div class="stat-label">Awaiting response</div>
            </div>
            <div class="stat-card">
                <h3>Accepted</h3>
                <div class="stat-number" id="statAcceptedQuotes">${stats.accepted}</div>
                <div class="stat-label">$${stats.revenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            </div>
        </div>
        
        <!-- Filters -->
        <div class="filters-bar">
            <div class="filter-group">
                <button class="filter-btn active" data-status="all">All</button>
                <button class="filter-btn" data-status="pending">Pending</button>
                <button class="filter-btn" data-status="sent">Sent</button>
                <button class="filter-btn" data-status="accepted">Accepted</button>
                <button class="filter-btn" data-status="declined">Declined</button>
            </div>
            <div class="search-box">
                <input 
                    type="text" 
                    id="searchQuotesInput" 
                    placeholder="Search by client, quote number, or service..."
                >
            </div>
        </div>
        
        <!-- Quotes Table -->
        <div class="applications-container">
            <div class="table-responsive">
                <table class="applications-table">
                    <thead>
                        <tr>
                            <th>Quote #</th>
                            <th>Client</th>
                            <th>Service</th>
                            <th>Amount</th>
                            <th>Event Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="quotesTableBody">
                        <!-- Will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>
            
            <!-- Empty State -->
            <div class="empty-state" id="emptyQuotesState" style="display: none;">
                <i class="fas fa-file-invoice"></i>
                <h3>No quotes found</h3>
                <p>Quotes will appear here when created.</p>
            </div>
        </div>
        
        <!-- Quote Detail Modal -->
        <div id="quoteModal" class="modal">
            <div class="modal-content" style="max-width: 800px;">
                <span class="close-modal" id="closeQuoteModal">&times;</span>
                <div id="quoteModalContent">
                    <!-- Will be populated when viewing a quote -->
                </div>
            </div>
        </div>
        
        <!-- Quote Builder Modal -->
        <div id="quoteBuilderModal" class="modal">
            <div class="modal-content" style="max-width: 900px;">
                <span class="close-modal" id="closeQuoteBuilderModal">&times;</span>
                <div id="quoteBuilderContent">
                    <!-- Will be populated when creating a quote -->
                </div>
            </div>
        </div>
    `;
    
    // Set admin email
    const auth = JSON.parse(sessionStorage.getItem('adminAuth'));
    document.getElementById('adminEmail').textContent = auth.email;
    
    // Render quotes table
    renderQuotesTable(filteredQuotes);
    
    // Attach event listeners
    setupQuotesEventListeners();
}

function renderAnalyticsView() {
    const mainContent = document.querySelector('.dashboard-main');
    mainContent.innerHTML = `
        <div class="dashboard-header">
            <h1>Analytics</h1>
        </div>
        <div class="empty-state" style="padding: 100px 20px;">
            <i class="fas fa-chart-bar" style="font-size: 5rem; color: #e0e0e0; margin-bottom: 20px;"></i>
            <h3>Coming Soon</h3>
            <p>Application analytics and insights will be available here.</p>
        </div>
    `;
}

// Toggle position active state
async function togglePosition(positionValue) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    const position = settings.positions.find(p => p.value === positionValue);
    if (position) {
        position.active = !position.active;
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        
        // Save to Supabase
        try {
            const { error } = await window.supabaseClient
                .from('settings')
                .upsert({
                    key: 'positions',
                    value: settings.positions
                }, {
                    onConflict: 'key'
                });
            
            if (error) throw error;
            
            showSaveNotification('Position updated and synced!');
        } catch (error) {
            console.error('Error saving position:', error);
            showError('Failed to save position settings');
        }
    }
}

// Add new position
function addNewPosition() {
    const input = document.getElementById('newPositionLabel');
    const label = input.value.trim();
    
    if (!label) {
        alert('Please enter a position name');
        return;
    }
    
    // Create value from label (lowercase, replace spaces with hyphens)
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    
    // Check if position already exists
    const exists = settings.positions.some(p => 
        p.value === value || p.label.toLowerCase() === label.toLowerCase()
    );
    
    if (exists) {
        alert('A position with this name already exists');
        return;
    }
    
    // Find the index of "Other" position
    const otherIndex = settings.positions.findIndex(p => p.value === 'other');
    
    // Create new position object
    const newPosition = {
        value: value,
        label: label,
        active: true,
        custom: true
    };
    
    // Insert before "Other" if it exists, otherwise add at end
    if (otherIndex !== -1) {
        settings.positions.splice(otherIndex, 0, newPosition);
    } else {
        settings.positions.push(newPosition);
    }
    
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    // Save to Supabase
    window.supabaseClient
        .from('settings')
        .upsert({
            key: 'positions',
            value: settings.positions
        }, {
            onConflict: 'key'
        })
        .then(({ error }) => {
            if (error) {
                console.error('Error saving position:', error);
                showError('Failed to save position');
            } else {
                // Clear input
                input.value = '';
                
                // Show success and re-render
                showSaveNotification(`Position "${label}" added and synced!`);
                renderSettingsView();
            }
        });
}

// Delete custom position
function deletePosition(positionValue) {
    // Prevent deletion of "Other" position
    if (positionValue === 'other') {
        alert('The "Other" position cannot be deleted.');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this position?')) {
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.positions = settings.positions.filter(p => p.value !== positionValue);
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    // Save to Supabase
    window.supabaseClient
        .from('settings')
        .upsert({
            key: 'positions',
            value: settings.positions
        }, {
            onConflict: 'key'
        })
        .then(({ error }) => {
            if (error) {
                console.error('Error deleting position:', error);
                showError('Failed to delete position');
            } else {
                showSaveNotification('Position deleted and synced!');
                renderSettingsView();
            }
        });
}

// Save position settings and sync to website
function savePositionSettings() {
    // Auto-sync to website when saving
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    const activePositions = settings.positions.filter(p => p.active);
    localStorage.setItem('activePositions', JSON.stringify(activePositions));
    
    const message = document.getElementById('settingsSaveMessage');
    const messageText = document.getElementById('saveMessageText');
    if (messageText) {
        messageText.textContent = 'Settings saved and synced to website!';
    }
    message.style.display = 'block';
    setTimeout(() => {
        message.style.display = 'none';
    }, 3000);
}

// Initialize drag and drop for positions
function initializeDragAndDrop() {
    const positionsList = document.getElementById('positionsList');
    if (!positionsList) return;
    
    let draggedElement = null;
    let draggedIndex = null;
    
    const positionItems = positionsList.querySelectorAll('.position-item');
    
    positionItems.forEach((item) => {
        // Prevent drag when clicking on checkbox or delete button
        const checkbox = item.querySelector('input[type="checkbox"]');
        const deleteBtn = item.querySelector('.position-delete-btn');
        
        if (checkbox) {
            checkbox.addEventListener('mousedown', function(e) {
                e.stopPropagation();
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('mousedown', function(e) {
                e.stopPropagation();
                item.setAttribute('draggable', 'false');
            });
            deleteBtn.addEventListener('mouseup', function(e) {
                item.setAttribute('draggable', 'true');
            });
        }
        
        // Drag start
        item.addEventListener('dragstart', function(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.positionIndex);
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
        });
        
        // Drag over
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this !== draggedElement) {
                this.style.borderTop = '3px solid #e43b04';
            }
            return false;
        });
        
        // Drag enter
        item.addEventListener('dragenter', function(e) {
            if (this !== draggedElement) {
                this.classList.add('drag-over');
            }
        });
        
        // Drag leave
        item.addEventListener('dragleave', function(e) {
            this.style.borderTop = '';
            this.classList.remove('drag-over');
        });
        
        // Drop
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            this.style.borderTop = '';
            this.classList.remove('drag-over');
            
            if (draggedElement !== this) {
                const targetIndex = parseInt(this.dataset.positionIndex);
                reorderPositions(draggedIndex, targetIndex);
            }
            
            return false;
        });
        
        // Drag end
        item.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            
            // Remove all drag over styles
            positionItems.forEach(item => {
                item.style.borderTop = '';
                item.classList.remove('drag-over');
            });
        });
    });
}

// Reorder positions after drag and drop
function reorderPositions(fromIndex, toIndex) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    
    // Don't allow reordering if trying to move "Other" or move something to "Other" position
    const movedPosition = settings.positions[fromIndex];
    const targetPosition = settings.positions[toIndex];
    
    if (movedPosition.value === 'other' || targetPosition.value === 'other') {
        renderSettingsView(); // Just re-render without changes
        return;
    }
    
    // Move the position
    settings.positions.splice(fromIndex, 1);
    settings.positions.splice(toIndex, 0, movedPosition);
    
    // Save
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    // Auto-sync to website
    const activePositions = settings.positions.filter(p => p.active);
    localStorage.setItem('activePositions', JSON.stringify(activePositions));
    
    // Re-render to show new order
    renderSettingsView();
}

// ===== CONTACT SUBMISSIONS MANAGEMENT =====

let allContacts = [];
let filteredContacts = [];
let currentFilter = 'all';

// Get sample contacts (will be replaced with Supabase data)
function getSampleContacts() {
    return [
        {
            id: 'c1',
            name: 'John Smith',
            email: 'john.smith@abcevents.com',
            phone: '(555) 123-4567',
            company: 'ABC Events Inc.',
            state: 'CA',
            service: 'event-security',
            serviceName: 'Event Security',
            message: 'We are hosting a 5,000 person music festival next month and need comprehensive security services. Can you provide a quote for event security personnel?',
            status: 'new',
            createdAt: '2025-01-20T14:30:00',
            updatedAt: '2025-01-20T14:30:00',
            notes: []
        },
        {
            id: 'c2',
            name: 'Sarah Johnson',
            email: 'sarah@techcorp.com',
            phone: '(555) 987-6543',
            company: 'TechCorp LLC',
            state: 'NY',
            service: 'executive-protection',
            serviceName: 'Executive Protection',
            message: 'Our CEO will be visiting for a conference. We need executive protection services for 3 days.',
            status: 'contacted',
            createdAt: '2025-01-19T10:15:00',
            updatedAt: '2025-01-19T16:45:00',
            notes: [
                { text: 'Called and discussed requirements. Sending quote today.', timestamp: '2025-01-19T16:45:00' }
            ]
        },
        {
            id: 'c3',
            name: 'Mike Williams',
            email: 'mike.w@sportsarena.com',
            phone: '(555) 456-7890',
            company: 'Sports Arena',
            state: 'TX',
            service: 'crowd-management',
            serviceName: 'Crowd Management',
            message: 'Looking for crowd management for basketball games. Season starts in 2 weeks.',
            status: 'quote-sent',
            createdAt: '2025-01-18T09:00:00',
            updatedAt: '2025-01-18T15:30:00',
            notes: [
                { text: 'Quote sent for season package.', timestamp: '2025-01-18T15:30:00' }
            ]
        },
        {
            id: 'c4',
            name: 'Emily Davis',
            email: 'emily@corporatesummit.com',
            phone: '(555) 321-0987',
            company: 'Corporate Summit 2025',
            state: 'FL',
            service: 'event-security',
            serviceName: 'Event Security',
            message: 'Annual corporate summit with 500 attendees. Need security for venue.',
            status: 'converted',
            createdAt: '2025-01-15T11:20:00',
            updatedAt: '2025-01-17T14:00:00',
            notes: [
                { text: 'Converted to client. Contract signed.', timestamp: '2025-01-17T14:00:00' }
            ]
        },
        {
            id: 'c5',
            name: 'Robert Brown',
            email: 'rbrown@email.com',
            phone: '(555) 654-3210',
            company: '',
            state: 'IL',
            service: 'risk-assessment',
            serviceName: 'Risk Assessment',
            message: 'Need risk assessment for upcoming charity event.',
            status: 'not-interested',
            createdAt: '2025-01-14T13:45:00',
            updatedAt: '2025-01-15T09:00:00',
            notes: [
                { text: 'Budget too low for our services.', timestamp: '2025-01-15T09:00:00' }
            ]
        }
    ];
}

// Render contacts table
function renderContactsTable(contacts) {
    const tbody = document.getElementById('contactsTableBody');
    const emptyState = document.getElementById('emptyContactsState');
    
    if (contacts.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = contacts.map(contact => {
        const date = new Date(contact.created_at);
        const serviceNames = {
            'event-security': 'Event Security',
            'crowd-management': 'Crowd Management',
            'executive-protection': 'Executive Protection',
            'risk-assessment': 'Risk Assessment',
            'other': 'Other'
        };
        const serviceName = serviceNames[contact.service] || contact.service;
        
        return `
            <tr>
                <td>
                    <strong>${contact.name}</strong>
                    <br><small style="color: #666;">${contact.state}</small>
                </td>
                <td>
                    <span class="badge badge-info">
                        <i class="fas ${getServiceIcon(contact.service)}" style="color: #e43b04;"></i> ${serviceName}
                    </span>
                </td>
                <td>
                    <div style="font-size: 0.9rem;">
                        <i class="fas fa-envelope" style="color: #666;"></i> ${contact.email}<br>
                        <i class="fas fa-phone" style="color: #666;"></i> ${contact.phone}
                    </div>
                </td>
                <td>${date.toLocaleDateString()}</td>
                <td>${getContactStatusBadge(contact.status)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" onclick="viewContactDetail('${contact.id}')" title="View details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteContact('${contact.id}')" title="Delete Contact" style="color: #dc3545;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get service-specific icon
function getServiceIcon(service) {
    const icons = {
        'event-security': 'fa-user-shield',
        'executive-protection': 'fa-user-secret',
        'crowd-management': 'fa-users',
        'risk-assessment': 'fa-clipboard-check'
    };
    return icons[service] || 'fa-shield-alt';
}

// Get status badge HTML
function getContactStatusBadge(status) {
    const badges = {
        'new': '<span class="badge badge-new">New</span>',
        'contacted': '<span class="badge badge-review">Contacted</span>',
        'quote-sent': '<span class="badge badge-info">Quote Sent</span>',
        'converted': '<span class="badge badge-approved">Converted</span>',
        'not-interested': '<span class="badge badge-denied">Not Interested</span>'
    };
    return badges[status] || status;
}

// Setup event listeners for contacts
function setupContactsEventListeners() {
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterContacts(this.dataset.status);
        });
    });
    
    // Search
    document.getElementById('searchContactsInput').addEventListener('input', function(e) {
        searchContacts(e.target.value);
    });
    
    // Modal close
    const closeModal = document.getElementById('closeContactModal');
    const modal = document.getElementById('contactModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
            modal.classList.remove('active');
        });
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }
    
    // Quote builder modal close
    const closeBuilderModal = document.getElementById('closeQuoteBuilderModal');
    const builderModal = document.getElementById('quoteBuilderModal');
    
    if (closeBuilderModal) {
        closeBuilderModal.addEventListener('click', function() {
            builderModal.style.display = 'none';
            builderModal.classList.remove('active');
        });
    }
    
    if (builderModal) {
        builderModal.addEventListener('click', function(e) {
            if (e.target === builderModal) {
                builderModal.style.display = 'none';
                builderModal.classList.remove('active');
            }
        });
    }
}

// Filter contacts by status
function filterContacts(status) {
    currentFilter = status;
    if (status === 'all') {
        filteredContacts = allContacts;
    } else {
        filteredContacts = allContacts.filter(c => c.status === status);
    }
    renderContactsTable(filteredContacts);
}

// Search contacts
function searchContacts(query) {
    if (!query.trim()) {
        renderContactsTable(filteredContacts);
        return;
    }
    
    const searchLower = query.toLowerCase();
    const results = filteredContacts.filter(contact => {
        return contact.name.toLowerCase().includes(searchLower) ||
               contact.email.toLowerCase().includes(searchLower) ||
               (contact.company && contact.company.toLowerCase().includes(searchLower)) ||
               contact.serviceName.toLowerCase().includes(searchLower) ||
               contact.message.toLowerCase().includes(searchLower);
    });
    
    renderContactsTable(results);
}

// View contact detail
function viewContactDetail(id) {
    const contact = allContacts.find(c => c.id === id);
    if (!contact) return;
    
    const modal = document.getElementById('contactModal');
    const modalContent = document.getElementById('contactModalContent');
    
    const date = new Date(contact.created_at);
    const serviceNames = {
        'event-security': 'Event Security',
        'crowd-management': 'Crowd Management',
        'executive-protection': 'Executive Protection',
        'risk-assessment': 'Risk Assessment',
        'other': 'Other'
    };
    const serviceName = serviceNames[contact.service] || contact.service;
    
    modalContent.innerHTML = `
        <h2 style="margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;">Message Details</h2>
        
        <div class="detail-section">
            <h3><i class="fas fa-user" style="color: #e43b04;"></i> Contact Information</h3>
            <div style="margin-top: 10px;">
                <p style="margin: 8px 0;"><strong>Name:</strong> ${contact.name}</p>
                <p style="margin: 8px 0;"><strong>State:</strong> ${contact.state}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${contact.email}" style="color: #e43b04;">${contact.email}</a></p>
                <p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${contact.phone}" style="color: #e43b04;">${contact.phone}</a></p>
            </div>
        </div>
        
        <div class="detail-section" style="margin-top: 25px;">
            <h3><i class="fas fa-briefcase" style="color: #e43b04;"></i> Service Requested</h3>
            <p style="margin-top: 10px;"><i class="fas ${getServiceIcon(contact.service)}" style="color: #e43b04; margin-right: 8px;"></i>${serviceName}</p>
        </div>
        
        <div class="detail-section" style="margin-top: 25px;">
            <h3><i class="fas fa-comment" style="color: #e43b04;"></i> Message</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px; white-space: pre-wrap; line-height: 1.6;">${contact.message}</div>
        </div>
        
        <div class="detail-section" style="margin-top: 25px;">
            <h3><i class="fas fa-calendar" style="color: #e43b04;"></i> Submitted</h3>
            <p style="margin-top: 10px;">${date.toLocaleString()}</p>
        </div>
        
        <div class="detail-section" style="margin-top: 25px;">
            <h3><i class="fas fa-flag" style="color: #e43b04;"></i> Status</h3>
            <select id="contactStatus" onchange="updateContactStatus('${id}', this.value)" 
                    style="margin-top: 10px; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; width: 100%; max-width: 300px;">
                <option value="new" ${contact.status === 'new' ? 'selected' : ''}>New</option>
                <option value="contacted" ${contact.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                <option value="quote-sent" ${contact.status === 'quote-sent' ? 'selected' : ''}>Quote Sent</option>
                <option value="converted" ${contact.status === 'converted' ? 'selected' : ''}>Converted</option>
                <option value="not-interested" ${contact.status === 'not-interested' ? 'selected' : ''}>Not Interested</option>
            </select>
        </div>
        
        <div class="detail-section" style="margin-top: 25px;">
            <h3><i class="fas fa-sticky-note" style="color: #e43b04;"></i> Admin Notes</h3>
            ${contact.notes ? `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px; margin-bottom: 15px; white-space: pre-wrap;">
                    ${contact.notes}
                </div>
            ` : '<p style="color: #999; margin-top: 10px;">No notes yet</p>'}
            <textarea id="newContactNote" rows="3" placeholder="Add a note..."
                      style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-family: inherit; margin-top: 10px; font-size: 1rem;"></textarea>
            <button class="btn btn-secondary" onclick="addContactNote('${id}')" style="margin: 8px; padding: 12px 24px; background: #e43b04; border-color: #e43b04; color: white;">
                <i class="fas fa-plus"></i> Add Note
            </button>
        </div>
        
        <div class="detail-section" style="text-align: center; padding-top: 25px; margin-top: 25px; border-top: 2px solid #e0e0e0;">
            <h3 style="margin-bottom: 20px;">Quick Actions</h3>
            <button class="btn btn-primary" onclick="openQuoteBuilder('${id}')" style="margin: 8px; padding: 12px 24px; background: #28a745; border-color: #28a745;">
                <i class="fas fa-file-invoice-dollar"></i> Generate Quote
            </button>
            <a href="mailto:${contact.email}?subject=Re: Your inquiry about ${serviceName}" 
               class="btn btn-primary" style="margin: 8px; padding: 12px 24px;">
                <i class="fas fa-envelope"></i> Email Reply
            </a>
            <a href="tel:${contact.phone}" class="btn btn-secondary" style="margin: 8px; padding: 12px 24px; border: 2px solid #e43b04; color: #e43b04; background: white; text-decoration: none;">
                <i class="fas fa-phone"></i> Call
            </a>
        </div>
    `;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Update contact status
function updateContactStatus(id, newStatus) {
    const contact = allContacts.find(c => c.id === id);
    if (!contact) return;
    
    contact.status = newStatus;
    contact.updatedAt = new Date().toISOString();
    
    // TODO: Update in Supabase
    
    // Re-apply current filter to update the table
    filterContacts(currentFilter);
    viewContactDetail(id);
    
    showSaveNotification('Contact status updated!');
}

// Delete contact
async function deleteContact(id) {
    const contact = allContacts.find(c => c.id === id);
    if (!contact) return;
    
    const confirmMsg = `Are you sure you want to delete this contact from ${contact.name}?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        // Delete from Supabase
        const { error } = await window.supabaseClient
            .from('contacts')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Remove from local array
        allContacts = allContacts.filter(c => c.id !== id);
        filteredContacts = filteredContacts.filter(c => c.id !== id);
        
        // Re-render
        renderContactsTable(filteredContacts);
        
        showSuccess('Contact deleted successfully');
    } catch (error) {
        console.error('Error deleting contact:', error);
        showError('Failed to delete contact: ' + error.message);
    }
}

// Add note to contact
function addContactNote(id) {
    const contact = allContacts.find(c => c.id === id);
    if (!contact) return;
    
    const noteText = document.getElementById('newContactNote').value.trim();
    if (!noteText) {
        alert('Please enter a note');
        return;
    }
    
    const timestamp = new Date().toLocaleString();
    const newNote = `[${timestamp}]\n${noteText}\n\n`;
    
    // Append to existing notes or create new
    const updatedNotes = contact.notes ? contact.notes + newNote : newNote;
    
    // Update in Supabase
    window.supabaseClient
        .from('contacts')
        .update({ notes: updatedNotes })
        .eq('id', id)
        .then(({ error }) => {
            if (error) {
                console.error('Error saving note:', error);
                showError('Failed to save note');
            } else {
                // Update local data
                contact.notes = updatedNotes;
                
                // Refresh modal
                viewContactDetail(id);
                
                showSaveNotification('Note added successfully!');
            }
        });
}

// ===== QUOTE MANAGEMENT =====

let allQuotes = [];
let filteredQuotes = [];
let currentQuoteFilter = 'all';

// Service pricing templates
const servicePricingTemplates = {
    'event-security': {
        name: 'Event Security',
        baseRate: 35,
        supervisorRate: 50,
        defaultDuration: 8,
        addons: [
            { id: 'radio', name: 'Radio Equipment', price: 5, unit: 'per unit' },
            { id: 'vehicle', name: 'Vehicle Patrol', price: 150, unit: 'per shift' },
            { id: 'k9', name: 'K9 Unit', price: 200, unit: 'per shift' }
        ]
    },
    'executive-protection': {
        name: 'Executive Protection',
        baseRate: 75,
        supervisorRate: 100,
        defaultDuration: 24,
        addons: [
            { id: 'armored-vehicle', name: 'Armored Vehicle', price: 500, unit: 'per day' },
            { id: 'advance-team', name: 'Advance Security Team', price: 1000, unit: 'per event' },
            { id: 'background-check', name: 'Enhanced Background Check', price: 200, unit: 'per person' }
        ]
    },
    'crowd-management': {
        name: 'Crowd Management',
        baseRate: 30,
        supervisorRate: 45,
        defaultDuration: 6,
        addons: [
            { id: 'barriers', name: 'Crowd Control Barriers', price: 10, unit: 'per barrier' },
            { id: 'signage', name: 'Directional Signage', price: 50, unit: 'per set' },
            { id: 'communication', name: 'Communication System', price: 100, unit: 'per event' }
        ]
    },
    'risk-assessment': {
        name: 'Risk Assessment',
        baseRate: 150,
        supervisorRate: 200,
        defaultDuration: 1,
        addons: [
            { id: 'detailed-report', name: 'Detailed Written Report', price: 300, unit: 'per report' },
            { id: 'site-visit', name: 'On-Site Visit', price: 500, unit: 'per visit' },
            { id: 'training', name: 'Staff Training Session', price: 750, unit: 'per session' }
        ]
    }
};

// Get sample quotes
function getSampleQuotes() {
    return [
        {
            id: 'q1',
            quoteNumber: 'OSG-2025-001',
            contactId: 'c1',
            clientName: 'ABC Events Inc.',
            clientEmail: 'john.smith@abcevents.com',
            service: 'event-security',
            serviceName: 'Event Security',
            details: {
                eventDate: '2025-02-15',
                duration: 8,
                venueSize: 5000,
                personnel: {
                    officers: { count: 10, rate: 35 },
                    supervisors: { count: 2, rate: 50 }
                },
                addons: ['radio']
            },
            pricing: {
                personnelCost: 3200,
                addonsCost: 60,
                subtotal: 3260,
                tax: 236.35,
                taxRate: 0.0725,
                taxState: 'CA',
                total: 3496.35
            },
            terms: {
                paymentTerms: '50% deposit, balance due day of event',
                validUntil: '2025-02-08'
            },
            status: 'sent',
            createdAt: '2025-01-20T15:30:00',
            sentAt: '2025-01-20T16:00:00',
            viewedAt: '2025-01-21T09:15:00',
            notes: []
        },
        {
            id: 'q2',
            quoteNumber: 'OSG-2025-002',
            contactId: 'c2',
            clientName: 'TechCorp LLC',
            clientEmail: 'sarah@techcorp.com',
            service: 'executive-protection',
            serviceName: 'Executive Protection',
            details: {
                eventDate: '2025-01-28',
                duration: 72,
                venueSize: 0,
                personnel: {
                    officers: { count: 3, rate: 75 },
                    supervisors: { count: 1, rate: 100 }
                },
                addons: ['armored-vehicle']
            },
            pricing: {
                personnelCost: 23400,
                addonsCost: 1500,
                subtotal: 24900,
                tax: 996,
                taxRate: 0.04,
                taxState: 'NY',
                total: 25896
            },
            terms: {
                paymentTerms: '50% deposit, balance due 24 hours before service',
                validUntil: '2025-01-26'
            },
            status: 'accepted',
            createdAt: '2025-01-19T11:00:00',
            sentAt: '2025-01-19T14:30:00',
            viewedAt: '2025-01-19T16:20:00',
            acceptedAt: '2025-01-20T10:00:00',
            notes: [
                { text: 'Client requested premium package with armored vehicle.', timestamp: '2025-01-19T11:00:00' }
            ]
        },
        {
            id: 'q3',
            quoteNumber: 'OSG-2025-003',
            contactId: 'c3',
            clientName: 'Sports Arena',
            clientEmail: 'mike.w@sportsarena.com',
            service: 'crowd-management',
            serviceName: 'Crowd Management',
            details: {
                eventDate: '2025-02-01',
                duration: 6,
                venueSize: 15000,
                personnel: {
                    officers: { count: 20, rate: 30 },
                    supervisors: { count: 3, rate: 45 }
                },
                addons: ['barriers', 'communication']
            },
            pricing: {
                personnelCost: 4410,
                addonsCost: 150,
                subtotal: 4560,
                tax: 285,
                taxRate: 0.0625,
                taxState: 'TX',
                total: 4845
            },
            terms: {
                paymentTerms: 'Net 30',
                validUntil: '2025-01-28'
            },
            status: 'pending',
            createdAt: '2025-01-18T13:45:00',
            sentAt: null,
            viewedAt: null,
            notes: []
        },
        {
            id: 'q4',
            quoteNumber: 'OSG-2025-004',
            contactId: 'c4',
            clientName: 'Corporate Summit 2025',
            clientEmail: 'emily@corporatesummit.com',
            service: 'event-security',
            serviceName: 'Event Security',
            details: {
                eventDate: '2025-03-10',
                duration: 10,
                venueSize: 500,
                personnel: {
                    officers: { count: 5, rate: 35 },
                    supervisors: { count: 1, rate: 50 }
                },
                addons: []
            },
            pricing: {
                personnelCost: 2250,
                addonsCost: 0,
                subtotal: 2250,
                tax: 135,
                taxRate: 0.06,
                taxState: 'FL',
                total: 2385
            },
            terms: {
                paymentTerms: '50% deposit, balance due day of event',
                validUntil: '2025-03-03'
            },
            status: 'declined',
            createdAt: '2025-01-17T10:00:00',
            sentAt: '2025-01-17T11:00:00',
            viewedAt: '2025-01-17T15:00:00',
            declinedAt: '2025-01-18T09:00:00',
            notes: [
                { text: 'Client went with another provider due to budget constraints.', timestamp: '2025-01-18T09:30:00' }
            ]
        }
    ];
}

// Render quotes table
function renderQuotesTable(quotes) {
    const tbody = document.getElementById('quotesTableBody');
    const emptyState = document.getElementById('emptyQuotesState');
    
    if (quotes.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = quotes.map(quote => {
        const eventDate = quote.details?.eventDate ? new Date(quote.details.eventDate) : null;
        
        return `
            <tr>
                <td><strong>${quote.quoteNumber}</strong></td>
                <td>
                    <strong>${quote.clientName}</strong><br>
                    <small style="color: #666;">${quote.clientEmail}</small>
                </td>
                <td>
                    <span class="badge badge-info">
                        <i class="fas ${getServiceIcon(quote.service)}" style="color: #e43b04;"></i> ${quote.serviceName}
                    </span>
                </td>
                <td><strong>$${parseFloat(quote.pricing?.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></td>
                <td>${eventDate ? eventDate.toLocaleDateString() : 'N/A'}</td>
                <td>${getQuoteStatusBadge(quote.status)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" onclick="viewQuoteDetail('${quote.id}')" title="View quote">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteQuote('${quote.id}')" title="Delete Quote" style="color: #dc3545;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get quote status badge
function getQuoteStatusBadge(status) {
    const badges = {
        'draft': '<span class="badge badge-info">Draft</span>',
        'sent': '<span class="badge badge-review">Sent</span>',
        'accepted': '<span class="badge badge-approved">Accepted</span>',
        'rejected': '<span class="badge badge-denied">Rejected</span>',
        'expired': '<span class="badge" style="background: #999;">Expired</span>'
    };
    return badges[status] || status;
}

// Delete quote
async function deleteQuote(id) {
    const quote = allQuotes.find(q => q.id === id);
    if (!quote) return;
    
    const confirmMsg = `Are you sure you want to delete quote ${quote.quote_number}?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        // Delete from Supabase
        const { error } = await window.supabaseClient
            .from('quotes')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Remove from local arrays
        allQuotes = allQuotes.filter(q => q.id !== id);
        filteredQuotes = filteredQuotes.filter(q => q.id !== id);
        
        // Re-render
        renderQuotesTable(filteredQuotes);
        
        showSuccess('Quote deleted successfully');
    } catch (error) {
        console.error('Error deleting quote:', error);
        showError('Failed to delete quote: ' + error.message);
    }
}

// Setup event listeners for quotes
function setupQuotesEventListeners() {
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterQuotes(this.dataset.status);
        });
    });
    
    // Search
    document.getElementById('searchQuotesInput').addEventListener('input', function(e) {
        searchQuotes(e.target.value);
    });
    
    // Quote detail modal close
    const closeQuoteModal = document.getElementById('closeQuoteModal');
    const quoteModal = document.getElementById('quoteModal');
    
    if (closeQuoteModal) {
        closeQuoteModal.addEventListener('click', function() {
            quoteModal.style.display = 'none';
            quoteModal.classList.remove('active');
        });
    }
    
    if (quoteModal) {
        quoteModal.addEventListener('click', function(e) {
            if (e.target === quoteModal) {
                quoteModal.style.display = 'none';
                quoteModal.classList.remove('active');
            }
        });
    }
    
    // Quote builder modal close
    const closeBuilderModal = document.getElementById('closeQuoteBuilderModal');
    const builderModal = document.getElementById('quoteBuilderModal');
    
    if (closeBuilderModal) {
        closeBuilderModal.addEventListener('click', function() {
            builderModal.style.display = 'none';
            builderModal.classList.remove('active');
        });
    }
    
    if (builderModal) {
        builderModal.addEventListener('click', function(e) {
            if (e.target === builderModal) {
                builderModal.style.display = 'none';
                builderModal.classList.remove('active');
            }
        });
    }
}

// Filter quotes by status
function filterQuotes(status) {
    currentQuoteFilter = status;
    if (status === 'all') {
        filteredQuotes = allQuotes;
    } else {
        filteredQuotes = allQuotes.filter(q => q.status === status);
    }
    renderQuotesTable(filteredQuotes);
}

// Search quotes
function searchQuotes(query) {
    if (!query.trim()) {
        renderQuotesTable(filteredQuotes);
        return;
    }
    
    const searchLower = query.toLowerCase();
    const results = filteredQuotes.filter(quote => {
        return quote.quoteNumber.toLowerCase().includes(searchLower) ||
               quote.clientName.toLowerCase().includes(searchLower) ||
               quote.clientEmail.toLowerCase().includes(searchLower) ||
               quote.serviceName.toLowerCase().includes(searchLower);
    });
    
    renderQuotesTable(results);
}

// View quote detail
function viewQuoteDetail(id) {
    const quote = allQuotes.find(q => q.id === id);
    if (!quote) return;
    
    const modal = document.getElementById('quoteModal');
    const modalContent = document.getElementById('quoteModalContent');
    
    const eventDate = new Date(quote.details.eventDate);
    const createdDate = new Date(quote.createdAt);
    const validUntil = new Date(quote.terms.validUntil);
    
    modalContent.innerHTML = `
        <h2 style="margin-bottom: 30px; padding-bottom: 15px; border-top: 2px solid #e0e0e0;">Quote ${quote.quoteNumber}</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div>
                <h4 style="color: #666; margin-bottom: 10px;">CLIENT INFORMATION</h4>
                <p style="margin: 5px 0;"><strong>${quote.clientName}</strong></p>
                <p style="margin: 5px 0; color: #666;">${quote.clientEmail}</p>
            </div>
            <div style="text-align: right;">
                <h4 style="color: #666; margin-bottom: 10px;">QUOTE DETAILS</h4>
                <p style="margin: 5px 0;">Created: ${createdDate.toLocaleDateString()}</p>
                <p style="margin: 5px 0;">Valid Until: ${validUntil.toLocaleDateString()}</p>
                <p style="margin: 5px 0;">${getQuoteStatusBadge(quote.status)}</p>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin-bottom: 15px;"><i class="fas ${getServiceIcon(quote.service)}" style="color: #e43b04;"></i> ${quote.serviceName}</h3>
            <p style="margin: 5px 0;"><strong>Event Date:</strong> ${eventDate.toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${quote.details.duration} hours</p>
            ${quote.details.venueSize > 0 ? `<p style="margin: 5px 0;"><strong>Venue Size:</strong> ${quote.details.venueSize.toLocaleString()} people</p>` : ''}
        </div>
        
        <div style="margin-bottom: 25px;">
            <h3 style="margin-bottom: 15px;">Personnel</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${Object.entries(quote.details.personnel).map(([key, pos]) => `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 10px 0;">${pos.label} (${pos.count} × $${pos.rate}/hr × ${quote.details.duration}hrs)</td>
                        <td style="text-align: right; padding: 10px 0;">$${(pos.count * pos.rate * quote.details.duration).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
        
        ${quote.pricing.addonsCost > 0 ? `
        <div style="margin-bottom: 25px;">
            <h3 style="margin-bottom: 15px;">Additional Services</h3>
            <table style="width: 100%; border-collapse: collapse;">
                ${quote.details.addons.map(addonId => {
                    const template = servicePricingTemplates[quote.service];
                    const addon = template.addons.find(a => a.id === addonId);
                    return addon ? `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 10px 0;">${addon.name}</td>
                        <td style="text-align: right; padding: 10px 0;">$${addon.price.toFixed(2)}</td>
                    </tr>
                    ` : '';
                }).join('')}
            </table>
        </div>
        ` : ''}
        
        <div style="border-top: 2px solid #e0e0e0; padding-top: 20px; margin-top: 20px;">
            <table style="width: 100%; font-size: 1.1rem;">
                <tr>
                    <td style="padding: 5px 0;"><strong>Subtotal:</strong></td>
                    <td style="text-align: right; padding: 5px 0;">$${quote.pricing.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;">Tax (${((quote.pricing.taxRate || 0.06) * 100).toFixed(2)}%${quote.pricing.taxState ? ' - ' + quote.pricing.taxState : ''}):</td>
                    <td style="text-align: right; padding: 5px 0;">$${quote.pricing.tax.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 2px solid #e43b04;">
                    <td style="padding: 10px 0;"><strong style="font-size: 1.2rem; color: #e43b04;">TOTAL:</strong></td>
                    <td style="text-align: right; padding: 10px 0;"><strong style="font-size: 1.2rem; color: #e43b04;">$${quote.pricing.total.toFixed(2)}</strong></td>
                </tr>
            </table>
        </div>
        
        <div style="margin-top: 25px; padding: 15px; background: #fff5f0; border-left: 4px solid #e43b04; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>Payment Terms:</strong> ${quote.terms.paymentTerms}</p>
        </div>
        
        ${quote.notes.length > 0 ? `
        <div style="margin-top: 25px;">
            <h3 style="margin-bottom: 10px;">Notes</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                ${quote.notes.map(note => `
                    <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0;">
                        <p style="margin: 0 0 5px 0;">${note.text}</p>
                        <small style="color: #999;">${new Date(note.timestamp).toLocaleString()}</small>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
            <h3 style="margin-bottom: 20px;">Actions</h3>
            ${quote.status === 'pending' ? `
                <button class="btn btn-primary" onclick="sendQuote('${quote.id}')" style="margin: 8px;">
                    <i class="fas fa-paper-plane"></i> Send Quote
                </button>
            ` : ''}
            <a href="mailto:${quote.clientEmail}?subject=Quote ${quote.quoteNumber} - ${quote.serviceName}" 
               class="btn btn-secondary" style="margin: 8px; text-decoration: none;">
                <i class="fas fa-envelope"></i> Email Client
            </a>
            <button class="btn btn-secondary" onclick="alert('PDF download feature coming soon!')" style="margin: 8px;">
                <i class="fas fa-file-pdf"></i> Download PDF
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Open quote builder from a contact/message
function openQuoteBuilder(contactId) {
    const contact = allContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const modal = document.getElementById('quoteBuilderModal');
    const modalContent = document.getElementById('quoteBuilderContent');
    
    // Get settings from localStorage
    const settings = JSON.parse(localStorage.getItem('adminSettings')) || {};
    const template = servicePricingTemplates[contact.service] || {};
    const serviceSettings = settings.quoteSettings?.services?.[contact.service] || {};
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Parse service details from message
    const serviceDetails = {};
    if (contact.message && contact.message.includes('--- Service Details ---')) {
        const detailsSection = contact.message.split('--- Service Details ---')[1];
        const lines = detailsSection.split('\n');
        lines.forEach(line => {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
                const [, key, value] = match;
                serviceDetails[key] = value.trim();
            }
        });
    }
    
    modalContent.innerHTML = `
        <h2 style="margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;">Generate Quote</h2>
        
        <form id="quoteBuilderForm" onsubmit="createQuote(event, '${contactId}')">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <div>
                    <h4 style="color: #666; margin-bottom: 15px;">CLIENT INFORMATION</h4>
                    <p style="margin: 5px 0;"><strong>${contact.name}</strong></p>
                    <p style="margin: 5px 0; color: #666;">${contact.email}</p>
                    <p style="margin: 5px 0; color: #666;"><i class="fas fa-map-marker-alt" style="color: #e43b04;"></i> ${contact.state || 'State not provided'}</p>
                </div>
                <div>
                    <h4 style="color: #666; margin-bottom: 15px;">SERVICE</h4>
                    <p style="margin: 5px 0;"><i class="fas ${getServiceIcon(contact.service)}" style="color: #e43b04;"></i> ${
                        {'event-security': 'Event Security', 'crowd-management': 'Crowd Management', 'executive-protection': 'Executive Protection', 'risk-assessment': 'Risk Assessment', 'other': 'Other'}[contact.service] || contact.service
                    }</p>
                </div>
            </div>
            
            <input type="hidden" id="clientState" value="${contact.state || ''}">
            <input type="hidden" id="contactIdForQuote" value="${contactId}">
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin-bottom: 15px;">Event Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Event Date</label>
                        <input type="date" id="eventDate" value="${serviceDetails.eventDate || ''}" required 
                               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Duration (hours)</label>
                        <input type="number" id="duration" value="${serviceDetails.eventDuration || settings.quoteSettings.serviceDurations[contact.service] || 8}" min="1" step="0.5" required 
                               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;" 
                               onchange="calculateQuoteTotal()">
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Venue Size (optional)</label>
                    <input type="number" id="venueSize" value="${serviceDetails.expectedAttendance || ''}" placeholder="Number of attendees" 
                           style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="margin-bottom: 15px;">Personnel</h3>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">Select number of personnel needed for each position</p>
                ${settings.positions.filter(pos => pos.value !== 'other').map(position => `
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 10px; padding: 10px; background: white; border-radius: 8px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">${position.label}</label>
                            <input type="number" id="qty_${position.value}" value="0" min="0" 
                                   style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;" 
                                   onchange="calculateQuoteTotal()">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Rate/hour</label>
                            <input type="number" id="rate_${position.value}" value="${settings.quoteSettings.positionRates[position.value] || 35}" min="0" step="0.01" 
                                   style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;" 
                                   onchange="calculateQuoteTotal()">
                        </div>
                        <div style="display: flex; align-items: flex-end;">
                            <span id="total_${position.value}" style="font-weight: 600; color: #666;">$0.00</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="margin-bottom: 15px;">Add-ons</h3>
                ${template.addons.map(addon => `
                    <label style="display: flex; align-items: center; padding: 10px; background: #f8f9fa; margin-bottom: 10px; border-radius: 8px; cursor: pointer;">
                        <input type="checkbox" value="${addon.id}" onchange="calculateQuoteTotal()" style="margin-right: 10px;">
                        <span style="flex: 1;">${addon.name} (${addon.unit})</span>
                        <span style="font-weight: 600; color: #e43b04;">+$${addon.price}</span>
                    </label>
                `).join('')}
            </div>
            
            <div style="border-top: 2px solid #e0e0e0; padding-top: 20px; margin-top: 20px;">
                <table style="width: 100%; font-size: 1.1rem;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Subtotal:</strong></td>
                        <td style="text-align: right; padding: 5px 0;"><span id="quoteSubtotal">$0.00</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; vertical-align: middle;">
                            Tax: 
                            <input type="number" id="taxRateOverride" min="0" max="100" step="0.01" 
                                   style="width: 70px; padding: 4px 8px; border: 2px solid #e0e0e0; border-radius: 4px; margin-left: 10px;"
                                   onchange="calculateQuoteTotal()">%
                            <small style="display: block; color: #666; margin-top: 3px; font-size: 0.85rem;" id="taxNote"></small>
                        </td>
                        <td style="text-align: right; padding: 5px 0;"><span id="quoteTax">$0.00</span></td>
                    </tr>
                    <tr style="border-top: 2px solid #e43b04;">
                        <td style="padding: 10px 0;"><strong style="font-size: 1.2rem; color: #e43b04;">TOTAL:</strong></td>
                        <td style="text-align: right; padding: 10px 0;"><strong style="font-size: 1.2rem; color: #e43b04;"><span id="quoteTotal">$0.00</span></strong></td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-top: 25px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Payment Terms</label>
                <select id="paymentTerms" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    ${settings.quoteSettings.paymentTerms.map(term => `
                        <option value="${term}">${term}</option>
                    `).join('')}
                </select>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
                <button type="submit" class="btn btn-primary" style="margin: 8px; padding: 12px 40px;">
                    <i class="fas fa-save"></i> Create Quote
                </button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('quoteBuilderModal').style.display='none';" style="margin: 8px;">
                    Cancel
                </button>
            </div>
        </form>
    `;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
        calculateQuoteTotal();
    }, 10);
}

// Calculate quote total dynamically
function calculateQuoteTotal() {
    const duration = parseFloat(document.getElementById('duration')?.value || 0);
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    
    // Calculate personnel costs for all positions
    let personnelCost = 0;
    settings.positions.filter(pos => pos.value !== 'other').forEach(position => {
        const qty = parseInt(document.getElementById(`qty_${position.value}`)?.value || 0);
        const rate = parseFloat(document.getElementById(`rate_${position.value}`)?.value || 0);
        const total = qty * rate * duration;
        
        personnelCost += total;
        
        // Update individual total display
        const totalElement = document.getElementById(`total_${position.value}`);
        if (totalElement) {
            totalElement.textContent = `$${total.toFixed(2)}`;
        }
    });
    
    // Add-ons cost
    let addonsCost = 0;
    document.querySelectorAll('#quoteBuilderForm input[type="checkbox"]:checked').forEach(checkbox => {
        const price = parseFloat(checkbox.parentElement.querySelector('span:last-child').textContent.replace(/[^0-9.]/g, ''));
        addonsCost += price;
    });
    
    // Determine tax rate based on client state
    const clientState = document.getElementById('clientState')?.value;
    const taxRateInput = document.getElementById('taxRateOverride');
    const taxNote = document.getElementById('taxNote');
    
    let taxRate;
    if (taxRateInput && taxRateInput.value) {
        // Use override if provided
        taxRate = parseFloat(taxRateInput.value) / 100;
        if (taxNote) taxNote.textContent = 'Custom rate';
    } else if (clientState && settings.quoteSettings.stateTaxRates[clientState] !== undefined) {
        // Use state-specific rate
        taxRate = settings.quoteSettings.stateTaxRates[clientState];
        if (taxRateInput) taxRateInput.value = (taxRate * 100).toFixed(2);
        if (taxNote) taxNote.textContent = `${clientState} rate (auto-applied)`;
    } else {
        // Use default rate
        taxRate = settings.quoteSettings.defaultTaxRate || 0.06;
        if (taxRateInput) taxRateInput.value = (taxRate * 100).toFixed(2);
        if (taxNote) taxNote.textContent = 'Default rate';
    }
    
    const subtotal = personnelCost + addonsCost;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    // Update display
    document.getElementById('quoteSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('quoteTax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('quoteTotal').textContent = `$${total.toFixed(2)}`;
}

// Create quote from form
async function createQuote(event, contactId) {
    event.preventDefault();
    
    const contact = allContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const template = servicePricingTemplates[contact.service];
    
    // Get settings
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    
    // Generate quote number
    const quoteNumber = `${settings.quoteSettings.quoteNumberPrefix}-2025-${String(allQuotes.length + 1).padStart(3, '0')}`;
    
    // Get form values
    const duration = parseFloat(document.getElementById('duration').value);
    const eventDate = document.getElementById('eventDate').value;
    const venueSize = parseInt(document.getElementById('venueSize')?.value || 0);
    const paymentTerms = document.getElementById('paymentTerms').value;
    
    // Collect personnel data for all positions
    const personnel = {};
    settings.positions.filter(pos => pos.value !== 'other').forEach(position => {
        const qty = parseInt(document.getElementById(`qty_${position.value}`).value);
        const rate = parseFloat(document.getElementById(`rate_${position.value}`).value);
        if (qty > 0) {
            personnel[position.value] = {
                label: position.label,
                count: qty,
                rate: rate
            };
        }
    });
    
    // Get selected add-ons
    const addons = [];
    document.querySelectorAll('#quoteBuilderForm input[type="checkbox"]:checked').forEach(checkbox => {
        addons.push(checkbox.value);
    });
    
    // Calculate pricing
    let personnelCost = 0;
    Object.values(personnel).forEach(pos => {
        personnelCost += pos.count * pos.rate * duration;
    });
    
    let addonsCost = 0;
    addons.forEach(addonId => {
        const addon = template.addons.find(a => a.id === addonId);
        if (addon) addonsCost += addon.price;
    });
    
    // Get tax rate used
    const taxRateInput = document.getElementById('taxRateOverride');
    const taxRateUsed = taxRateInput ? parseFloat(taxRateInput.value) / 100 : settings.quoteSettings.defaultTaxRate;
    const clientState = contact.state || '';
    
    const subtotal = personnelCost + addonsCost;
    const tax = subtotal * taxRateUsed;
    const total = subtotal + tax;
    
    // Calculate valid until date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + settings.quoteSettings.validityDays);
    
    // Build line items for database
    const lineItems = [];
    Object.entries(personnel).forEach(([key, pos]) => {
        lineItems.push({
            type: 'personnel',
            description: `${pos.label} (${pos.count} x ${duration} hrs)`,
            quantity: pos.count,
            rate: pos.rate,
            hours: duration,
            amount: pos.count * pos.rate * duration
        });
    });
    
    addons.forEach(addonId => {
        const addon = template.addons.find(a => a.id === addonId);
        if (addon) {
            lineItems.push({
                type: 'addon',
                description: addon.label,
                quantity: 1,
                rate: addon.price,
                hours: 1,
                amount: addon.price
            });
        }
    });
    
    // Create quote object for database
    const quoteData = {
        quote_number: quoteNumber,
        contact_id: contactId,
        client_name: contact.name,
        client_email: contact.email,
        client_phone: contact.phone || '',
        client_state: clientState,
        service: contact.service,
        event_date: eventDate || null,
        event_location: '',
        event_duration: duration,
        expected_attendance: venueSize || null,
        line_items: lineItems,
        subtotal: subtotal,
        tax: tax,
        total: total,
        status: 'draft',
        valid_until: validUntil.toISOString().split('T')[0],
        notes: paymentTerms
    };
    
    try {
        // Save to Supabase
        const { data, error } = await window.supabaseClient
            .from('quotes')
            .insert([quoteData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Transform and add to local array
        const transformedQuote = {
            id: data.id,
            quoteNumber: data.quote_number,
            contactId: data.contact_id,
            clientName: data.client_name,
            clientEmail: data.client_email,
            clientPhone: data.client_phone,
            service: data.service,
            serviceName: {
                'event-security': 'Event Security',
                'crowd-management': 'Crowd Management',
                'executive-protection': 'Executive Protection',
                'risk-assessment': 'Risk Assessment',
                'other': 'Other'
            }[data.service] || data.service,
            details: {
                eventDate: data.event_date,
                duration: data.event_duration,
                venueSize: data.expected_attendance || 0,
                personnel: personnel,
                addons: addons
            },
            pricing: {
                personnelCost: personnelCost,
                addonsCost: addonsCost,
                subtotal: data.subtotal,
                tax: data.tax,
                taxRate: data.tax / data.subtotal,
                taxState: data.client_state,
                total: data.total
            },
            terms: {
                paymentTerms: data.notes || '',
                validUntil: data.valid_until
            },
            status: data.status,
            createdAt: data.created_at,
            sentAt: null,
            viewedAt: null,
            notes: []
        };
        
        allQuotes.push(transformedQuote);
        
        // Close builder modal
        document.getElementById('quoteBuilderModal').style.display = 'none';
        document.getElementById('quoteBuilderModal').classList.remove('active');
        
        // Show success notification
        showSaveNotification(`Quote ${quoteNumber} created successfully!`);
        
        // If on quotes view, refresh it
        if (currentView === 'quotes') {
            renderQuotesView();
        } else {
            // Switch to quotes view and show the new quote
            switchView('quotes');
            setTimeout(() => {
                viewQuoteDetail(transformedQuote.id);
            }, 500);
        }
    } catch (error) {
        console.error('Error creating quote:', error);
        showError('Failed to create quote: ' + error.message);
    }
}

// Send quote
function sendQuote(id) {
    const quote = allQuotes.find(q => q.id === id);
    if (!quote) return;
    
    if (confirm(`Send quote ${quote.quoteNumber} to ${quote.clientEmail}?`)) {
        quote.status = 'sent';
        quote.sentAt = new Date().toISOString();
        
        // TODO: Actually send email via Supabase Edge Function
        
        filterQuotes(currentQuoteFilter);
        viewQuoteDetail(id);
        showSaveNotification('Quote sent successfully!');
    }
}

// ===== QUOTE SETTINGS =====

function updateQuoteSetting(field, value) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.quoteSettings[field] = value;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showSaveNotification('Quote settings updated!');
}

function updatePositionRate(positionValue, rate) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.quoteSettings.positionRates[positionValue] = rate;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showSaveNotification('Position rate updated!');
}

function updateServiceDuration(serviceKey, duration) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.quoteSettings.serviceDurations[serviceKey] = duration;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showSaveNotification('Service duration updated!');
}

function addPaymentTerm() {
    const input = document.getElementById('newPaymentTerm');
    const term = input.value.trim();
    
    if (!term) {
        alert('Please enter a payment term');
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    
    if (settings.quoteSettings.paymentTerms.includes(term)) {
        alert('This payment term already exists');
        return;
    }
    
    settings.quoteSettings.paymentTerms.push(term);
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    input.value = '';
    renderSettingsView();
    showSaveNotification('Payment term added!');
}

function removePaymentTerm(index) {
    if (!confirm('Remove this payment term?')) return;
    
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.quoteSettings.paymentTerms.splice(index, 1);
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    renderSettingsView();
    showSaveNotification('Payment term removed!');
}

function updateAddonName(serviceKey, index, name) {
    servicePricingTemplates[serviceKey].addons[index].name = name;
    showSaveNotification('Add-on updated!');
}

function updateAddonPrice(serviceKey, index, price) {
    servicePricingTemplates[serviceKey].addons[index].price = price;
    showSaveNotification('Add-on price updated!');
}

function updateAddonUnit(serviceKey, index, unit) {
    servicePricingTemplates[serviceKey].addons[index].unit = unit;
    showSaveNotification('Add-on unit updated!');
}

function removeAddon(serviceKey, index) {
    if (!confirm('Remove this add-on?')) return;
    
    servicePricingTemplates[serviceKey].addons.splice(index, 1);
    renderSettingsView();
    showSaveNotification('Add-on removed!');
}

function addAddon(serviceKey) {
    const nameInput = document.getElementById(`newAddonName_${serviceKey}`);
    const priceInput = document.getElementById(`newAddonPrice_${serviceKey}`);
    const unitInput = document.getElementById(`newAddonUnit_${serviceKey}`);
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value) || 0;
    const unit = unitInput.value.trim() || 'per unit';
    
    if (!name) {
        alert('Please enter an add-on name');
        return;
    }
    
    const newAddon = {
        id: 'addon-' + Date.now(),
        name: name,
        price: price,
        unit: unit
    };
    
    servicePricingTemplates[serviceKey].addons.push(newAddon);
    renderSettingsView();
    showSaveNotification('Add-on added!');
}

// ===== EMAIL NOTIFICATION SETTINGS =====

function updateEmailSetting(field, value) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.emailNotifications[field] = value;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showSaveNotification('Email settings updated!');
}

// ===== SECURITY SETTINGS =====

function updateSecuritySetting(field, value) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.security[field] = value;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showSaveNotification('Security settings updated!');
}

function changeAdminPassword() {
    const currentPassword = prompt('Enter current password:');
    if (!currentPassword) return;
    
    // TODO: Validate current password with Supabase
    
    const newPassword = prompt('Enter new password (min 8 characters):');
    if (!newPassword || newPassword.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }
    
    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // TODO: Update password in Supabase
    alert('Password change functionality will be enabled when Supabase is connected.');
}

// ===== INTEGRATION SETTINGS =====

function updateIntegrationSetting(service, field, value) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.integrations[service][field] = value;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showSaveNotification(`${service} settings updated!`);
}

function testSupabaseConnection() {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    const { url, anonKey } = settings.integrations.supabase;
    
    if (!url || !anonKey) {
        alert('Please enter both Supabase URL and Anon Key');
        return;
    }
    
    // TODO: Test actual connection
    alert('Testing Supabase connection...\n\nThis will be functional once the Supabase client is integrated.\n\nFor now, credentials are saved and ready to use.');
    
    // Mark as connected (for demo purposes)
    settings.integrations.supabase.connected = true;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    renderSettingsView();
}

// ===== WEBSITE CONTENT SETTINGS =====

async function updateWebsiteContent(section, field, value) {
    try {
        // Update local storage first for immediate feedback
        const settings = JSON.parse(localStorage.getItem('adminSettings'));
        settings.websiteContent[section][field] = value;
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        
        // Save to Supabase
        const { error } = await window.supabaseClient
            .from('settings')
            .upsert({
                key: 'websiteContent',
                value: settings.websiteContent
            }, {
                onConflict: 'key'
            });
        
        if (error) throw error;
        
        showSaveNotification(`${section} content updated and published!`);
    } catch (error) {
        console.error('Error saving website content:', error);
        showError('Failed to save website content: ' + error.message);
    }
}

function updateServiceCard(serviceKey, field, value) {
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    settings.websiteContent.services[serviceKey][field] = value;
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    // Sync to website
    localStorage.setItem('websiteContent', JSON.stringify(settings.websiteContent));
    
    showSaveNotification('Service card updated!');
}

// Show save notification
function showSaveNotification(message) {
    // Try to find existing message element
    let notification = document.getElementById('settingsNotification');
    
    if (!notification) {
        // Create if doesn't exist
        notification = document.createElement('div');
        notification.id = 'settingsNotification';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    notification.style.display = 'flex';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Get active positions for the application form
function getActivePositions() {
    const activePositions = localStorage.getItem('activePositions');
    if (activePositions) {
        return JSON.parse(activePositions);
    }
    
    // Default fallback
    const settings = JSON.parse(localStorage.getItem('adminSettings'));
    return settings ? settings.positions.filter(p => p.active) : [];
}

// TODO: Supabase Integration
/*
async function loadApplicationsFromSupabase() {
    const { data, error } = await supabase
        .from('applications')
        .select(`
            *,
            work_history (*),
            admin_notes (*)
        `)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

async function updateApplicationStatusInSupabase(id, status) {
    const { data, error } = await supabase
        .from('applications')
        .update({ 
            status: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);
    
    if (error) throw error;
    
    // Log activity
    await supabase.from('activity_log').insert({
        application_id: id,
        admin_email: 'admin@opservesafetygroup.com',
        action: 'status_changed',
        details: { new_status: status }
    });
    
    return data;
}
*/
