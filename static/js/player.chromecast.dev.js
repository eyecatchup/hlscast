/**
 * global variables
 */
var timer = null,
    session = null,
    progressFlag = 1,
    currentMedia = null,
    currentMediaURL = null,
    currentMediaTime = 0,
    currentVolume = 0.5;

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
        document.location.href = 'player.html?video=' + customMediaURL;
    }
}

/**
 * load media specified by custom URL
 */
function setLivestream(streamId) {
    var streamUrls = [
            'http://live-lh.daserste.de/i/daserste_de@91204/master.m3u8',
            'http://emwdr-lh.akamaihd.net/i/em2016_wdr@182638/index_3776_av-p.m3u8?b=3667&sd=10&dw=10&rebase=on',
            'http://zdf1314-lh.akamaihd.net/i/de14_v1@392878/index_3056_av-p.m3u8?sd=10&rebase=on',
            'http://ran03dach-live.hls.adaptive.level3.net/sevenone/ran03dach/wifi2500.m3u8'
        ],
        streamUrl = streamUrls[streamId];

    if (!!streamUrl) {
        document.getElementById('networkStreamUrl').value = streamUrl;
        document.getElementById('mediaMimeType').selectedIndex = 0;
    }
}

function toHHMMSS(secs) {
    function pad(str) {
        return ("0" + str).slice(-2);
    }
    // round seconds, then then multiply by 1000 (because Date() requires ms)
    var dt = new Date((Math.round(secs * 100) / 100) * 1000);

    return pad(dt.getUTCHours()) + ":" + pad(dt.getUTCMinutes()) + ":" + pad(dt.getSeconds());
}

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
        document.getElementById("progress").value = parseInt(100 * currentMedia.currentTime /
            currentMedia.media.duration);
    }

    document.getElementById("playerstate").innerHTML = currentMedia.playerState;
}

setInterval(function() {
    var playpauseresume = document.getElementById("playpauseresume");

    if (!!currentMedia && currentMedia.playerState == "PLAYING" && playpauseresume.innerHTML == 'Play') {
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
        var cTime = currentMedia.getEstimatedTime();

        document.getElementById("progress").value = toHHMMSS(parseInt(100 * cTime / currentMedia.media.duration));
        document.getElementById("progress_tick").innerHTML = toHHMMSS(cTime);
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
