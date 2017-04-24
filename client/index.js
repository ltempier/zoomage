"use strict";

$(document).ready(function () {

    var workspace = new Zoomage('zoomage', function (gifDataUrl) {
        $('#gif-result').attr('src', gifDataUrl);

        if (gifDataUrl && gifDataUrl.length){
            $('#download').show()
            $('#download').attr('href', gifDataUrl)
        }else
            $('#download').hide()
    });

    $('#file-selector').on('change', function (e) {
        var file = (e.dataTransfer ? e.dataTransfer.files : e.target.files)[0];
        var dataUrl = window.URL.createObjectURL(file);
        workspace.setImage(dataUrl);
    })
});
