"use strict";

var Zoomage = function (id, onNewGif) {
    this._id = id.charAt(0) === '#' ? id : '#' + id;
    this._size = {
        width: 0,
        height: 0
    };
    this._mousePos = null;
    this._zoom = 0.8;
    this._images = [];
    this._frameIndex = 0;

    this._gif = null;
    this._gifDataUrl = null;
    this._onGif = onNewGif;

    this.$div = $(this._id);
    this.$canvas = $('<canvas></canvas>');
    this.$layer = $('<canvas class="layer"></canvas>');
    this.$images = $('<ul class="images-container"></ul>');

    this.init();
};

Zoomage.prototype.init = function () {

    var $canvasContainer = $('<div class="canvas-container"></div>');
    $canvasContainer.append(this.$canvas);
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

    var rect = this.getRectLayer();

    var c = this.$layer[0];
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.stroke();
    ctx.closePath();
};


Zoomage.prototype.getRectLayer = function () {
    var rectSize = {
        width: this._size.width * this._zoom,
        height: this._size.height * this._zoom
    };
    var rect = {
        x: this._mousePos.x - rectSize.width / 2,
        y: this._mousePos.y - rectSize.height / 2,
        width: rectSize.width,
        height: rectSize.height
    };

    if (rect.x < 0)
        rect.x = 0;
    if (rect.y < 0)
        rect.y = 0;
    if (rect.x + rect.width >= this._size.width)
        rect.x = this._size.width - rect.width;
    if (rect.y + rect.height >= this._size.height)
        rect.y = this._size.height - rect.height;

    return rect
};

Zoomage.prototype.renderGif = function () {
    if (this._images.length <= 1)
        return;

    var self = this;
    if (this._gif)
        this._gif.abort();

    this._gif = new GIF({
        workers: 5,
        quality: 10,
        workerScript: './lib/gif.worker.js',
        background: '#ffffff'
        //transparent: true
    });

    this._images.forEach(function (image) {
        if (image && image.img) {
            var buffer = document.createElement("canvas");
            buffer.width = self._size.width;
            buffer.height = self._size.height;
            var bufferCtx = buffer.getContext("2d");
            bufferCtx.drawImage(image.img, 0, 0, self._size.width, self._size.height);
            self._gif.addFrame(buffer);
        }
    });

    this._gif.on('finished', function (blob) {
        self._gifDataUrl = window.URL.createObjectURL(blob);
        if (self._onGif)
            self._onGif(self._gifDataUrl)
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
    var cropRect = this.getRectLayer();
    var imgData = ctx.getImageData(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

    var buffer = document.createElement("canvas");
    buffer.width = cropRect.width;
    buffer.height = cropRect.height;
    var bufferCtx = buffer.getContext("2d");
    bufferCtx.putImageData(imgData, 0, 0);

    this.pushFrame(buffer.toDataURL("image/png"), this._size)
};

Zoomage.prototype.pushFrame = function (dataUrl, size) {

    var self = this;
    var key = this._frameIndex++;

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


        var $li = $('<li></li>').data('frame-key', key);
        var $image = $('<img/>').attr('src', dataUrl);
        $li.html($image);
        $li.on('click', function () {
            self.removeFrame(key);
            $(this).remove()
        });

        self._images.push({
            key: key,
            img: img
        });
        self.$images.append($li);
        self.renderGif()
    };
    img.src = dataUrl;
};

Zoomage.prototype.removeFrame = function (key) {
    var index = this._images.findIndex(function (image) {
        return image.key === key
    });
    if (index >= 0) {
        this._images.splice(index, 1);
        this.renderGif()
    }
};


Zoomage.prototype.setImage = function (dataUrl) {
    this._images = [];
    this.$images.empty();
    if (this._onGif)
        this._onGif('');

    var self = this;
    var img = new Image();


    var maxWidth = $(document).width() - 50;
    var maxHeight = $(document).height() - 50;

    if (maxWidth > 500)
        maxWidth = 500;
    if (maxHeight > 500)
        maxHeight = 500;

    img.onload = function () {
        var coef = 1;
        if (img.width > maxWidth)
            coef = (maxWidth / img.width) < coef ? (maxWidth / img.width) : coef;
        if (img.height > maxHeight)
            coef = (maxHeight / img.height) < coef ? (maxHeight / img.height) : coef;

        self.pushFrame(dataUrl, {
            width: img.width * coef,
            height: img.height * coef
        })
    };
    img.src = dataUrl;
};
