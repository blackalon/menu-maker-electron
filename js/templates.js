// js/templates.js

// This module defines and helps manage menu templates.

const availableTemplates = [
    { id: 'template1', name: 'القالب الافتراضي', thumbnail: 'assets/images/template1-thumbnail.png' },
    // يمكنك إضافة المزيد من القوالب هنا
    // { id: 'template2', name: 'القالب العصري', thumbnail: 'assets/images/template2-thumbnail.png' },
    // { id: 'template3', name: 'القالب الكلاسيكي', thumbnail: 'assets/images/template3-thumbnail.png' },
];

function getAvailableTemplates() {
    return availableTemplates;
}

export { getAvailableTemplates };