// js/app.js

import { db, auth, firebaseStorage, doc, setDoc, onSnapshot, collection, deleteDoc, signInAnonymously, onAuthStateChanged, ref, uploadBytes, getDownloadURL } from './db.js';
import { generateId, getYouTubeEmbed, getVimeoEmbed } from './utils.js';
import { showMessage, toggleLoading } from './ui.js'; // Assuming ui.js has these functions
import { getAvailableTemplates } from './templates.js';
import { exportMenuAsPdf, exportMenuAsImage, exportMenuAsHtml } from './exportUtils.js';

// Electron API for inter-process communication
const { electronAPI } = window;

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const itemForm = document.getElementById('itemForm');
const itemId = document.getElementById('itemId');
const itemName = document.getElementById('itemName');
const itemDescription = document.getElementById('itemDescription');
const itemPrice = document.getElementById('itemPrice');
const itemCategory = document.getElementById('itemCategory');
const itemImageUrl = document.getElementById('itemImageUrl');
const itemVideoUrl = document.getElementById('itemVideoUrl');
const itemStatus = document.getElementById('itemStatus');
const itemsList = document.getElementById('itemsList');
const itemSearch = document.getElementById('itemSearch');
const categoryForm = document.getElementById('categoryForm');
const categoryId = document.getElementById('categoryId');
const categoryName = document.getElementById('categoryName');
const categoryOrder = document.getElementById('categoryOrder');
const categoriesList = document.getElementById('categoriesList');
const templateSelection = document.getElementById('templateSelection');
const viewMenuBtn = document.getElementById('viewMenuBtn');
const settingsForm = document.getElementById('settingsForm');
const restaurantNameInput = document.getElementById('restaurantName');
const restaurantLogoUrlInput = document.getElementById('restaurantLogoUrl');
const contactPhoneInput = document.getElementById('contactPhone');
const contactAddressInput = document.getElementById('contactAddress');
const contactWebsiteInput = document.getElementById('contactWebsite');
const generateQrCodeCheckbox = document.getElementById('generateQrCode');
const qrCodeContainer = document.getElementById('qrCodeContainer');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportImageBtn = document.getElementById('exportImageBtn');
const exportHtmlBtn = document.getElementById('exportHtmlBtn');
const menuPreview = document.getElementById('menuPreview');
const categoriesOrderSelect = document.getElementById('categoriesOrder');
const customCategoryOrderSection = document.getElementById('customCategoryOrderSection');
const customCategoryOrderList = document.getElementById('customCategoryOrderList');


// Current state variables
let menuItems = [];
let categories = [];
let appSettings = {};
let currentAuthUid = null;
let currentSettingsSnapshot = null;


// Function to get combined menu data
async function getMenuData() {
    return {
        items: menuItems,
        categories: categories
    };
}

// Function to get application settings
async function getAppSettings() {
    return appSettings;
}

// Function to render categories in the item form dropdown
function renderCategoryDropdown() {
    itemCategory.innerHTML = '<option value="">اختر فئة</option>';
    categories.sort((a, b) => a.name.localeCompare(b.name, 'ar')).forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        itemCategory.appendChild(option);
    });
}

// Function to render menu items list
function renderMenuItems(filterText = '') {
    itemsList.innerHTML = '';
    const filteredItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(filterText.toLowerCase())
    );

    filteredItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item-card';
        itemDiv.innerHTML = `
            <h3>${item.name} <span class="item-status ${item.status}">${item.status === 'active' ? 'نشط' : 'غير نشط'}</span></h3>
            <p>الوصف: ${item.description || 'لا يوجد'}</p>
            <p>السعر: ${item.price} SAR</p>
            <p>الفئة: ${categories.find(cat => cat.id === item.category)?.name || 'غير محدد'}</p>
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="صورة الصنف" class="item-image-thumb">` : ''}
            <div class="item-actions">
                <button class="edit-btn" data-id="${item.id}">تعديل</button>
                <button class="delete-btn" data-id="${item.id}">حذف</button>
            </div>
        `;
        itemsList.appendChild(itemDiv);
    });

    // Add event listeners for edit/delete buttons
    itemsList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const itemToEdit = menuItems.find(item => item.id === id);
            if (itemToEdit) {
                itemId.value = itemToEdit.id;
                itemName.value = itemToEdit.name;
                itemDescription.value = itemToEdit.description;
                itemPrice.value = itemToEdit.price;
                itemCategory.value = itemToEdit.category;
                itemImageUrl.value = itemToEdit.imageUrl;
                itemVideoUrl.value = itemToEdit.videoUrl;
                itemStatus.value = itemToEdit.status;
            }
        });
    });

    itemsList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('هل أنت متأكد أنك تريد حذف هذا الصنف؟')) {
                const id = e.target.dataset.id;
                await deleteItem(id);
            }
        });
    });
}

// Function to render categories list
function renderCategoriesList() {
    categoriesList.innerHTML = '';
    categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-card';
        categoryDiv.innerHTML = `
            <h3>${category.name}</h3>
            <p>الترتيب: ${category.order}</p>
            <div class="category-actions">
                <button class="edit-btn" data-id="${category.id}">تعديل</button>
                <button class="delete-btn" data-id="${category.id}">حذف</button>
            </div>
        `;
        categoriesList.appendChild(categoryDiv);
    });

    categoriesList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const categoryToEdit = categories.find(cat => cat.id === id);
            if (categoryToEdit) {
                categoryId.value = categoryToEdit.id;
                categoryName.value = categoryToEdit.name;
                categoryOrder.value = categoryToEdit.order;
            }
        });
    });

    categoriesList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('هل أنت متأكد أنك تريد حذف هذه الفئة؟ سيتم حذف جميع الأصناف المرتبطة بها!')) {
                const id = e.target.dataset.id;
                await deleteCategory(id);
            }
        });
    });
}


function renderCustomCategoryOrderList() {
    customCategoryOrderList.innerHTML = '';
    // Sort categories by current custom order or alphabetical if no order set
    const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedCategories.forEach(category => {
        const li = document.createElement('li');
        li.dataset.id = category.id;
        li.textContent = category.name;
        li.classList.add('sortable-item');
        customCategoryOrderList.appendChild(li);
    });

    // Make the list sortable (assuming Sortable.js is loaded in index.html)
    // Note: Sortable.js library is not included in this code. You need to add it separately
    // e.g., <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.14.0/Sortable.min.js"></script>
    if (typeof Sortable !== 'undefined') {
        new Sortable(customCategoryOrderList, {
            animation: 150,
            onEnd: async function (evt) {
                const newOrder = Array.from(customCategoryOrderList.children).map((li, index) => ({
                    id: li.dataset.id,
                    order: index
                }));

                // Update local categories array
                newOrder.forEach(newCat => {
                    const cat = categories.find(c => c.id === newCat.id);
                    if (cat) {
                        cat.order = newCat.order;
                    }
                });

                // Update app settings in Firestore
                await updateAppSettings({ customCategoryOrder: newOrder });
                await updatePreview(); // Re-render preview with new order
            },
        });
    } else {
        console.warn("Sortable.js not loaded. Custom category reordering will not work.");
    }
}

// Function to render templates
function renderTemplates() {
    templateSelection.innerHTML = '';
    const templates = getAvailableTemplates(); // Get templates from templates.js

    templates.forEach(template => {
        const templateDiv = document.createElement('div');
        templateDiv.className = `template-card ${appSettings.selectedTemplate === template.id ? 'selected' : ''}`;
        templateDiv.dataset.templateId = template.id;
        templateDiv.innerHTML = `
            <h3>${template.name}</h3>
            <img src="${template.thumbnail}" alt="${template.name}">
        `;
        templateSelection.appendChild(templateDiv);

        templateDiv.addEventListener('click', async () => {
            await updateAppSettings({ selectedTemplate: template.id });
            renderTemplates(); // Re-render to update selected state
            await updatePreview(); // Update preview with new template
        });
    });
}

// Function to update menu preview
async function updatePreview() {
    const data = await getMenuData();
    const settings = await getAppSettings();
    const selectedTemplate = settings.selectedTemplate || 'template1';

    let htmlContent = `
        <div class="restaurant-header">
            ${settings.restaurantLogoUrl ? `<img src="${settings.restaurantLogoUrl}" alt="شعار المطعم" class="restaurant-logo">` : ''}
            <h1>${settings.restaurantName || 'اسم المطعم'}</h1>
            ${settings.contactPhone || settings.contactAddress || settings.contactWebsite ? `
                <div class="contact-info">
                    ${settings.contactPhone ? `<p>الهاتف: ${settings.contactPhone}</p>` : ''}
                    ${settings.contactAddress ? `<p>العنوان: ${settings.contactAddress}</p>` : ''}
                    ${settings.contactWebsite ? `<p>الموقع: <a href="${settings.contactWebsite}" target="_blank">${settings.contactWebsite}</a></p>` : ''}
                </div>
            ` : ''}
        </div>
    `;

    // Sort categories based on selected order
    let sortedCategories = [...data.categories];
    if (settings.categoriesOrder === 'custom' && settings.customCategoryOrder && settings.customCategoryOrder.length > 0) {
        sortedCategories.sort((a, b) => {
            const orderA = settings.customCategoryOrder.find(item => item.id === a.id)?.order || 9999;
            const orderB = settings.customCategoryOrder.find(item => item.id === b.id)?.order || 9999;
            return orderA - orderB;
        });
    } else {
        sortedCategories.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }


    sortedCategories.forEach(category => {
        const categoryItems = data.items
            .filter(item => item.category === category.id && item.status === 'active')
            .sort((a, b) => a.name.localeCompare(b.name, 'ar')); // Sort items alphabetically

        if (categoryItems.length > 0) {
            htmlContent += `<section><h2 class="category-title">${category.name}</h2>`;
            categoryItems.forEach(item => {
                htmlContent += `
                    <div class="menu-item ${item.status === 'inactive' ? 'inactive' : ''}">
                        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="item-image">` : ''}
                        <div class="item-details">
                            <h3 class="item-name">${item.name}</h3>
                            ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
                            <p class="item-price">${item.price} SAR</p>
                            ${item.videoUrl ? `<div class="item-video">${getYouTubeEmbed(item.videoUrl) || getVimeoEmbed(item.videoUrl)}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            htmlContent += `</section>`;
        }
    });

    menuPreview.innerHTML = htmlContent;
    // Apply template specific CSS
    menuPreview.className = `menu-preview-container ${selectedTemplate}`;
}

// Function to generate and display QR code
async function generateAndDisplayQrCode() {
    qrCodeContainer.innerHTML = '';
    const settings = await getAppSettings();
    if (settings.generateQrCode) {
        // IMPORTANT: For Electron, you might want to use a local server URL or a static URL
        // If you still intend to use Firebase Hosting, ensure this URL is correct.
        const menuUrl = 'https://your-firebase-hosting-url.web.app/menu.html'; // Placeholder: Replace with your actual hosted menu URL
        if (menuUrl) {
            new QRCode(qrCodeContainer, {
                text: menuUrl,
                width: 128,
                height: 128
            });
        }
    }
}


// --- Firebase Database Operations ---

// Save or update an item
async function saveItem(item) {
    try {
        toggleLoading(true);
        const id = item.id || generateId();
        await setDoc(doc(db, `users/${currentAuthUid}/items`, id), { ...item, id: id });
        showMessage("Item saved successfully!", "success");
        itemForm.reset();
        itemId.value = ''; // Clear hidden ID
    } catch (e) {
        console.error("Error saving item: ", e);
        showMessage("فشل حفظ الصنف: " + e.message, "error");
    } finally {
        toggleLoading(false);
    }
}

// Delete an item
async function deleteItem(id) {
    try {
        if (confirm('هل أنت متأكد أنك تريد حذف هذا الصنف؟')) {
            toggleLoading(true);
            await deleteDoc(doc(db, `users/${currentAuthUid}/items`, id));
            showMessage("Item deleted successfully!", "success");
        }
    } catch (e) {
        console.error("Error deleting item: ", e);
        showMessage("فشل حذف الصنف: " + e.message, "error");
    } finally {
        toggleLoading(false);
    }
}

// Save or update a category
async function saveCategory(category) {
    try {
        toggleLoading(true);
        const id = category.id || generateId();
        await setDoc(doc(db, `users/${currentAuthUid}/categories`, id), { ...category, id: id });
        showMessage("Category saved successfully!", "success");
        categoryForm.reset();
        categoryId.value = ''; // Clear hidden ID
    } catch (e) {
        console.error("Error saving category: ", e);
        showMessage("فشل حفظ الفئة: " + e.message, "error");
    } finally {
        toggleLoading(false);
    }
}

// Delete a category and its associated items
async function deleteCategory(id) {
    try {
        if (confirm('هل أنت متأكد أنك تريد حذف هذه الفئة؟ سيتم حذف جميع الأصناف المرتبطة بها!')) {
            toggleLoading(true);
            // Delete associated items
            const itemsToDelete = menuItems.filter(item => item.category === id);
            for (const item of itemsToDelete) {
                await deleteDoc(doc(db, `users/${currentAuthUid}/items`, item.id));
            }

            // Delete the category
            await deleteDoc(doc(db, `users/${currentAuthUid}/categories`, id));
            showMessage("Category and associated items deleted successfully!", "success");
        }
    } catch (e) {
        console.error("Error deleting category: ", e);
        showMessage("فشل حذف الفئة: " + e.message, "error");
    } finally {
        toggleLoading(false);
    }
}

// Update app settings
async function updateAppSettings(settingsToUpdate) {
    try {
        toggleLoading(true);
        await setDoc(doc(db, `users/${currentAuthUid}/settings`, 'appSettings'), settingsToUpdate, { merge: true });
        showMessage("App settings updated successfully!", "success");
    } catch (e) {
        console.error("Error updating settings: ", e);
        showMessage("فشل تحديث الإعدادات: " + e.message, "error");
    } finally {
        toggleLoading(false);
    }
}


// --- Event Listeners and Initial Setup ---
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');

            // Re-render specific sections when their tab is activated
            if (button.dataset.tab === 'menu-items') {
                renderCategoryDropdown();
                renderMenuItems();
            } else if (button.dataset.tab === 'categories') {
                renderCategoriesList();
                // Ensure custom order section visibility is correct
                const customOrderSection = document.getElementById('customCategoryOrderSection');
                if (categoriesOrderSelect.value === 'custom') {
                    customOrderSection.style.display = 'block';
                    renderCustomCategoryOrderList();
                } else {
                    customOrderSection.style.display = 'none';
                }
            } else if (button.dataset.tab === 'templates') {
                renderTemplates();
            } else if (button.dataset.tab === 'app-settings') {
                // Populate settings form
                restaurantNameInput.value = appSettings.restaurantName || '';
                restaurantLogoUrlInput.value = appSettings.restaurantLogoUrl || '';
                contactPhoneInput.value = appSettings.contactPhone || '';
                contactAddressInput.value = appSettings.contactAddress || '';
                contactWebsiteInput.value = appSettings.contactWebsite || '';
                generateQrCodeCheckbox.checked = appSettings.generateQrCode || false;
                generateAndDisplayQrCode();
            } else if (button.dataset.tab === 'preview-export') {
                updatePreview();
            }
        });
    });

    // Item Form Submission
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newItem = {
            id: itemId.value || generateId(),
            name: itemName.value,
            description: itemDescription.value,
            price: parseFloat(itemPrice.value),
            category: itemCategory.value,
            imageUrl: itemImageUrl.value,
            videoUrl: itemVideoUrl.value,
            status: itemStatus.value
        };
        await saveItem(newItem);
    });

    // Item Search
    itemSearch.addEventListener('input', (e) => {
        renderMenuItems(e.target.value);
    });

    // Category Form Submission
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCategory = {
            id: categoryId.value || generateId(),
            name: categoryName.value,
            order: parseInt(categoryOrder.value)
        };
        await saveCategory(newCategory);
    });

    // App Settings Form Submission
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedSettings = {
            restaurantName: restaurantNameInput.value,
            restaurantLogoUrl: restaurantLogoUrlInput.value,
            contactPhone: contactPhoneInput.value,
            contactAddress: contactAddressInput.value,
            contactWebsite: contactWebsiteInput.value,
            generateQrCode: generateQrCodeCheckbox.checked,
            // Custom category order is handled by Sortable.js directly
            categoriesOrder: categoriesOrderSelect.value
        };
        await updateAppSettings(updatedSettings);
        generateAndDisplayQrCode(); // Re-generate QR code if setting changed
        updatePreview(); // Re-render preview with new settings
    });

    generateQrCodeCheckbox.addEventListener('change', generateAndDisplayQrCode);

    // View Menu Button (Electron specific)
    viewMenuBtn.addEventListener('click', async () => {
        const menuData = await getMenuData();
        const appSettings = await getAppSettings();
        const selectedTemplate = appSettings.selectedTemplate || 'template1';

        // Build HTML content for the menu as in exportMenuAsHtml
        let menuHtmlContent = `
            <div class="restaurant-header">
                ${appSettings.restaurantLogoUrl ? `<img src="${appSettings.restaurantLogoUrl}" alt="شعار المطعم" class="restaurant-logo">` : ''}
                <h1>${appSettings.restaurantName || 'اسم المطعم'}</h1>
                ${appSettings.contactPhone || appSettings.contactAddress || appSettings.contactWebsite ? `
                    <div class="contact-info">
                        ${appSettings.contactPhone ? `<p>الهاتف: ${appSettings.contactPhone}</p>` : ''}
                        ${appSettings.contactAddress ? `<p>العنوان: ${appSettings.contactAddress}</p>` : ''}
                        ${appSettings.contactWebsite ? `<p>الموقع: <a href="${appSettings.contactWebsite}" target="_blank">${appSettings.contactWebsite}</a></p>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        // Sort categories based on selected order
        let sortedCategories = [...menuData.categories];
        if (appSettings.categoriesOrder === 'custom' && appSettings.customCategoryOrder && appSettings.customCategoryOrder.length > 0) {
            sortedCategories.sort((a, b) => {
                const orderA = appSettings.customCategoryOrder.find(item => item.id === a.id)?.order || 9999;
                const orderB = appSettings.customCategoryOrder.find(item => item.id === b.id)?.order || 9999;
                return orderA - orderB;
            });
        } else {
            sortedCategories.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        }

        sortedCategories.forEach(category => {
            const categoryItems = menuData.items
                .filter(item => item.category === category.id && item.status === 'active')
                .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

            if (categoryItems.length > 0) {
                menuHtmlContent += `<section><h2 class="category-title">${category.name}</h2>`;
                categoryItems.forEach(item => {
                    menuHtmlContent += `
                        <div class="menu-item ${item.status === 'inactive' ? 'inactive' : ''}">
                            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="item-image">` : ''}
                            <div class="item-details">
                                <h3 class="item-name">${item.name}</h3>
                                ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
                                <p class="item-price">${item.price} SAR</p>
                                ${item.videoUrl ? `<div class="item-video">${getYouTubeEmbed(item.videoUrl) || getVimeoEmbed(item.videoUrl)}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                menuHtmlContent += `</section>`;
            }
        });

        // Use electronAPI to open a new Electron window for the menu
        await electronAPI.openMenuWindow(menuHtmlContent, selectedTemplate, appSettings);
    });

    // Export Buttons
    exportPdfBtn.addEventListener('click', exportMenuAsPdf);
    exportImageBtn.addEventListener('click', exportMenuAsImage);
    exportHtmlBtn.addEventListener('click', exportMenuAsHtml);

    // Categories Order Select
    categoriesOrderSelect.addEventListener('change', async function() {
        const customOrderSection = document.getElementById('customCategoryOrderSection');
        if (this.value === 'custom') {
            customOrderSection.style.display = 'block';
            renderCustomCategoryOrderList();
        } else {
            customOrderSection.style.display = 'none';
        }
        await updateAppSettings({ categoriesOrder: this.value });
        await updatePreview();
    });
}

// Initial data loading and rendering
document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate anonymously
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentAuthUid = user.uid;
            console.log("Authenticated with Firebase UID:", currentAuthUid);

            // Listen for changes to items
            onSnapshot(collection(db, `users/${currentAuthUid}/items`), (snapshot) => {
                menuItems = snapshot.docs.map(doc => doc.data());
                renderMenuItems();
                updatePreview();
            }, (error) => {
                console.error("Error listening to items:", error);
                showMessage("فشل تحميل الأصناف: " + error.message, "error");
            });

            // Listen for changes to categories
            onSnapshot(collection(db, `users/${currentAuthUid}/categories`), (snapshot) => {
                categories = snapshot.docs.map(doc => doc.data());
                renderCategoryDropdown();
                renderCategoriesList();
                renderCustomCategoryOrderList();
                updatePreview();
            }, (error) => {
                console.error("Error listening to categories:", error);
                showMessage("فشل تحميل الفئات: " + error.message, "error");
            });

            // Listen for changes to app settings
            onSnapshot(doc(db, `users/${currentAuthUid}/settings`, 'appSettings'), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    appSettings = docSnapshot.data();
                    // Update form fields and preview
                    restaurantNameInput.value = appSettings.restaurantName || '';
                    restaurantLogoUrlInput.value = appSettings.restaurantLogoUrl || '';
                    contactPhoneInput.value = appSettings.contactPhone || '';
                    contactAddressInput.value = appSettings.contactAddress || '';
                    contactWebsiteInput.value = appSettings.contactWebsite || '';
                    generateQrCodeCheckbox.checked = appSettings.generateQrCode || false;
                    categoriesOrderSelect.value = appSettings.categoriesOrder || 'alphabetical';

                    // Update custom order section visibility
                    const customOrderSection = document.getElementById('customCategoryOrderSection');
                    if (appSettings.categoriesOrder === 'custom') {
                        customOrderSection.style.display = 'block';
                        renderCustomCategoryOrderList(); // Ensure custom order list is updated
                    } else {
                        customOrderSection.style.display = 'none';
                    }

                    generateAndDisplayQrCode();
                    updatePreview();
                    renderTemplates(); // Re-render templates to update selected state
                } else {
                    appSettings = {}; // No settings yet
                    // Reset form fields
                    restaurantNameInput.value = '';
                    restaurantLogoUrlInput.value = '';
                    contactPhoneInput.value = '';
                    contactAddressInput.value = '';
                    contactWebsiteInput.value = '';
                    generateQrCodeCheckbox.checked = false;
                    categoriesOrderSelect.value = 'alphabetical';
                    customCategoryOrderSection.style.display = 'none';
                    generateAndDisplayQrCode();
                    updatePreview();
                    renderTemplates();
                }
            }, (error) => {
                console.error("Error listening to app settings:", error);
                showMessage("فشل تحميل الإعدادات: " + error.message, "error");
            });

        } else {
            // No user, sign in anonymously
            await signInAnonymously(auth);
        }
    });
    // ... (rest of the imports and variables) ...

// Function to handle image upload via drag and drop
async function uploadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
        showMessage('الرجاء سحب ملف صورة صالح.', 'error');
        return null;
    }

    try {
        toggleLoading(true);
        const storageRef = ref(firebaseStorage, `images/<span class="math-inline">\{currentAuthUid\}/</span>{generateId()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        showMessage('تم رفع الصورة بنجاح!', 'success');
        return downloadURL;
    } catch (e) {
        console.error('Error uploading image:', e);
        showMessage('فشل رفع الصورة: ' + e.message, 'error');
        return null;
    } finally {
        toggleLoading(false);
    }
}

function setupDragAndDropForImage(elementId, targetInputId) {
    const dropArea = document.getElementById(elementId);
    const targetInput = document.getElementById(targetInputId);

    if (!dropArea || !targetInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    dropArea.addEventListener('drop', async (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        const url = dt.getData('text/plain'); // Try to get URL if dragged from browser

        if (files.length > 0) {
            // Handle file drop (for image upload)
            const file = files[0];
            const imageUrl = await uploadImage(file);
            if (imageUrl) {
                targetInput.value = imageUrl;
            }
        } else if (url) {
            // Handle URL drop (e.g., image from another tab)
            // Basic validation for image URL
            if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
                targetInput.value = url;
                showMessage('تم إضافة رابط الصورة بنجاح!', 'success');
            } else {
                showMessage('الرجاء سحب ملف صورة أو رابط صورة صالح.', 'error');
            }
        } else {
            showMessage('الرجاء سحب ملف صورة أو رابط صورة صالح.', 'error');
        }
    }, false);
}

function setupDragAndDropForVideo(elementId, targetInputId) {
    const dropArea = document.getElementById(elementId);
    const targetInput = document.getElementById(targetInputId);

    if (!dropArea || !targetInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const url = dt.getData('text/plain');

        if (url) {
            // Basic validation for YouTube/Vimeo URL
            if (getYouTubeEmbed(url) || getVimeoEmbed(url)) {
                targetInput.value = url;
                showMessage('تم إضافة رابط الفيديو بنجاح!', 'success');
            } else {
                showMessage('الرجاء سحب رابط فيديو يوتيوب أو فيميو صالح.', 'error');
            }
        } else {
            showMessage('الرجاء سحب رابط فيديو يوتيوب أو فيميو صالح.', 'error');
        }
    }, false);
}
// ... (rest of the app.js code) ...

    setupEventListeners();
    // ... (inside setupEventListeners) ...

// Setup drag and drop for image and video URLs/files
setupDragAndDropForImage('itemImageUrl', 'itemImageUrl'); // Use the input field itself as drop area
setupDragAndDropForVideo('itemVideoUrl', 'itemVideoUrl'); // Use the input field itself as drop area

// If you want a separate drop area, you would add a new div in HTML like:
// <div id="imageDropArea" class="drop-area">اسحب صورة هنا</div>
// Then call: setupDragAndDropForImage('imageDropArea', 'itemImageUrl');

// ... (rest of setupEventListeners) ...
    // No need for initial renderMenuItems etc. here, as they are called by snapshot listeners
});