"use strict";

var Workspace = function (id) {
    this._id = id.charAt(0) === '#' ? id : '#' + id;
    this._size = {
        width: 0,
        height: 0
    };
    this._zoom = 0.8;

    this.$div = $(this._id).css('position', 'relative');
    this.$canvas = $('<canvas></canvas>');
    this.$layer = $('<canvas></canvas>').css('position', 'relative');

    [this.$canvas, this.$layer].forEach(($c) => {
        $c.css('position', 'absolute');
        $c.css('top', 0);
        $c.css('left', 0);
        this.$div.append($c)
    });
    this.init();
};

Workspace.prototype.init = function () {
    this.setSize(500, 500);
    this.initLayer()
};

Workspace.prototype.initLayer = function () {
    var self = this;
    this.$layer[0].addEventListener('mousemove', function (evt) {
        var layerPos = this.getBoundingClientRect();
        var mousePos = {
            x: evt.clientX - layerPos.left,
            y: evt.clientY - layerPos.top
        };

        var rectSize = {
            width: self._size.width * self._zoom,
            height: self._size.height * self._zoom
        };

        var ctx = this.getContext("2d");
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.beginPath();
        ctx.rect(mousePos.x - rectSize.width / 2, mousePos.y - rectSize.height / 2, rectSize.width, rectSize.height);
        ctx.stroke();
        ctx.closePath();
    }, false);
};


Workspace.prototype.setSize = function (width, height) {
    [this.$canvas, this.$layer].forEach(function ($c) {
        $c[0].width = width;
        $c[0].height = height
    });
    this._size = {
        width: width,
        height: height
    };
};

Workspace.prototype.setImage = function (url) {
    var img = new Image();
    img.onload = () => {
        var c = this.$canvas[0];
        var ctx = c.getContext("2d");
        this.setSize(img.width, img.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = url;
};


$(document).ready(function () {


    var workspace = new Workspace('workspace');

    $('#file-selector').on('change', function (e) {
        var file = (e.dataTransfer ? e.dataTransfer.files : e.target.files)[0];

        var originSrc = window.URL.createObjectURL(file);

        workspace.setImage(originSrc);

        //$('#img-preview').attr('src', originSrc);
        //
        //var img = new Image();
        //img.onload = function () {
        //    var c = canvas[0];
        //    var ctx = c.getContext("2d");
        //    c.width = img.width;
        //    c.height = img.height;
        //    ctx.drawImage(img, 0, 0);
        //};
        //img.src = originSrc;
        //
        //console.log(file)
    })
});
