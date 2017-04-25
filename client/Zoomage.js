"use strict";

var Zoomage = function (id, onNewGif) {

    if (!window.jQuery)
        throw new Error('Jquery is required');

    this._id = id.charAt(0) === '#' ? id : '#' + id;
    this._size = {
        width: 0,
        height: 0
    };
    this._mousePos = null;
    this._zoom = 0.8;
    this._images = [];
    this._frameIndex = 0;
    this._gifDelay = 300;
    this._originImg = null;

    this._maxWidth = 500;
    this._maxHeight = 500;

    this._gif = null;
    this._gifDataUrl = null;
    this._onGif = onNewGif;

    this.$div = $(this._id).addClass('zoomage-container');
    this.$canvas = $('<canvas></canvas>');
    this.$layer = $('<canvas class="layer"></canvas>');
    this.$speedSlider = $('<input type="range" class="slider delay-slider" min="-500" max="-100" step="10">').attr('value', -this._gifDelay);
    this.$zoomSlider = $('<input type="range" class="slider zoom-slider vertical" min="0.05" max="0.9" step="0.1">').attr('value', this._zoom);
    this.$images = $('<ul class="images-container"></ul>');

    this.init();
};

Zoomage.prototype.init = function () {

    var self = this;
    var maxSize = this.getMaxSize();

    this.$speedSlider.on('change', function (e) {
        self.setGifDelay(Math.abs(e.target.value))
    });
    this.$zoomSlider.on('input', function (e) {
        self.setZoom(Math.abs(e.target.value))
    });

    var $canvasContainer = $('<div class="canvas-container"></div>');
    var $layerContainer = $('<div class="layer-container"></div>');
    $layerContainer.append(this.$layer);
    $layerContainer.append(this.$zoomSlider);

    $canvasContainer.append(this.$canvas);
    $canvasContainer.append($layerContainer);
    this.$div.append($canvasContainer);
    this.$div.append(this.$images);
    this.$div.append(this.$speedSlider);

    this.setSize(maxSize.width, maxSize.height);
    this.initLayer()
};

Zoomage.prototype.setGifDelay = function (delay) {
    this._gifDelay = delay;
    this.renderGif()
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

    // IF scroll zoom
    //c.addEventListener("mousewheel", MouseWheelHandler, false); // IE9, Chrome, Safari, Opera
    //c.addEventListener("DOMMouseScroll", MouseWheelHandler, false); // Firefox
    //function MouseWheelHandler(e) {
    //    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) / 20;
    //    var zoom = self._zoom - delta;
    //    if (zoom > 0 && zoom < 1)
    //        self.setZoom(zoom);
    //}
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
    if (this._images.length <= 1) {
        if (this._onGif)
            this._onGif('');
        return;
    }

    var self = this;
    if (this._gif)
        this._gif.abort();

    this._gif = new GIF({
        workers: 5,
        quality: 10,
        workerScript: './lib/gifjs/gif.worker.js',
        background: '#ffffff'
    });

    this._images.forEach(function (image) {
        if (image && image.img) {
            self._gif.addFrame(image.img, {delay: self._gifDelay});
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

    this.$speedSlider.css('width', width - 50);
    var zoomSliderWidth = height - 50;
    this.$zoomSlider.css('width', zoomSliderWidth);
    this.$zoomSlider.css('top', (zoomSliderWidth / 2) + 25);
    this.$zoomSlider.css('left', (-zoomSliderWidth / 2) + width + 25);
};

Zoomage.prototype.setZoom = function (zoom) {
    this._zoom = zoom;
    this.renderLayer()
};

Zoomage.prototype.crop = function () {
    if (this._originImg === null)
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

        ctx.fillStyle = "white"; //white backgroud
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.drawImage(img, 0, 0, size.width, size.height);

        var $li = $('<li></li>').data('frame-key', key);
        var $image = $('<img/>').attr('src', c.toDataURL("image/png"));
        $li.html($image);
        $li.on('click', function () {
            self.removeFrame(key);
            $(this).remove()
        });

        self._images.push({
            key: key,
            img: ctx.getImageData(0, 0, size.width, size.height)
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

Zoomage.prototype.getMaxSize = function (margin) {
    margin = margin >= 0 ? margin : 50;
    var maxWidth = $(document).width() - margin;
    var maxHeight = $(document).height() - margin;
    if (maxWidth > this._maxWidth)
        maxWidth = this._maxWidth;
    if (maxHeight > this._maxHeight)
        maxHeight = this._maxHeight;
    return {
        width: maxWidth,
        height: maxHeight
    }
};

Zoomage.prototype.setImage = function (dataUrl) {
    this._images = [];
    this.$images.empty();
    this._originImg = dataUrl;

    if (this._onGif)
        this._onGif('');

    var self = this;
    var img = new Image();

    var maxSize = this.getMaxSize();

    img.onload = function () {
        var coef = 1;
        if (img.width > maxSize.width)
            coef = (maxSize.width / img.width) < coef ? (maxSize.width / img.width) : coef;
        if (img.height > maxSize.height)
            coef = (maxSize.height / img.height) < coef ? (maxSize.height / img.height) : coef;


        self.pushFrame(dataUrl, {
            width: img.width * coef,
            height: img.height * coef
        })
    };
    img.src = dataUrl;
};
