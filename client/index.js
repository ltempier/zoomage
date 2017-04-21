"use strict";

$(document).ready(function () {
    var workspace = new Zoomage('workspace');

    $('#file-selector').on('change', function (e) {
        var file = (e.dataTransfer ? e.dataTransfer.files : e.target.files)[0];
        var dataUrl = window.URL.createObjectURL(file);
        workspace.setImage(dataUrl);
    })
});
