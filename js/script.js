// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Debug: Log when the script loads
    console.log('Script loaded');
    
    // Modal Elements
    const modal = document.getElementById('applyModal');
    const applyNowBtn = document.getElementById('applyNowBtn');
    const closeModal = document.querySelector('.close-modal');
    const applicationForm = document.getElementById('applicationForm');
    const fileInput = document.getElementById('resume');
    const fileNameDisplay = document.getElementById('fileName');
    
    // Debug: Log elements
    console.log('Modal:', modal);
    console.log('Apply Now Button:', applyNowBtn);
    
    // Function to load active positions from admin settings
    async function loadActivePositions() {
        const positionSelect = document.getElementById('position');
        if (!positionSelect) return;
        
        try {
            // Load positions from Supabase
            const { data, error } = await window.supabaseClient
                .from('settings')
                .select('value')
                .eq('key', 'positions')
                .single();
            
            let positions = [];
            
            if (error) {
                console.error('Error loading positions from Supabase:', error);
                console.log('Using fallback positions');
                // Fallback to default positions if database error
                positions = [
                    { value: 'admin', label: 'Admin', active: true },
                    { value: 'event-staff', label: 'Event Staff', active: true },
                    { value: 'agent', label: 'Agent', active: true },
                    { value: 'safety-agent', label: 'Safety Agent', active: true },
                    { value: 'safety-supervisor', label: 'Safety Supervisor', active: true },
                    { value: 'manager', label: 'Manager', active: true },
                    { value: 'other', label: 'Other', active: true }
                ];
            } else if (data && data.value) {
                console.log('Positions loaded from Supabase:', data.value);
                // Filter to only active positions
                positions = data.value.filter(pos => pos.active);
                console.log('Active positions:', positions);
            } else {
                console.log('No positions found in database, using defaults');
                // Fallback to default positions if nothing in database
                positions = [
                    { value: 'admin', label: 'Admin', active: true },
                    { value: 'event-staff', label: 'Event Staff', active: true },
                    { value: 'agent', label: 'Agent', active: true },
                    { value: 'safety-agent', label: 'Safety Agent', active: true },
                    { value: 'safety-supervisor', label: 'Safety Supervisor', active: true },
                    { value: 'manager', label: 'Manager', active: true },
                    { value: 'other', label: 'Other', active: true }
                ];
            }
            
            // Clear existing options except the first one (placeholder)
            const placeholder = positionSelect.options[0];
            positionSelect.innerHTML = '';
            positionSelect.appendChild(placeholder);
            
            // Add active positions
            positions.forEach(pos => {
                const option = document.createElement('option');
                option.value = pos.value;
                option.textContent = pos.label;
                positionSelect.appendChild(option);
            });
            
            console.log('Positions loaded from Supabase:', positions.length);
        } catch (error) {
            console.error('Error loading positions:', error);
        }
    }
    
    // Handle position selection - show "Other" text input if needed
    const positionSelect = document.getElementById('position');
    const otherPositionGroup = document.getElementById('otherPositionGroup');
    const otherPositionInput = document.getElementById('otherPosition');
    
    if (positionSelect && otherPositionGroup && otherPositionInput) {
        positionSelect.addEventListener('change', function() {
            if (this.value === 'other') {
                otherPositionGroup.style.display = 'block';
                otherPositionInput.required = true;
            } else {
                otherPositionGroup.style.display = 'none';
                otherPositionInput.required = false;
                otherPositionInput.value = '';
            }
        });
    }
    
    // Function to open modal
    function openModal() {
        if (modal) {
            // Load active positions before showing modal
            loadActivePositions();
            
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Modal element not found');
        }
    }
    
    // Open Modal from navigation button
    if (applyNowBtn) {
        applyNowBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Apply Now button clicked');
            openModal();
        });
    } else {
        console.error('Apply Now button not found');
    }
    
    // Open Modal from footer link
    const footerApplyLink = document.querySelector('.footer-apply-link');
    if (footerApplyLink) {
        footerApplyLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Footer Apply Now link clicked');
            openModal();
        });
    }
    
    // Function to close modal and reset form
    function closeModalAndReset() {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            // Reset Other position field
            if (otherPositionGroup) {
                otherPositionGroup.style.display = 'none';
            }
            if (otherPositionInput) {
                otherPositionInput.required = false;
                otherPositionInput.value = '';
            }
        }, 300);
        document.body.style.overflow = 'auto';
    }
    
    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', function(e) {
            e.stopPropagation();
            closeModalAndReset();
        });
    }
    
    // Close when clicking outside modal content
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModalAndReset();
            }
        });
    }
    
    // Multiple file upload handling
    const fileList = document.getElementById('fileList');
    let selectedFiles = [];
    
    if (fileInput && fileList) {
        fileInput.addEventListener('change', function(e) {
            const newFiles = Array.from(this.files);
            
            // Add new files to the selected files array
            newFiles.forEach(file => {
                // Check if file already exists
                const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
                if (!exists) {
                    selectedFiles.push(file);
                }
            });
            
            // Update the display
            updateFileList();
            
            // Reset the input so the same file can be selected again if removed
            this.value = '';
        });
    }
    
    function updateFileList() {
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '<p class="no-files">No files selected</p>';
            return;
        }
        
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileSize = formatFileSize(file.size);
            const fileIcon = getFileIcon(file.name);
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="${fileIcon}"></i>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${fileSize}</span>
                    </div>
                </div>
                <button type="button" class="remove-file" data-index="${index}" aria-label="Remove file">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileList.appendChild(fileItem);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                selectedFiles.splice(index, 1);
                updateFileList();
            });
        });
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch(ext) {
            case 'pdf':
                return 'fas fa-file-pdf';
            case 'doc':
            case 'docx':
                return 'fas fa-file-word';
            default:
                return 'fas fa-file';
        }
    }
    
    // LinkedIn Import functionality
    const linkedinImportBtn = document.getElementById('linkedinImportBtn');
    
    if (linkedinImportBtn) {
        linkedinImportBtn.addEventListener('click', function() {
            // Show alert that feature is not yet implemented
            alert('LinkedIn Import Feature Not Available\n\n' +
                  'Due to LinkedIn API limitations, we are unable to import work history at this time.\n\n' +
                  'LinkedIn\'s current API only provides basic profile information (name and email) but does not include work history data.\n\n' +
                  'Please manually enter your work history in the form below.');
        });
    }
    
    // Work History - Add/Remove functionality
    const addWorkHistoryBtn = document.getElementById('addWorkHistoryBtn');
    const workHistoryContainer = document.getElementById('workHistoryContainer');
    
    if (addWorkHistoryBtn && workHistoryContainer) {
        addWorkHistoryBtn.addEventListener('click', function() {
            const newEntry = document.createElement('div');
            newEntry.className = 'work-history-entry';
            newEntry.innerHTML = `
                <button type="button" class="remove-work-history" aria-label="Remove this job">&times;</button>
                <div class="form-group">
                    <input type="text" name="jobTitle[]" placeholder="Job Title" required>
                </div>
                <div class="form-group">
                    <input type="text" name="company[]" placeholder="Company Name" required>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label class="date-label">Start Date</label>
                        <input type="date" name="startDate[]" required>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="date-label">End Date</label>
                        <input type="date" name="endDate[]" required>
                    </div>
                </div>
                <div class="form-group">
                    <textarea name="jobDescription[]" rows="3" placeholder="Job Responsibilities" required></textarea>
                </div>
            `;
            workHistoryContainer.appendChild(newEntry);
            
            // Add event listener to the remove button
            const removeBtn = newEntry.querySelector('.remove-work-history');
            removeBtn.addEventListener('click', function() {
                newEntry.remove();
            });
        });
        
        // Add event listeners to any existing remove buttons
        workHistoryContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-work-history')) {
                const entries = workHistoryContainer.querySelectorAll('.work-history-entry');
                // Only allow removal if there's more than one entry
                if (entries.length > 1) {
                    e.target.closest('.work-history-entry').remove();
                } else {
                    alert('You must have at least one work history entry.');
                }
            }
        });
    }
    
    // Form submission
    if (applicationForm) {
        applicationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate that at least one file is selected
            if (selectedFiles.length === 0) {
                alert('Please upload at least one file (resume or certification).');
                return;
            }
            
            // Get form data
            const formData = new FormData(this);
            
            // Prepare application data
            const firstName = formData.get('firstName') || '';
            const middleInitial = formData.get('middleInitial') || '';
            const lastName = formData.get('lastName') || '';
            const fullName = `${firstName} ${middleInitial ? middleInitial + ' ' : ''}${lastName}`.trim();
            
            // Collect work history
            const jobTitles = formData.getAll('jobTitle[]');
            const companies = formData.getAll('company[]');
            const startDates = formData.getAll('startDate[]');
            const endDates = formData.getAll('endDate[]');
            const jobDescriptions = formData.getAll('jobDescription[]');
            
            const workHistory = jobTitles.map((title, index) => ({
                jobTitle: title,
                company: companies[index],
                startDate: startDates[index],
                endDate: endDates[index],
                description: jobDescriptions[index]
            }));
            
            try {
                // Step 1: Upload files to Supabase Storage
                const uploadedFileUrls = [];
                const timestamp = Date.now();
                
                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${timestamp}_${i}_${file.name}`;
                    const filePath = `${fileName}`;
                    
                    const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                        .from('applications')
                        .upload(filePath, file);
                    
                    if (uploadError) {
                        console.error('File upload error:', uploadError);
                        throw new Error('Failed to upload file: ' + file.name);
                    }
                    
                    // Get public URL
                    const { data: { publicUrl } } = window.supabaseClient.storage
                        .from('applications')
                        .getPublicUrl(filePath);
                    
                    uploadedFileUrls.push({
                        name: file.name,
                        url: publicUrl,
                        path: filePath
                    });
                }
                
                // Step 2: Save application to database with file URLs
                const applicationData = {
                    name: fullName,
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    position: formData.get('position'),
                    other_position: formData.get('otherPosition') || null,
                    experience: formData.get('experience'),
                    work_history: workHistory,
                    file_urls: uploadedFileUrls,
                    status: 'new'
                };
                
                const { data, error } = await window.supabaseClient
                    .from('applications')
                    .insert([applicationData]);
                
                if (error) throw error;
                
                // Send confirmation email
                try {
                    const emailHTML = generateApplicationEmailHTML(firstName, formData.get('position'));
                    await sendEmailViaResend(
                        formData.get('email'),
                        'Application Received - OpServe Safety Group',
                        emailHTML
                    );
                } catch (emailError) {
                    console.error('Failed to send confirmation email:', emailError);
                    // Continue anyway - application was saved
                }
                
                // Show success message
                alert('Thank you for your application! We will review your information and get back to you soon. Check your email for confirmation.');
                
                // Reset form and close modal
                this.reset();
                selectedFiles = [];
                updateFileList();
                
                // Reset work history to show only one entry
                const entries = workHistoryContainer.querySelectorAll('.work-history-entry');
                entries.forEach((entry, index) => {
                    if (index > 0) entry.remove();
                });
                
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
                document.body.style.overflow = 'auto';
            } catch (error) {
                console.error('Error submitting application:', error);
                alert('Sorry, there was an error submitting your application. Please try again or email us directly.');
            }
        });
    }

    // ===== EMAIL FUNCTIONS =====
    
    // Send email via Resend API
    async function sendEmailViaResend(to, subject, htmlContent) {
        try {
            // Get settings from admin dashboard
            const { data: settingsData, error: settingsError } = await window.supabaseClient
                .from('settings')
                .select('value')
                .eq('key', 'adminSettings')
                .single();
            
            if (settingsError) throw settingsError;
            
            const settings = settingsData?.value || {};
            const emailConfig = settings.integrations?.emailService || {};
            
            if (emailConfig.provider !== 'resend' || !emailConfig.apiKey) {
                console.log('Email not configured, skipping automated email');
                return;
            }
            
            const fromEmail = emailConfig.fromEmail || 'noreply@opservesafetygroup.com';
            
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${emailConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: `OpServe Safety Group <${fromEmail}>`,
                    to: [to],
                    subject: subject,
                    html: htmlContent
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send email');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Email send error:', error);
            // Don't throw - we don't want to fail the submission if email fails
        }
    }
    
    // Generate application confirmation email
    function generateApplicationEmailHTML(firstName, position) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #e43b04; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #e43b04; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
                    .highlight-box { background: #fff5f0; padding: 20px; border-left: 4px solid #e43b04; border-radius: 4px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>OpServe Safety Group</h1>
                    <p>Professional Security Services</p>
                </div>
                <div class="content">
                    <h2>Thank You for Your Application!</h2>
                    <p>Dear ${firstName},</p>
                    <p>We have successfully received your application for the <strong>${position}</strong> position at OpServe Safety Group.</p>
                    
                    <div class="highlight-box">
                        <h3 style="margin-top: 0;">What Happens Next?</h3>
                        <ol style="margin: 10px 0;">
                            <li>Our recruitment team will review your application and qualifications</li>
                            <li>If your skills match our requirements, we'll contact you for an interview</li>
                            <li>We typically respond within 5-7 business days</li>
                        </ol>
                    </div>
                    
                    <p>We appreciate your interest in joining our team. OpServe Safety Group is committed to providing professional security services, and we're always looking for dedicated individuals to grow with us.</p>
                    
                    <p>If you have any questions in the meantime, please don't hesitate to reach out to us.</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br><strong>OpServe Safety Group Recruitment Team</strong></p>
                </div>
                
                <div class="footer">
                    <p>OpServe Safety Group | Professional Security Services</p>
                    <p><a href="https://opservesafetygroup.com">opservesafetygroup.com</a></p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
        `;
    }
    
    // Generate contact confirmation email
    function generateContactEmailHTML(name, service) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #e43b04; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #e43b04; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
                    .highlight-box { background: #fff5f0; padding: 20px; border-left: 4px solid #e43b04; border-radius: 4px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>OpServe Safety Group</h1>
                    <p>Professional Security Services</p>
                </div>
                <div class="content">
                    <h2>We Received Your Message!</h2>
                    <p>Dear ${name},</p>
                    <p>Thank you for contacting OpServe Safety Group. We have received your inquiry regarding <strong>${service}</strong>.</p>
                    
                    <div class="highlight-box">
                        <h3 style="margin-top: 0;">What's Next?</h3>
                        <p style="margin: 10px 0;">Our team will review your message and get back to you within 24-48 hours. We're committed to providing you with the professional security solutions you need.</p>
                    </div>
                    
                    <p>In the meantime, feel free to explore our services and learn more about what makes OpServe Safety Group the trusted choice for security services:</p>
                    
                    <center>
                        <a href="https://opservesafetygroup.com#services" class="button">View Our Services</a>
                    </center>
                    
                    <p>For urgent matters, please call us directly.</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br><strong>OpServe Safety Group Team</strong></p>
                </div>
                
                <div class="footer">
                    <p>OpServe Safety Group | Professional Security Services</p>
                    <p><a href="https://opservesafetygroup.com">opservesafetygroup.com</a></p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
        `;
    }

    // ===== LOAD WEBSITE CONTENT FROM SETTINGS =====
    async function loadWebsiteContent() {
        try {
            // Load from Supabase
            const { data, error } = await window.supabaseClient
                .from('settings')
                .select('value')
                .eq('key', 'websiteContent')
                .single();
            
            if (error) {
                console.log('No custom content found, using defaults');
                return;
            }
            
            const content = data.value;
            
            // Update Hero Section
            const heroHeadline = document.querySelector('.hero-content h1');
            const heroSubtitle = document.querySelector('.hero-content p');
            const heroCta1 = document.querySelector('.hero-buttons .btn-primary');
            const heroCta2 = document.querySelector('.hero-buttons .btn-secondary');
            const heroSection = document.querySelector('.hero');
            
            if (heroHeadline) heroHeadline.textContent = content.hero.headline;
            if (heroSubtitle) heroSubtitle.textContent = content.hero.subtitle;
            if (heroCta1) heroCta1.textContent = content.hero.ctaPrimaryText;
            if (heroCta2) heroCta2.textContent = content.hero.ctaSecondaryText;
            if (heroSection && content.hero.backgroundImage) {
                heroSection.style.background = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('${content.hero.backgroundImage}') no-repeat center center/cover`;
            }
            
            // Update About Section
            const aboutTitle = document.querySelector('.about .section-header h2');
            const aboutSubtitle = document.querySelector('.about .section-header p');
            const aboutPara1 = document.querySelector('.about-text p:first-child');
            const aboutPara2 = document.querySelector('.about-text p:last-child');
            const aboutImage = document.querySelector('.about-image img');
            
            if (aboutTitle) aboutTitle.textContent = content.about.title;
            if (aboutSubtitle) aboutSubtitle.textContent = content.about.subtitle;
            if (aboutPara1) aboutPara1.textContent = content.about.paragraph1;
            if (aboutPara2) aboutPara2.textContent = content.about.paragraph2;
            if (aboutImage) aboutImage.src = content.about.teamImage;
            
            // Update Services Section
            const servicesTitle = document.querySelector('.services .section-header h2');
            const servicesSubtitle = document.querySelector('.services .section-header p');
            
            if (servicesTitle) servicesTitle.textContent = content.services.title;
            if (servicesSubtitle) servicesSubtitle.textContent = content.services.subtitle;
            
            // Update Service Cards
            const crowdCard = document.querySelector('.service-card[data-service="crowd-management"]');
            if (crowdCard) {
                const title = crowdCard.querySelector('h3');
                const desc = crowdCard.querySelector('p');
                if (title) title.textContent = content.services.crowdManagement.title;
                if (desc) desc.textContent = content.services.crowdManagement.description;
            }
            
            const eventCard = document.querySelector('.service-card[data-service="event-security"]');
            if (eventCard) {
                const title = eventCard.querySelector('h3');
                const desc = eventCard.querySelector('p');
                if (title) title.textContent = content.services.eventSecurity.title;
                if (desc) desc.textContent = content.services.eventSecurity.description;
            }
            
            const execCard = document.querySelector('.service-card[data-service="executive-protection"]');
            if (execCard) {
                const title = execCard.querySelector('h3');
                const desc = execCard.querySelector('p');
                if (title) title.textContent = content.services.executiveProtection.title;
                if (desc) desc.textContent = content.services.executiveProtection.description;
            }
            
            const riskCard = document.querySelector('.service-card[data-service="risk-assessment"]');
            if (riskCard) {
                const title = riskCard.querySelector('h3');
                const desc = riskCard.querySelector('p');
                if (title) title.textContent = content.services.riskAssessment.title;
                if (desc) desc.textContent = content.services.riskAssessment.description;
            }
        } catch (error) {
            console.log('Error loading website content:', error);
        }
    }
    
    // Load content when page loads
    loadWebsiteContent();
    
    // ===== CONTACT US MODAL =====
    const contactModal = document.getElementById('contactModal');
    const closeContactModal = document.getElementById('closeContactModal');
    const contactForm = document.getElementById('contactForm');
    const contactUsLinks = document.querySelectorAll('a[href="#contact"], .btn-primary[href="#contact"]');
    
    // Function to open contact modal
    function openContactModal(selectedService) {
        if (contactModal) {
            contactModal.style.display = 'flex';
            setTimeout(() => {
                contactModal.classList.add('active');
            }, 10);
            document.body.style.overflow = 'hidden';
            
            // Pre-select service if provided
            if (selectedService) {
                const serviceDropdown = document.getElementById('service');
                if (serviceDropdown) {
                    serviceDropdown.value = selectedService;
                    // Trigger the service-specific fields to show
                    showServiceSpecificFields(selectedService);
                }
            }
        }
    }
    
    // Function to show service-specific fields
    function showServiceSpecificFields(service) {
        const container = document.getElementById('serviceSpecificFields');
        if (!container) return;
        
        // Clear existing fields
        container.innerHTML = '';
        container.style.display = 'none';
        
        if (!service || service === 'other') {
            return;
        }
        
        let fieldsHTML = '';
        
        switch(service) {
            case 'event-security':
                fieldsHTML = `
                    <div class="service-fields-header">
                        <h4 style="margin: 0 0 15px 0; color: #e43b04; font-size: 1rem;">
                            <i class="fas fa-shield-alt"></i> Event Security Details
                        </h4>
                    </div>
                    <div class="form-group">
                        <input type="date" id="eventDate" name="eventDate" placeholder="Event Date" required>
                        <label for="eventDate" style="font-size: 0.85rem; color: #666; margin-top: 5px;">Event Date</label>
                    </div>
                    <div class="form-group">
                        <input type="number" id="expectedAttendance" name="expectedAttendance" placeholder="Expected Attendance" min="1" required>
                    </div>
                    <div class="form-group">
                        <input type="number" id="eventDuration" name="eventDuration" placeholder="Event Duration (hours)" min="1" step="0.5" required>
                    </div>
                    <div class="form-group">
                        <input type="text" id="venueLocation" name="venueLocation" placeholder="Venue/Location">
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px; color: #333;">
                            <i class="fas fa-plus-circle" style="color: #e43b04;"></i> Additional Services (Optional)
                        </label>
                        <div style="display: flex; flex-direction: column; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="radio" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Radio Equipment</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="vehicle" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Vehicle Patrol</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="k9" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>K9 Unit</span>
                            </label>
                        </div>
                    </div>
                `;
                break;
                
            case 'crowd-management':
                fieldsHTML = `
                    <div class="service-fields-header">
                        <h4 style="margin: 0 0 15px 0; color: #e43b04; font-size: 1rem;">
                            <i class="fas fa-users"></i> Crowd Management Details
                        </h4>
                    </div>
                    <div class="form-group">
                        <input type="date" id="eventDate" name="eventDate" placeholder="Event Date" required>
                        <label for="eventDate" style="font-size: 0.85rem; color: #666; margin-top: 5px;">Event Date</label>
                    </div>
                    <div class="form-group">
                        <input type="number" id="expectedAttendance" name="expectedAttendance" placeholder="Expected Crowd Size" min="1" required>
                    </div>
                    <div class="form-group">
                        <select id="venueSize" name="venueSize" required>
                            <option value="" disabled selected>Venue Size</option>
                            <option value="small">Small (< 500 capacity)</option>
                            <option value="medium">Medium (500-2000 capacity)</option>
                            <option value="large">Large (2000-10000 capacity)</option>
                            <option value="xlarge">Extra Large (10000+ capacity)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="text" id="venueLocation" name="venueLocation" placeholder="Venue/Location">
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px; color: #333;">
                            <i class="fas fa-plus-circle" style="color: #e43b04;"></i> Additional Services (Optional)
                        </label>
                        <div style="display: flex; flex-direction: column; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="barriers" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Crowd Control Barriers</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="signage" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Directional Signage</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="communication" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Communication System</span>
                            </label>
                        </div>
                    </div>
                `;
                break;
                
            case 'executive-protection':
                fieldsHTML = `
                    <div class="service-fields-header">
                        <h4 style="margin: 0 0 15px 0; color: #e43b04; font-size: 1rem;">
                            <i class="fas fa-user-shield"></i> Executive Protection Details
                        </h4>
                    </div>
                    <div class="form-group">
                        <input type="date" id="startDate" name="startDate" placeholder="Start Date" required>
                        <label for="startDate" style="font-size: 0.85rem; color: #666; margin-top: 5px;">Start Date</label>
                    </div>
                    <div class="form-group">
                        <input type="date" id="endDate" name="endDate" placeholder="End Date" required>
                        <label for="endDate" style="font-size: 0.85rem; color: #666; margin-top: 5px;">End Date</label>
                    </div>
                    <div class="form-group">
                        <input type="number" id="numProtectees" name="numProtectees" placeholder="Number of Protectees" min="1" required>
                    </div>
                    <div class="form-group">
                        <select id="protectionLevel" name="protectionLevel" required>
                            <option value="" disabled selected>Protection Level</option>
                            <option value="basic">Basic Security</option>
                            <option value="standard">Standard Protection</option>
                            <option value="enhanced">Enhanced Security</option>
                            <option value="comprehensive">Comprehensive Protection</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px; color: #333;">
                            <i class="fas fa-plus-circle" style="color: #e43b04;"></i> Additional Services (Optional)
                        </label>
                        <div style="display: flex; flex-direction: column; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="armored-vehicle" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Armored Vehicle</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="advance-team" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Advance Security Team</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="background-check" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Enhanced Background Check</span>
                            </label>
                        </div>
                    </div>
                `;
                break;
                
            case 'risk-assessment':
                fieldsHTML = `
                    <div class="service-fields-header">
                        <h4 style="margin: 0 0 15px 0; color: #e43b04; font-size: 1rem;">
                            <i class="fas fa-clipboard-check"></i> Risk Assessment Details
                        </h4>
                    </div>
                    <div class="form-group">
                        <input type="text" id="propertyAddress" name="propertyAddress" placeholder="Property/Venue Address" required>
                    </div>
                    <div class="form-group">
                        <select id="assessmentType" name="assessmentType" required>
                            <option value="" disabled selected>Assessment Type</option>
                            <option value="preliminary">Preliminary Assessment</option>
                            <option value="detailed">Detailed Security Audit</option>
                            <option value="ongoing">Ongoing Risk Monitoring</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="date" id="preferredDate" name="preferredDate" placeholder="Preferred Assessment Date">
                        <label for="preferredDate" style="font-size: 0.85rem; color: #666; margin-top: 5px;">Preferred Assessment Date</label>
                    </div>
                    <div class="form-group">
                        <select id="propertyType" name="propertyType">
                            <option value="" disabled selected>Property Type</option>
                            <option value="event-venue">Event Venue</option>
                            <option value="corporate">Corporate Facility</option>
                            <option value="residential">Residential Property</option>
                            <option value="outdoor">Outdoor Space</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px; color: #333;">
                            <i class="fas fa-plus-circle" style="color: #e43b04;"></i> Additional Services (Optional)
                        </label>
                        <div style="display: flex; flex-direction: column; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="detailed-report" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Detailed Written Report</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="site-visit" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>On-Site Visit</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                                <input type="checkbox" name="addons[]" value="training" style="width: 18px; height: 18px; cursor: pointer;">
                                <span>Staff Training Session</span>
                            </label>
                        </div>
                    </div>
                `;
                break;
        }
        
        if (fieldsHTML) {
            container.innerHTML = fieldsHTML;
            container.style.display = 'block';
        }
    }
    
    // Service dropdown change event
    const serviceDropdown = document.getElementById('service');
    if (serviceDropdown) {
        serviceDropdown.addEventListener('change', function() {
            showServiceSpecificFields(this.value);
        });
    }
    
    // Function to close contact modal
    function closeContactModalFn() {
        if (contactModal) {
            contactModal.classList.remove('active');
            setTimeout(() => {
                contactModal.style.display = 'none';
            }, 300);
            document.body.style.overflow = 'auto';
            
            // Clear service-specific fields
            const container = document.getElementById('serviceSpecificFields');
            if (container) {
                container.innerHTML = '';
                container.style.display = 'none';
            }
        }
    }
    
    // Add event listeners to all Contact Us links
    contactUsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Contact Us link clicked');
            openContactModal(null); // No pre-selected service
        });
    });
    
    // Close contact modal
    if (closeContactModal) {
        closeContactModal.addEventListener('click', function(e) {
            e.stopPropagation();
            closeContactModalFn();
        });
    }
    
    // Close when clicking outside contact modal content
    if (contactModal) {
        contactModal.addEventListener('click', function(e) {
            if (e.target === contactModal) {
                closeContactModalFn();
            }
        });
    }
    
    // Service cards - open contact modal with pre-selected service
    const serviceCards = document.querySelectorAll('.service-card[data-service]');
    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            const service = this.getAttribute('data-service');
            openContactModal(service);
        });
    });
    
    // Contact form submission
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            
            // Collect all service-specific details
            const serviceDetails = {};
            
            // Get event date if exists
            if (formData.get('eventDate')) serviceDetails.eventDate = formData.get('eventDate');
            if (formData.get('expectedAttendance')) serviceDetails.expectedAttendance = formData.get('expectedAttendance');
            if (formData.get('eventDuration')) serviceDetails.eventDuration = formData.get('eventDuration');
            if (formData.get('venueLocation')) serviceDetails.venueLocation = formData.get('venueLocation');
            if (formData.get('venueSize')) serviceDetails.venueSize = formData.get('venueSize');
            
            // Executive protection fields
            if (formData.get('startDate')) serviceDetails.startDate = formData.get('startDate');
            if (formData.get('endDate')) serviceDetails.endDate = formData.get('endDate');
            if (formData.get('numProtectees')) serviceDetails.numProtectees = formData.get('numProtectees');
            if (formData.get('protectionLevel')) serviceDetails.protectionLevel = formData.get('protectionLevel');
            
            // Risk assessment fields
            if (formData.get('assessmentType')) serviceDetails.assessmentType = formData.get('assessmentType');
            if (formData.get('facilityType')) serviceDetails.facilityType = formData.get('facilityType');
            if (formData.get('facilitySize')) serviceDetails.facilitySize = formData.get('facilitySize');
            
            // Collect add-ons
            const addons = formData.getAll('addons[]');
            if (addons.length > 0) serviceDetails.addons = addons;
            
            // Build message with service details
            let fullMessage = formData.get('message') || '';
            if (Object.keys(serviceDetails).length > 0) {
                fullMessage += '\n\n--- Service Details ---\n';
                for (const [key, value] of Object.entries(serviceDetails)) {
                    if (key === 'addons') {
                        fullMessage += `${key}: ${value.join(', ')}\n`;
                    } else {
                        fullMessage += `${key}: ${value}\n`;
                    }
                }
            }
            
            const contactData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                state: formData.get('state'),
                service: formData.get('service'),
                message: fullMessage,
                status: 'new',
                created_at: new Date().toISOString()
            };
            
            try {
                // Save to Supabase
                const { data, error } = await window.supabaseClient
                    .from('contacts')
                    .insert([contactData]);
                
                if (error) throw error;
                
                // Send confirmation email
                try {
                    const emailHTML = generateContactEmailHTML(formData.get('name'), formData.get('service'));
                    await sendEmailViaResend(
                        formData.get('email'),
                        'Message Received - OpServe Safety Group',
                        emailHTML
                    );
                } catch (emailError) {
                    console.error('Failed to send confirmation email:', emailError);
                    // Continue anyway - contact was saved
                }
                
                // Show success message
                alert('Thank you for contacting us! We will get back to you as soon as possible. Check your email for confirmation.');
                
                // Reset form and close modal
                this.reset();
                closeContactModalFn();
            } catch (error) {
                console.error('Error submitting contact form:', error);
                alert('Sorry, there was an error submitting your message. Please try again or email us directly.');
            }
        });
    }

    // Mobile Navigation Toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });
    }

    // Close mobile menu when clicking on a nav link
    const navLinksAll = document.querySelectorAll('.nav-links a');
    navLinksAll.forEach(item => {
        item.addEventListener('click', function() {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        });
    });

    // Sticky Navigation on Scroll
    const navbar = document.querySelector('.navbar');
    const heroSection = document.querySelector('.hero');
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });


    // Active Navigation Link Highlighting
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-links a');
    
    function highlightNav() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', highlightNav);
    
    // Initialize highlightNav on page load
    highlightNav();

    // Add animation on scroll
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.service-card, .about-content, .contact-container > div');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Set initial styles for animation
    document.addEventListener('DOMContentLoaded', function() {
        const elements = document.querySelectorAll('.service-card, .about-content, .contact-container > div');
        elements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        });
        
        // Trigger animation on load
        setTimeout(animateOnScroll, 300);
    });
    
    window.addEventListener('scroll', animateOnScroll);

    // Back to Top Button
    const backToTopButton = document.createElement('button');
    backToTopButton.innerHTML = '&uarr;';
    backToTopButton.className = 'back-to-top';
    document.body.appendChild(backToTopButton);
    
    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('show');
        } else {
            backToTopButton.classList.remove('show');
        }
    });
});

// Add styles for back to top button
const backToTopStyles = document.createElement('style');
backToTopStyles.textContent = `
    .back-to-top {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 999;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
    
    .back-to-top.show {
        opacity: 1;
        visibility: visible;
    }
    
    .back-to-top:hover {
        background-color: var(--secondary-color);
        transform: translateY(-5px);
    }
    
    .no-scroll {
        overflow: hidden;
    }
`;
document.head.appendChild(backToTopStyles);
