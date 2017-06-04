/**
 * global variables
 */
var timer = null,
    session = null,
    progressFlag = 1,
    currentMedia = null,
    currentMediaURL = null,
    currentMediaTime = 0,
    currentVolume = 1,
    currentPlaylist = null,
    currentPlaylistItem = null;

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

        if (reqStrEncUri.indexOf('http%253A%252F%252F') != -1 || reqStrEncUri.indexOf(
                'https%253A%252F%252F') != -1) {
            containedUrlIsEncoded = true;
        }
    }

    if (!!containedUrlHasParams) {
        if (containedUrlIsEncoded) {
            params = reqStrEncUri.split('&');
        } else {
            params = encodeURIComponent(reqStr).split('%26');
        }
    } else {
        params = reqStrDecUriComp.split('&');
    }

    if (params.length) {
        for (var c, c = 0; c < params.length; c++) {
            var param = params[c];
            var d = param.split('=');
            var key = decodeURIComponent(d[0]);
            var val = d[1];

            if ('undefined' !== typeof val) {} else {
                d = param.split('%3D');
                key = decodeURIComponent(d[0]);
                val = d[1];
            }

            if (val.indexOf('http%253A%252F%252F') != -1 || val.indexOf('https%253A%252F%252F') !=
                -1) {
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

/**
 * Call initialization
 */
if (!chrome.cast || !chrome.cast.isAvailable) {
    setTimeout(initializeCastApi, 1000);
}

/**
 * initialization
 */
function initializeCastApi() {
    // default app ID to the default media receiver app
    // optional: you may change it to your own app ID/receiver
    var applicationID = "AC2C6EBA",
        sessionRequest = new chrome.cast.SessionRequest(applicationID),
        apiConfig = new chrome.cast.ApiConfig(sessionRequest, sessionListener, receiverListener);

    chrome.cast.initialize(apiConfig, onInitSuccess, onError);
};

/**
 * initialization success callback
 */
function onInitSuccess() {
    console.log("init success");
}

/**
 * initialization error callback
 */
function onError() {
    console.log("error");
}

/**
 * generic success callback
 */
function onSuccess(message) {
    console.log(message);
}

/**
 * callback on success for stopping app
 */
function onStopAppSuccess() {
    console.log('Session stopped');

    //document.getElementById("casticon").src = 'images/cast_icon_idle.png';
}

/**
 * session listener during initialization
 */
function sessionListener(e) {
    session = e;
    console.log('New session ID: ' + session.sessionId);

    if (session.media.length != 0) {
        console.log('Found ' + session.media.length + ' existing media sessions.');
        onMediaDiscovered('sessionListener', session.media[0]);
        loadSessionVolume();
        !!session.media[0].media.contentId && (setStreamUrl(session.media[0].media.contentId));
        //console.dir(session);
    }

    session.addMediaListener(onMediaDiscovered.bind(this, 'addMediaListener'));
    session.addUpdateListener(sessionUpdateListener.bind(this));
}

/**
 * session update listener
 */
function sessionUpdateListener(isAlive) {
    var message = isAlive ? 'Session Updated' : 'Session Removed';
    message += ': ' + session.sessionId;

    console.log(message);

    if (!isAlive) {
        session = null;
        //document.getElementById("casticon").src = 'images/cast_icon_idle.png';
        var playpauseresume = document.getElementById("playpauseresume");
        playpauseresume.innerHTML = 'Play';

        if (!!timer) {
            clearInterval(timer);
        } else {
            timer = setInterval(updateCurrentTime.bind(this), 1000);
            playpauseresume.innerHTML = 'Pause';
        }
    }
};

/**
 * receiver listener during initialization
 */
function receiverListener(e) {
    if (e === 'available') {
        console.log("receiver found");
    } else {
        console.log("receiver list empty");
    }
}

/**
 * enter a media URL
 * @param {string} m An media URL
 */
function setMyMediaURL(e) {
    if (!!e.value) {
        currentMediaURL = e.value;
    }
}

/**
 * launch app and request session
 */
function launchApp() {
    console.log("launching app...");
    chrome.cast.requestSession(onRequestSessionSuccess, onLaunchError);

    if (!!timer) {
        clearInterval(timer);
    }
}

/**
 * callback on success for requestSession call
 * @param {Object} e A non-null new session.
 */
function onRequestSessionSuccess(e) {
    console.log("session success: " + e.sessionId);
    session = e;

    //document.getElementById("casticon").src = 'images/cast_icon_active.png';
    session.addUpdateListener(sessionUpdateListener.bind(this));

    if (session.media.length != 0) {
        onMediaDiscovered('onRequestSession', session.media[0]);
    }

    session.addMediaListener(onMediaDiscovered.bind(this, 'addMediaListener'));
    session.addUpdateListener(sessionUpdateListener.bind(this));
}

/**
 * callback on launch error
 */
function onLaunchError() {
    console.log("launch error");
}

/**
 * stop app/session
 */
function stopApp() {
    session.stop(onStopAppSuccess, onError);

    if (!!timer) {
        clearInterval(timer);
    }
}

/**
 * load media specified by custom URL
 */
function loadCustomMedia() {
    var customMediaURL = document.getElementById('networkStreamUrl').value,
        customMediaMime = document.getElementById('mediaMimeType').value;

    if (customMediaURL.length > 0) {
        loadMediaPwnt(customMediaURL, customMediaMime);
    }
}

/**
 * load media specified by custom URL
 */
function playCustomMedia() {
    var customMediaURL = document.getElementById('networkStreamUrl').value;

    if (customMediaURL.length > 0) {
        document.location.href = 'player.html?fullscreen=1&autostart=1&video=' + customMediaURL;
    }
}

/**
 * toggle visibility of IPTV channels
 */
function toggleChannels() {
    document.getElementById('iptv-list').style.display = ('none' == document.getElementById(
        'iptv-list').style.display) ? 'block' : 'none';

    return false;
}

/**
 * load predefined live stream URL
 */
function setLivestream(streamId) {
    var streamUrls = [
            'http://livestreams.br.de/i/bralpha_germany@119899/index_3776_av-p.m3u8?sd=10&rebase=on', // ARD Alpha
            'https://artelive-lh.akamaihd.net/i/artelive_de@393591/index_1_av-p.m3u8?sd=10&rebase=on', // Arte (DE)
            'https://artelive-lh.akamaihd.net/i/artelive_fr@344805/index_1_av-p.m3u8?sd=10&rebase=on', // Arte (FR)
            'http://livestreams.br.de/i/bfsnord_germany@119898/index_3776_av-p.m3u8?sd=10&rebase=on', // BR (Nord)
            'http://livestreams.br.de/i/bfssued_germany@119890/index_3776_av-p.m3u8?sd=10&rebase=on', // BR (Sued)
            'http://live-lh.daserste.de/i/daserste_de@91204/index_2692_av-p.m3u8?sd=10&rebase=on', // Das Erste
            'http://dwstream72-lh.akamaihd.net/i/dwstream72_live@123556/index_1_av-p.m3u8?sd=10&rebase=on', // Deutsche Welle
            'http://livestream-1.hr.de/i/hr_fernsehen@75910/index_3584_av-p.m3u8?sd=10&rebase=on', // HR
            'https://kikade-lh.akamaihd.net/i/livetvkika_de@450035/index_3776_av-p.m3u8?sd=10&rebase=on', // KIKA
            'http://livetvsachsen.mdr.de/i/livetvmdrsachsen_de@106902/index_3871_av-p.m3u8?sd=10&rebase=on', // MDR (Sachsen)
            'http://livetvsachsenanhalt.mdr.de/i/livetvmdrsachsenanhalt_de@106901/index_3776_av-p.m3u8?sd=10&rebase=on', // MDR (Sachsen-Anhalt)
            'http://livetvthueringen.mdr.de/i/livetvmdrthueringen_de@106903/index_3776_av-p.m3u8?sd=10&rebase=on', // MDR (Thueringen)
            'http://ndrfs.ndr.de/i/ndrfs_hh@119223/index_3776_av-p.m3u8?sd=10&rebase=on', // NDR (Hamburg)
            'http://ndrfs.ndr.de/i/ndrfs_mv@119226/index_3776_av-p.m3u8?sd=10&rebase=on', // NDR (Mecklenburg-Vorpommern)
            'http://ndrfs.ndr.de/i/ndrfs_nds@119224/index_3776_av-p.m3u8?sd=10&rebase=on', // NDR (Niedersachsen)
            'http://ndrfs.ndr.de/i/ndrfs_sh@119225/index_3776_av-p.m3u8?sd=10&rebase=on', // NDR (Schleswig-Holstein)
            'http://onelivestream.wdr.de/i/wdr_einsfestival@328300/index_7_av-p.m3u8?sd=10&rebase=on', // ONE
            'https://zdf0910-lh.akamaihd.net/i/de09_v1@392871/index_1496_av-p.m3u8?sd=10&rebase=on', // Phoenix
            'http://ran01de-live.hls.adaptive.level3.net/sevenone/ran01de/wifi2500.m3u8', // Ran.de, event kanal (master.m3u8 = ipad.m3u8)
            'http://ran03dach-live.hls.adaptive.level3.net/sevenone/ran03dach/wifi2500.m3u8', // Ran.de, event kanal 2 (master.m3u8 = ipad.m3u8)
            'http://rbblive-lh.akamaihd.net/i/rbb_berlin@144674/index_7_av-p.m3u8?sd=10&rebase=on', // RBB (Berlin)
            'http://rbblive-lh.akamaihd.net/i/rbb_brandenburg@349369/index_7_av-p.m3u8?sd=10&rebase=on', // RBB (Brandenburg)
            'http://fs.live.sr.de/i/sr_universal02@107595/index_1662_av-p.m3u8?sd=10&rebase=on', // SR
            'http://swrbw-lh.akamaihd.net/i/swrbw_live@196738/index_3584_av-p.m3u8?sd=10&rebase=on', // SWR (Baden-Wuerttemberg)
            'http://swrrp-lh.akamaihd.net/i/swrrp_live@196739/index_3584_av-p.m3u8?sd=10&rebase=on', // SWR (Rheinland-Pfalz)
            'http://tagesschau-lh.akamaihd.net/i/tagesschau_1@119231/index_3776_av-p.m3u8?sd=10&rebase=on', // Tagesschau24
            'http://tvstreamgeo.wdr.de/i/wdrfs_geogeblockt@112044/index_3776_av-p.m3u8?sd=10&rebase=on', // WDR
            'https://zdf1314-lh.akamaihd.net/i/de14_v1@392878/index_3096_av-p.m3u8?sd=10&rebase=on&id=', // ZDF
            'https://zdf1112-lh.akamaihd.net/i/de12_v1@392882/index_3096_av-p.m3u8?sd=10&rebase=on&id=', // ZDF.info
            'https://zdf1314-lh.akamaihd.net/i/de13_v1@392877/index_3096_av-p.m3u8?sd=10&rebase=on&id=', // ZDF.neo
            'https://zdf0910-lh.akamaihd.net/i/dach10_v1@392872/index_1496_av-p.m3u8?sd=10&rebase=on&id=' // 3SAT
        ],
        streamUrl = streamUrls[streamId];

    if (!!streamUrl) {
        setStreamUrl(streamUrl);
    }

    return false;
}

/**
 * set the value of the media URL's input field to the given string value
 * also, set the appropriated mime type for the given media file
 */
function setStreamUrl(url) {
    if (!!url) {
        document.getElementById('networkStreamUrl').value = url;
        guessMimeType(url);
    }

    return;
}

function setStreamOnPlaylistClick(target) {
    console.dir(target);
    setStreamUrl(target.getAttribute('data-url'));
    return false;
}

/**
 * get the filename segment from a URL
 */
function getMediaFilename(url) {
    var arr = url.split('/')

    return arr.pop();
}

/**
 * create a playlist from URL request parameter 'urls'
 * parameter value is expected to be a list of media URLs, separated by ';' - e.g.:
 * /?urls=http://domain.com/video-1.mp4;http://domain.com/video-2.mp4;http://domain.com/video-3.mp4
 */
function createVideoPlaylist(videos) {
    var vids = videos.split(';'),
        urls = [];

    for (var i, i = 0; i < vids.length; i++) {
        var vid = vids[i];
        if (!!isMediaUrl(vid)) {
            urls.push(vid);
        }
    }

    if (urls.length) {
        currentPlaylist = urls;
        currentPlaylistItem = 0;

        var playlistElem = document.getElementById('playlist');
        document.getElementById('playlist-wrapper').style.display = 'block';

        for (var i, i = 0; i < urls.length; i++) {
            var url = urls[i],
                itemElem = document.createElement('li'),
                linkElem = document.createElement('a'),
                copyLink = document.createElement('a');

            linkElem.textContent = getMediaFilename(url);
            linkElem.href = '#';
            linkElem.className = 'playlist-item';
            linkElem.setAttribute('data-url', url.replace('storage.google',
                'storage-download.google'));
            linkElem.setAttribute('onclick', "setStreamOnPlaylistClick(this);");
            linkElem.addEventListener('click', function(e) {
                console.dir(
                    'linkElem.evtHandler.onClick: starting user-defined evt handling..'
                );
                console.dir(e);
                e.preventDefault();
                console.dir('linkElem.evtHandler.onClick: preventing default action..');
                console.dir(e);
                e.stopPropagation();
                console.dir(
                    'linkElem.evtHandler.onClick: stopping further propagation of this event..'
                );
                console.dir(e);

                console.dir('linkElem.evtHandler.onClick: now calling custom action..');
                setStreamUrl(this.getAttribute('data-url'));
                console.dir('linkElem.evtHandler.onClick: called stopPropagation()');
                console.dir(e);

                return false;
            });
            /*linkElem.onclick = function(e) {
                e.preventDefault();
                alert(this.getAttribute('data-url'));
            };*/

            copyLink.className = 'browser-link';
            copyLink.href = String([
                window.location.protocol + '//',
                window.location.hostname,
                window.location.pathname, ("player.html?fullscreen=1&video=" + url.replace(
                    "?_=1", ""))
            ].join(""));
            copyLink.target = '_blank';
            copyLink.textContent = "[Play in browser]";
            /*copyLink.addEventListener('click', function(e) {
                console.dir(
                    'linkElem.evtHandler.onClick: starting user-defined evt handling..'
                );
                console.dir(e);
                e.stopImmediatePropagation();
                //e.preventDefault();
                //alert('abc');
                return false;
            });*/

            itemElem.appendChild(linkElem);
            itemElem.innerHTML += "<br> <span> - </span>";
            itemElem.appendChild(copyLink);
            playlistElem.appendChild(itemElem);
        }
    }

    return;
}

/**
 * if defined, highlight current playlist item
 */
function setPlaylistCurrentItem(active) {
    //if (!!currentPlaylist && !!currentPlaylistItem) {
    var a = document.querySelectorAll('.playlist-item');

    for (var i, i = 0; i < a.length; i++) {
        var item = a[i],
            itemUrl = item.getAttribute('data-url'),
            li = item.parentNode;

        if (!active && li.childNodes.length == 2) {
            li.removeChild(li.childNodes[1]);
        } else {
            if (!!session && !!session.media[0] && itemUrl == session.media[0].media.contentId && -
                1 == li.innerHTML.indexOf('[CURRENTLY PLAYING]')) {
                var info = document.createElement('code');
                info.textContent = ' [CURRENTLY PLAYING]';
                li.appendChild(info);
                currentPlaylistItem = i;
                //break;
            }
        }
    }
    //}

    return;
}

/**
 * check whether the given string represents a supported media URL
 */
function isMediaUrl(str) {
    return ((str.indexOf('http://') != -1 || str.indexOf('https://') != -1) && (str.indexOf('.mp4') !=
        -1 || str.indexOf('.mkv') != -1 || str.indexOf('.m3u8') != -1 || str.indexOf('.mp3') !=
        -1)) ? true : false;
}

function reduceArrayByObjectKey(arr, key) {
    return arr.reduce(function(accumulator, currentValue) {
        for (var e = 0, i = 0; i < accumulator.length; i++) {
            if (accumulator[i][key] == currentValue[key]) {
                e = 1;
                break;
            }
        }!!e || accumulator.push(currentValue);
        return accumulator;
    }, []);
}

/**
 * convert seconds to human-readable format HH:mm:ss - e.g.:
 * console.log(toHHMMSS(123)) // -> '00:02:03'
 */
function toHHMMSS(secs) {
    function pad(str) {
        return ("0" + str).slice(-2);
    }
    // round seconds, then then multiply by 1000 (because Date() requires ms)
    var dt = new Date((Math.round(secs * 100) / 100) * 1000);

    return pad(dt.getUTCHours()) + ":" + pad(dt.getUTCMinutes()) + ":" + pad(dt.getSeconds());
}

/**
 * if the given string represents a supported media URL,
 * set the input field for the mime type to match the media type
 * (required for casting)
 */
function guessMimeType(str) {
    if (str.indexOf('.mp3') != -1) {
        document.getElementById('mediaMimeType').selectedIndex = 2;
    } else if (str.indexOf('.mp4') != -1 || str.indexOf('.mkv') != -1) {
        document.getElementById('mediaMimeType').selectedIndex = 1;
    } else if (str.indexOf('.m3u8') != -1) {
        document.getElementById('mediaMimeType').selectedIndex = 0;
    }
}

/**
 * if the given string represents a supported media URL,
 * set the input field for the mime type to match the media type
 * (required for casting)
 */
function guessMimeTypeStr(str) {
    if (!str || !str.length) {
        return false;
    } else if (str.indexOf('.mp3') != -1) {
        return 'audio/mpeg';
    } else if (str.indexOf('.mp4') != -1 || str.indexOf('.mkv') != -1) {
        return 'video/mp4';
    } else if (str.indexOf('.m3u8') != -1) {
        return 'application/vnd.apple.mpegurl';
    }
}

/**
 * load media
 * @param {string} i An index for media
 */
function loadMedia(mediaURL) {
    if (!session) {
        console.log("no session");

        return;
    }

    var url = !!mediaURL ? mediaURL : currentMediaURL,
        mediaInfo = new chrome.cast.media.MediaInfo(url);

    console.log("loading new media file... " + url);

    mediaInfo.contentType = 'video/mp4';

    var request = new chrome.cast.media.LoadRequest(mediaInfo);
    request.autoplay = true;
    request.currentTime = 0;

    session.loadMedia(request, onMediaDiscovered.bind(this, 'loadMedia'), onMediaError);

}

/**
 * load media
 * @param {string} i An index for media
 */
function loadMediaPwnt(mediaURL, mediaType) {
    if (!session) {
        console.log("no session");

        return;
    }

    var url = !!mediaURL ? mediaURL : currentMediaURL,
        mediaInfo = new chrome.cast.media.MediaInfo(url);

    console.log("loading new media file... " + url);

    mediaInfo.contentType = mediaType;

    var request = new chrome.cast.media.LoadRequest(mediaInfo);
    request.autoplay = true;
    request.currentTime = 0;

    session.loadMedia(request, onMediaDiscovered.bind(this, 'loadMedia'), onMediaError);
}

/**
 * callback on success for loading media
 * @param {Object} e A non-null media object
 */
function onMediaDiscovered(how, media) {
    console.log("new media session ID:" + media.mediaSessionId);

    currentMedia = media;
    currentMedia.addUpdateListener(onMediaStatusUpdate);
    currentMediaTime = currentMedia.currentTime;
    playpauseresume.innerHTML = 'Play';
    setPlaylistCurrentItem(false);
    //document.getElementById("casticon").src = 'images/cast_icon_active.png';

    if (!timer) {
        timer = setInterval(updateCurrentTime.bind(this), 1000);
        playpauseresume.innerHTML = 'Pause';
    }
}

/**
 * callback on media loading error
 * @param {Object} e A non-null media object
 */
function onMediaError(e) {
    console.log("media error");

    //document.getElementById("casticon").src = 'images/cast_icon_warning.png';
}

/**
 * callback for media status event
 * @param {Object} e A non-null media object
 */
function onMediaStatusUpdate(isAlive) {
    if (progressFlag) {
        document.getElementById("duration").innerHTML = toHHMMSS(currentMedia.media.duration);
        document.getElementById("progress_tick").innerHTML = toHHMMSS(currentMedia.currentTime);
        document.getElementById("progress").value = (100 * currentMedia.currentTime /
            currentMedia.media.duration).toFixed(2);
    }

    document.getElementById("playerstate").innerHTML = currentMedia.playerState;
}

function loadSessionVolume() {
    if (!!session && !!session.receiver.volume.level) {
        currentVolume = session.receiver.volume.level;
        document.getElementById('volumething').value = session.receiver.volume.level * 100;
    } else {
        currentVolume = 1;
        document.getElementById('volumething').value = 100;
    }
}

setInterval(function() {
    var playpauseresume = document.getElementById("playpauseresume");

    if (!!currentMedia && currentMedia.playerState == "PLAYING" && playpauseresume.innerHTML ==
        'Play') {
        playMedia();
    };
}, 1000);

/**
 * Updates the progress bar shown for each media item.
 */
function updateCurrentTime() {
    if (!session || !currentMedia) {
        return;
    }

    if (currentMedia.media && currentMedia.media.duration != null) {
        var cTime = currentMedia.getEstimatedTime(),
            cProgress = (100 * cTime / currentMedia.media.duration).toFixed(2);

        document.getElementById("progress").value = cProgress;
        document.getElementById("progress_tick").innerHTML = toHHMMSS(cTime);
        setPlaylistCurrentItem(true);

        if (currentMedia.playerState == 'IDLE' && currentMedia.idleReason == 'FINISHED') {
            stopMedia();
        }
    } else {
        document.getElementById("progress").value = 0;
        document.getElementById("progress_tick").innerHTML = 0;

        if (!!timer) {
            clearInterval(timer);
        }
    }
};

/**
 * play media
 */
function playMedia() {
    if (!currentMedia) {
        return;
    }

    if (!!timer) {
        clearInterval(timer);
    }

    var playpauseresume = document.getElementById("playpauseresume");

    if (playpauseresume.innerHTML == 'Play') {
        currentMedia.play(
            null,
            mediaCommandSuccessCallback.bind(this, "playing started for " + currentMedia.sessionId),
            onError
        );

        console.log("playback started...");
        playpauseresume.innerHTML = 'Pause';
        setPlaylistCurrentItem(true);
        timer = setInterval(updateCurrentTime.bind(this), 1000);
    } else {
        if (playpauseresume.innerHTML == 'Pause') {
            currentMedia.pause(
                null,
                mediaCommandSuccessCallback.bind(this, "paused " + currentMedia.sessionId),
                onError
            );

            console.log("playback paused...");
            playpauseresume.innerHTML = 'Resume';
        } else {
            if (playpauseresume.innerHTML == 'Resume') {
                currentMedia.play(
                    null,
                    mediaCommandSuccessCallback.bind(this, "resumed " + currentMedia.sessionId),
                    onError
                );

                console.log("playback resumed...");
                playpauseresume.innerHTML = 'Pause';
                timer = setInterval(updateCurrentTime.bind(this), 1000);
            }
        }
    }
}

/**
 * stop media
 */
function stopMedia() {
    setPlaylistCurrentItem(false);

    if (!currentMedia) {
        return;
    }

    currentMedia.stop(
        null,
        mediaCommandSuccessCallback.bind(this, "stopped " + currentMedia.sessionId),
        onError
    );

    console.log("playback stopped");
    var playpauseresume = document.getElementById("playpauseresume");
    playpauseresume.innerHTML = 'Play';

    if (!!timer) {
        clearInterval(timer);
    }

    if (null != currentPlaylist && 0 < currentPlaylist.length && currentPlaylistItem < (
            currentPlaylist.length - 1)) {
        setPlaylistCurrentItem(false);
        var nextUrl = currentPlaylist[currentPlaylistItem + 1];
        loadMediaPwnt(nextUrl, guessMimeTypeStr(nextUrl));
    }
}

/**
 * set media volume
 * @param {Number} level A number for volume level
 * @param {Boolean} mute A true/false for mute/unmute
 */
function setMediaVolume(level, mute) {
    if (!currentMedia) {
        return;
    }

    var volume = new chrome.cast.Volume(),
        request = new chrome.cast.media.VolumeRequest();

    volume.muted = mute;
    volume.level = level;
    request.volume = volume;
    currentVolume = volume.level;

    currentMedia.setVolume(
        request,
        mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
        onError
    );
}

/**
 * set receiver volume
 * @param {Number} level A number for volume level
 * @param {Boolean} mute A true/false for mute/unmute
 */
function setReceiverVolume(level, mute) {
    if (!session) {
        return;
    }

    if (!mute) {
        session.setReceiverVolumeLevel(
            level,
            mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
            onError
        );

        currentVolume = level;

    } else {
        session.setReceiverMuted(
            true,
            mediaCommandSuccessCallback.bind(this, 'media set-volume done'),
            onError
        );
    }

    setTimeout(function() {
        currentMedia.volume.level = currentVolume;
        currentMedia.volume.sessionVolume = currentVolume * 100;
        document.getElementById('volumething').value = currentVolume * 100;
    }, 300);
}

/**
 * mute media
 * @param {DOM Object} cb A checkbox element
 */
function muteMedia(cb) {
    if (cb.checked == true) {
        setReceiverVolume(currentVolume, true);
        console.log("media muted");
        cb.checked = true;
    } else {
        setReceiverVolume(currentVolume, false);
        console.log("media unmuted");
    }
}

/**
 * seek media position
 * @param {Number} pos A number to indicate percent
 */
function seekMedia(pos) {
    console.log('Seeking ' + currentMedia.sessionId + ':' +
        currentMedia.mediaSessionId + ' to ' + pos + "%");

    progressFlag = 0;
    var request = new chrome.cast.media.SeekRequest();
    request.currentTime = pos * currentMedia.media.duration / 100;

    currentMedia.seek(
        request,
        onSeekSuccess.bind(this, 'media seek done'),
        onError
    );
}

/**
 * callback on success for media commands
 * @param {string} info A message string
 * @param {Object} e A non-null media object
 */
function onSeekSuccess(info) {
    console.log(info);

    setTimeout(function() {
        progressFlag = 1
    }, 1500);
}

/**
 * callback on success for media commands
 * @param {string} info A message string
 * @param {Object} e A non-null media object
 */
function mediaCommandSuccessCallback(info) {
    console.log(info);
}
