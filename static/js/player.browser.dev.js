function regexEscape(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function getQueryParams() {
    var reqStr = window.location.search.substring(1);

    if ('' === reqStr) {
        return {};
    }

    var reqStrEncUri = encodeURI(reqStr);
    var reqStrDecUriComp = decodeURIComponent(reqStr);
    var params = {};
    var result = {};
    var reqStrContainsUrl = false;
    var containedUrlIsEncoded = false;
    var containedUrlHasParams = false;

    if (reqStrDecUriComp.indexOf('http://') != -1 || reqStrDecUriComp.indexOf('https://') != -1) {
        reqStrContainsUrl = true;

        if (reqStrDecUriComp.indexOf('?') != -1) {
            containedUrlHasParams = true;
        }

        if (reqStrEncUri.indexOf('http%253A%252F%252F') != -1 || reqStrEncUri.indexOf('https%253A%252F%252F') != -1) {
            containedUrlIsEncoded = true;
        }
    }

    if (!!containedUrlHasParams) {
        if (containedUrlIsEncoded) {
            params = reqStrEncUri.split('&');
        }
        else {
            params = encodeURIComponent(reqStr).split('%26');
        }
    }
    else {
        params = reqStrDecUriComp.split('&');
    }

    if (params.length) {
        for (var c, c = 0; c < params.length; c++) {
            var param = params[c];
            var d = param.split('=');
            var key = decodeURIComponent(d[0]);
            var val = d[1];

            if ('undefined' !== typeof val) {
            } else {
                d = param.split('%3D');
                key = decodeURIComponent(d[0]);
                val = d[1];
            }

            if (val.indexOf('http%253A%252F%252F') != -1 || val.indexOf('https%253A%252F%252F') != -1) {
                val = decodeURIComponent(val);
            }
            val = decodeURIComponent(val);

            if (!!containedUrlHasParams && !containedUrlIsEncoded && val.indexOf('?') != -1) {
                var regex = new RegExp("" + regexEscape(val) + "=(\\w+)&");
                var res = regex.exec(reqStr);
                if (!!res && res.length) {
                    val += '=' + res[1];
                }
            }

            result[key] = val;
        }
    }

    return result;
}

function getMimeType(str) {
    if (str.indexOf('.mp4') != -1) {
        return 1;
    }
    else if (str.indexOf('.m3u8') != -1) {
        return 2;
    }
    else {
        return 0;
    }
}

function setFullscreenStyles() {
    var css = document.getElementById('baseCss');
    css.textContent = css.textContent + '#player,.video-js{position:absolute;width:100%;height:100%;top:0;left:0;}' +
        '#header{display:none;}';
}

function createVideoElem(srcUrl, autostart, fullscreen) {
    var vidElem = document.createElement('video')
      , srcElem = document.createElement('source')
      , mimeType = getMimeType(srcUrl);

    if (mimeType === 0) {
        alert('Filetype not supported!')
        return false;
    }
    else if (mimeType === 1) {
        mimeType = 'video/mp4';
    }
    else if (mimeType === 2) {
        mimeType = 'application/vnd.apple.mpegurl';
        /*
         * For m3u8, the mime type is 'application/vnd.apple.mpegurl'
         * (https://tools.ietf.org/html/draft-pantos-http-live-streaming-19#section-10).
         * However, Firefox accepts 'application/x-mpegurl' as HLS too
         * (https://bugzilla.mozilla.org/show_bug.cgi?id=1272142#c1).
         */
        var srcAltElem = srcElem.cloneNode();
        srcAltElem.src = srcUrl;
        srcAltElem.type = 'application/x-mpegURL';
    }

    if (!!fullscreen) {
        setFullscreenStyles();
        vidElem.width = '100%';
        vidElem.height = '100%';
    }
    else {
        vidElem.width = '640';
        vidElem.height = '480';
    }

    if (!!autostart) {
        vidElem.autoplay = 1;
        vidElem.autostart = 1; // Note: Some version of Chrome only acknowledge autostart, rather than autoplay
    }
    else {
        vidElem.preload = ''; // set preload to 'auto' if autoplay is not set.
    }

    srcElem.src = srcUrl;
    srcElem.type = mimeType;

    vidElem.controls = 1;
    vidElem.className = 'video-js';
    vidElem.setAttribute('data-setup', '{}');
    vidElem.appendChild(srcElem);

    !!srcAltElem && vidElem.appendChild(srcAltElem);
    document.getElementById('player').appendChild(vidElem);
};

window.onload = function () {
    var queryParams = getQueryParams()
      , videoSource = ('undefined' !== typeof queryParams.video) ? encodeURI(queryParams.video) : false
      , autostart = ('undefined' !== typeof queryParams.autostart) ? true : false
      , fullscreen = ('undefined' !== typeof queryParams.fullscreen) ? true : false;

    console.log('Request params:');
    console.dir(queryParams);
    if (!!videoSource && '' !== videoSource) {
        createVideoElem(videoSource, autostart, fullscreen);
    }
    else {
        var demoUrl = document.location.protocol + '//' + document.location.hostname + document.location.pathname + '?video=http://commondatastorage.googleapis.com/gtv-videos-bucket/big_buck_bunny_1080p.mp4';
        alert('You must specify a video source.\n\rAppend "?video=http://example.com/playlist.m3u8" for playlist or "?video=http://example.com/video.mp4" * for video files to the current URL. E.g.:\r\n\r\n' + demoUrl);
        document.location.href = demoUrl;
    }
};
