"use strict";

var Zoomage = function (id) {
    this._id = id.charAt(0) === '#' ? id : '#' + id;
    this._size = {
        width: 0,
        height: 0
    };
    this._mousePos = null;
    this._zoom = 0.8;
    this._images = [];
    this._gif = null;

    this.$div = $(this._id);
    this.$canvas = $('<canvas></canvas>');
    this.$layer = $('<canvas class="layer"></canvas>');
    this.$images = $('<ul class="images-container"></ul>');

    this.init();
};

Zoomage.prototype.init = function () {

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

Zoomage.prototype.initLayer = function () {
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


Zoomage.prototype.renderLayer = function () {
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

Zoomage.prototype.renderGif = function () {
    if (this._images.length <= 1)
        return;

    var self = this;

    if (this._gif)
        this._gif.abort();

    this._gif = new GIF({
        workers: 2,
        quality: 10
    });

    this._images.forEach(function (img) {
        var buffer = document.createElement("canvas");
        buffer.width = self._size.width;
        buffer.height = self._size.height;
        var bufferCtx = buffer.getContext("2d");
        bufferCtx.drawImage(img, 0, 0, self._size.width, self._size.height);
        self._gif.addFrame(buffer);
    });

    this._gif.on('finished', function (blob) {
        $('#gif-result').attr('src', window.URL.createObjectURL(blob))
    });
    this._gif.render();
};


Zoomage.prototype.setSize = function (width, height) {
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

Zoomage.prototype.setZoom = function (zoom) {
    this._zoom = zoom;
    this.renderLayer()
};

Zoomage.prototype.crop = function () {
    if (this._images.length === 0)
        return;

    var c = this.$canvas[0];
    var ctx = c.getContext("2d");
    var rectSize = {
        width: this._size.width * this._zoom,
        height: this._size.height * this._zoom
    };

    var cropRect = {
        x: this._mousePos.x - rectSize.width / 2,
        y: this._mousePos.y - rectSize.height / 2,
        width: rectSize.width,
        height: rectSize.height
    };

    var imgData = ctx.getImageData(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

    var buffer = document.createElement("canvas");
    buffer.width = rectSize.width;
    buffer.height = rectSize.height;
    var bufferCtx = buffer.getContext("2d");
    bufferCtx.putImageData(imgData, 0, 0);

    this.pushImage(buffer.toDataURL("image/png"), this._size)
};

Zoomage.prototype.pushImage = function (dataUrl, size) {

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
    img.src = dataUrl;

    this._images.push(img);

    var $li = $('<li></li>');
    var $image = $('<img/>').attr('src', dataUrl);
    $li.html($image);
    this.$images.append($li);

    this.renderGif()
};

Zoomage.prototype.setImage = function (dataUrl) {
    this._images = [];
    var self = this;
    var img = new Image();

    var maxWidth = $(window).width();
    var maxHeight = $(window).height();

    img.onload = function () {

        var coef = 1;
        if (img.width > maxWidth)
            coef = (maxWidth / img.width) < coef ? (maxWidth / img.width) : coef;
        if (img.height > maxHeight)
            coef = (maxHeight / img.height) < coef ? (maxHeight / img.height) : coef;

        self.pushImage(dataUrl, {
            width: img.width * coef,
            height: img.height * coef
        })
    };
    img.src = dataUrl;


};
