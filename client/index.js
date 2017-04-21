"use strict";

var Workspace = function (id) {
    this._id = id.charAt(0) === '#' ? id : '#' + id;
    this._size = {
        width: 0,
        height: 0
    };
    this._mousePos = null;
    this._zoom = 0.8;
    this._images = [];

    this.$div = $(this._id);
    this.$canvas = $('<canvas></canvas>');
    this.$layer = $('<canvas class="layer"></canvas>');
    this.$images = $('<ul class="images-container"></ul>');

    this.init();
};

Workspace.prototype.init = function () {

    var $canvasContainer = $('<div></div>').css('position', 'relative');
    $canvasContainer.append(this.$canvas);

    this.$layer.css('position', 'absolute');
    this.$layer.css('top', 0);
    this.$layer.css('left', 0);

    $canvasContainer.append(this.$layer);

    this.$div.append($canvasContainer);
    this.$div.append(this.$images);

    this.setSize(500, 500);
    this.initLayer()
};

Workspace.prototype.initLayer = function () {
    var self = this;
    var c = this.$layer[0];

    c.addEventListener('mousemove', function (evt) {
        var layerPos = this.getBoundingClientRect();
        self._mousePos = {
            x: evt.clientX - layerPos.left,
            y: evt.clientY - layerPos.top
        };
        self.renderLayer()
    }, false);

    c.addEventListener("click", this.crop.bind(this), false);
    c.addEventListener("mousewheel", MouseWheelHandler, false); // IE9, Chrome, Safari, Opera
    c.addEventListener("DOMMouseScroll", MouseWheelHandler, false); // Firefox

    function MouseWheelHandler(e) {
        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) / 20;
        var zoom = self._zoom - delta;
        if (zoom > 0 && zoom < 1)
            self.setZoom(zoom);
    }
};

Workspace.prototype.crop = function () {
    if (this._images.length === 0)
        return;
    var c = this.$canvas[0];
    var ctx = c.getContext("2d");
    var rectSize = {
        width: this._size.width * this._zoom,
        height: this._size.height * this._zoom
    };


    var imgData = ctx.getImageData(this._mousePos.x - rectSize.width / 2, this._mousePos.y - rectSize.height / 2, rectSize.width, rectSize.height);

    var buffer = document.createElement("canvas");
    buffer.width = rectSize.width;
    buffer.height = rectSize.height;
    var bufferCtx = buffer.getContext("2d");
    bufferCtx.putImageData(imgData, 0, 0);

    this.pushImage(buffer.toDataURL("image/png"), this._size)
};

Workspace.prototype.renderLayer = function () {
    var rectSize = {
        width: this._size.width * this._zoom,
        height: this._size.height * this._zoom
    };
    var c = this.$layer[0];
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.beginPath();
    ctx.rect(this._mousePos.x - rectSize.width / 2, this._mousePos.y - rectSize.height / 2, rectSize.width, rectSize.height);
    ctx.stroke();
    ctx.closePath();
};

Workspace.prototype.renderGif = function () {
    if (this._images.length <= 1)
        return;

    var self = this;
    var gif = new GIF({
        workers: 2,
        quality: 10
    });

    this._images.forEach(function (img) {
        var buffer = document.createElement("canvas");
        buffer.width = self._size.width;
        buffer.height = self._size.height;
        var bufferCtx = buffer.getContext("2d");
        bufferCtx.drawImage(img, 0, 0, self._size.width, self._size.height);
        gif.addFrame(buffer);
    });

    gif.on('finished', function (blob) {
        $('#gif-result').attr('src', window.URL.createObjectURL(blob))
    });
    gif.render();
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

    if (!this._mousePos)
        this._mousePos = {
            x: width / 2,
            y: height / 2
        };
};

Workspace.prototype.setZoom = function (zoom) {
    this._zoom = zoom;
    this.renderLayer()
};

Workspace.prototype.pushImage = function (url, size) {

    var self = this;
    var c = this.$canvas[0];
    var ctx = c.getContext("2d");

    var img = new Image();
    img.onload = function () {
        size = size || {
                width: img.width,
                height: img.height
            };
        self.setSize(size.width, size.height);
        ctx.drawImage(img, 0, 0, size.width, size.height);
    };
    img.src = url;

    this._images.push(img);

    var $li = $('<li></li>');
    var $image = $('<img/>').attr('src', url);
    $li.html($image);
    this.$images.append($li);

    this.renderGif()
};

Workspace.prototype.setImage = function (url, size) {
    this._images = [];
    this.pushImage(url, size)
};

$(document).ready(function () {
    var workspace = new Workspace('workspace');

    $('#file-selector').on('change', function (e) {
        var file = (e.dataTransfer ? e.dataTransfer.files : e.target.files)[0];
        var originSrc = window.URL.createObjectURL(file);
        workspace.setImage(originSrc);
    })
});
