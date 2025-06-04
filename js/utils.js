// js/utils.js

// Utility function to generate unique IDs
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper functions for video embeds
function getYouTubeEmbed(url) {
    const regExp = /^.*(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    const match = url.match(regExp);
    if (match && match[1] && match[1].length === 11) {
        return `<iframe width="560" height="315" src="http://www.youtube.com/embed/${match[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    return null;
}

function getVimeoEmbed(url) {
    const regExp = /(?:vimeo)\.com\/(?:video\/)?([0-9]+)/;
    const match = url.match(regExp);
    if (match && match[1]) {
        return `<iframe src="https://player.vimeo.com/video/${match[1]}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    return null;
}

export { generateId, getYouTubeEmbed, getVimeoEmbed };