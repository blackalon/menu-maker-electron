// js/exportUtils.js

import { getMenuData, getAppSettings } from './app.js'; // Import these from app.js if they are not global
import { getYouTubeEmbed, getVimeoEmbed } from './utils.js'; // Import utility functions

const { electronAPI } = window; // Access Electron's exposed API

async function exportMenuAsPdf() {
    const menuContainer = document.getElementById('menuPreview');
    if (!menuContainer) {
        alert('لا يمكن العثور على منطقة معاينة المنيو للتصدير.');
        return;
    }

    const filename = `menu-${new Date().toISOString().split('T')[0]}`;
    
    const canvas = await html2canvas(menuContainer, {
        scale: 2, // Increase scale for better quality
        useCORS: true, // Needed if you have external images
        logging: true,
        allowTaint: true,
        backgroundColor: '#ffffff' // Ensure background is white
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    // --- Electron Save File ---
    const pdfData = pdf.output('arraybuffer');
    const saveResult = await electronAPI.saveFile(
        Buffer.from(pdfData), // Electron expects Buffer for binary data
        `${filename}.pdf`,
        [{ name: 'PDF Files', extensions: ['pdf'] }]
    );

    if (saveResult.success) {
        alert('تم تصدير المنيو كملف PDF بنجاح!');
    } else {
        alert(`فشل تصدير PDF: ${saveResult.message || 'المستخدم ألغى الحفظ'}`);
    }
}

async function exportMenuAsImage() {
    const menuContainer = document.getElementById('menuPreview');
    if (!menuContainer) {
        alert('لا يمكن العثور على منطقة معاينة المنيو للتصدير.');
        return;
    }

    const filename = `menu-${new Date().toISOString().split('T')[0]}`;

    const canvas = await html2canvas(menuContainer, {
        scale: 2, // Increase scale for better quality
        useCORS: true,
        logging: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
    });

    const imageDataURL = canvas.toDataURL('image/png');
    const base64Data = imageDataURL.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64'); // Convert Base64 to Buffer

    // --- Electron Save File ---
    const saveResult = await electronAPI.saveFile(
        imageBuffer,
        `${filename}.png`,
        [{ name: 'PNG Images', extensions: ['png'] }]
    );

    if (saveResult.success) {
        alert('تم تصدير المنيو كصورة PNG بنجاح!');
    } else {
        alert(`فشل تصدير الصورة: ${saveResult.message || 'المستخدم ألغى الحفظ'}`);
    }
}

async function exportMenuAsHtml() {
    const menuData = await getMenuData();
    const appSettings = await getAppSettings();
    const selectedTemplate = appSettings.selectedTemplate || 'template1';
    const filename = `menu-${new Date().toISOString().split('T')[0]}`;

    // Get CSS content using Electron API
    const templateCssUrl = `css/templates/${selectedTemplate}.css`;
    const mainCssUrl = `css/main.css`;

    let templateCssContent = '';
    let mainCssContent = '';

    try {
        const templateResponse = await electronAPI.readLocalFile(templateCssUrl);
        if (templateResponse.success) {
            templateCssContent = templateResponse.data;
        } else {
            console.warn(`Could not load template CSS from ${templateCssUrl}: ${templateResponse.message}`);
        }
    } catch (cssError) {
        console.error(`Error reading template CSS: ${cssError}`);
    }

    try {
        const mainResponse = await electronAPI.readLocalFile(mainCssUrl);
        if (mainResponse.success) {
            mainCssContent = mainResponse.data;
        } else {
            console.warn(`Could not load main CSS from ${mainCssUrl}: ${mainResponse.message}`);
        }
    } catch (cssError) {
        console.error(`Error reading main CSS: ${cssError}`);
    }

    const renderMenuContent = (data, settings) => {
        let html = `
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

        // Ensure categories are sorted by custom order or alphabetical
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
                .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

            if (categoryItems.length > 0) {
                html += `<section><h2 class="category-title">${category.name}</h2>`;
                categoryItems.forEach(item => {
                    html += `
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
                html += `</section>`;
            }
        });
        return html;
    };

    const menuHtmlBody = renderMenuContent(menuData, appSettings);

    const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${appSettings.restaurantName || 'قائمة طعام المطعم'}</title>
            <style>
                ${mainCssContent}
                ${templateCssContent}
            </style>
            <script>
                // Helper functions for video embeds (مهم جداً تكون هنا للتصدير كـ HTML)
                function getYouTubeEmbed(url) {
                    const regExp = /^.*(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
                    const match = url.match(regExp);
                    if (match && match[1] && match[1].length === 11) {
                        return \`<iframe width="560" height="315" src="http://www.youtube.com/embed/\${match[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\`;
                    }
                    return null;
                }

                function getVimeoEmbed(url) {
                    const regExp = /(?:vimeo)\\.com\\/(?:video\\/)?([0-9]+)/;
                    const match = url.match(regExp);
                    if (match && match[1]) {
                        return \`<iframe src="https://player.vimeo.com/video/\${match[1]}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>\`;
                    }
                    return null;
                }
            </script>
        </head>
        <body class="${selectedTemplate}">
            <div class="menu-display-container">
                ${menuHtmlBody}
            </div>
        </body>
        </html>
    `;

    // --- Electron Save File ---
    const saveResult = await electronAPI.saveFile(
        fullHtml,
        `${filename}.html`,
        [{ name: 'HTML Files', extensions: ['html'] }]
    );

    if (saveResult.success) {
        alert('تم تصدير المنيو كملف HTML بنجاح!');
    } else {
        alert(`فشل تصدير HTML: ${saveResult.message || 'المستخدم ألغى الحفظ'}`);
    }
}

// Export functions for use in app.js
export { exportMenuAsPdf, exportMenuAsImage, exportMenuAsHtml };