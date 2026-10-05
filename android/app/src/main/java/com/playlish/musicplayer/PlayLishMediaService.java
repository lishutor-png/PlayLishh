package com.playlish.musicplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

public class PlayLishMediaService extends Service {
    public static final String CHANNEL_ID = "playlish_media_playback_channel";
    public static final int NOTIFICATION_ID = 8842;

    public static final String ACTION_UPDATE = "com.playlish.musicplayer.ACTION_UPDATE";
    public static final String ACTION_STOP_SERVICE = "com.playlish.musicplayer.ACTION_STOP_SERVICE";
    public static final String ACTION_BTN_PLAY = "com.playlish.musicplayer.ACTION_BTN_PLAY";
    public static final String ACTION_BTN_PAUSE = "com.playlish.musicplayer.ACTION_BTN_PAUSE";
    public static final String ACTION_BTN_NEXT = "com.playlish.musicplayer.ACTION_BTN_NEXT";
    public static final String ACTION_BTN_PREV = "com.playlish.musicplayer.ACTION_BTN_PREV";

    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;
    private Bitmap cachedAppIcon;
    private final Handler heartbeatHandler = new Handler(Looper.getMainLooper());

    private String currentTitle = "PlayLish Hi-Res Audio";
    private String currentArtist = "PlayLish";
    private String currentAlbum = "Koleksi Lokal";
    private boolean currentIsPlaying = false;
    private long currentPositionMs = 0L;
    private long currentDurationMs = 0L;

    // 25-second native heartbeat keeps CPU WakeLock & WebView JS timers alive indefinitely (>1 hour non-stop)
    private final Runnable keepAliveRunnable = new Runnable() {
        @Override
        public void run() {
            if (currentIsPlaying) {
                acquireWakeLock();
                MainActivity.keepWebViewAlive();
                heartbeatHandler.postDelayed(this, 25000L);
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();
        initWakeLock();
        try {
            cachedAppIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        } catch (Exception ignored) {
        }
    }

    private void initWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PlayLish::MediaPlaybackWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {
        }
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                // Hold wake lock up to 6 hours max safety timeout while playing
                wakeLock.acquire(6 * 60 * 60 * 1000L);
            }
        } catch (Exception ignored) {
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSession(this, "PlayLishMediaSession");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                MainActivity.dispatchMediaActionToWebView("play", -1);
            }

            @Override
            public void onPause() {
                MainActivity.dispatchMediaActionToWebView("pause", -1);
            }

            @Override
            public void onSkipToNext() {
                MainActivity.dispatchMediaActionToWebView("next", -1);
            }

            @Override
            public void onSkipToPrevious() {
                MainActivity.dispatchMediaActionToWebView("prev", -1);
            }

            @Override
            public void onStop() {
                MainActivity.dispatchMediaActionToWebView("pause", -1);
            }

            @Override
            public void onSeekTo(long pos) {
                MainActivity.dispatchMediaActionToWebView("seekto", pos);
            }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            switch (action) {
                case ACTION_BTN_PLAY:
                    MainActivity.dispatchMediaActionToWebView("play", -1);
                    return START_STICKY;
                case ACTION_BTN_PAUSE:
                    MainActivity.dispatchMediaActionToWebView("pause", -1);
                    return START_STICKY;
                case ACTION_BTN_NEXT:
                    MainActivity.dispatchMediaActionToWebView("next", -1);
                    return START_STICKY;
                case ACTION_BTN_PREV:
                    MainActivity.dispatchMediaActionToWebView("prev", -1);
                    return START_STICKY;
                case ACTION_STOP_SERVICE:
                    heartbeatHandler.removeCallbacks(keepAliveRunnable);
                    releaseWakeLock();
                    stopForeground(true);
                    stopSelf();
                    return START_NOT_STICKY;
                case ACTION_UPDATE:
                    if (intent.hasExtra("title")) {
                        currentTitle = intent.getStringExtra("title");
                    }
                    if (intent.hasExtra("artist")) {
                        currentArtist = intent.getStringExtra("artist");
                    }
                    if (intent.hasExtra("album")) {
                        currentAlbum = intent.getStringExtra("album");
                    }
                    currentIsPlaying = intent.getBooleanExtra("isPlaying", currentIsPlaying);
                    currentPositionMs = intent.getLongExtra("positionMs", currentPositionMs);
                    currentDurationMs = intent.getLongExtra("durationMs", currentDurationMs);
                    break;
            }
        }

        heartbeatHandler.removeCallbacks(keepAliveRunnable);
        if (currentIsPlaying) {
            acquireWakeLock();
            heartbeatHandler.postDelayed(keepAliveRunnable, 25000L);
        } else {
            releaseWakeLock();
        }

        updateSessionAndNotification();
        return START_STICKY;
    }

    private void updateSessionAndNotification() {
        if (mediaSession == null) {
            initMediaSession();
        }

        // 1. Update PlaybackState
        long actions = PlaybackState.ACTION_PLAY
                | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_SEEK_TO
                | PlaybackState.ACTION_STOP;

        int state = currentIsPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        float speed = currentIsPlaying ? 1.0f : 0.0f;

        PlaybackState playbackState = new PlaybackState.Builder()
                .setActions(actions)
                .setState(state, Math.max(0L, currentPositionMs), speed)
                .build();
        mediaSession.setPlaybackState(playbackState);

        // 2. Update MediaMetadata
        MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle != null ? currentTitle : "PlayLish Audio")
                .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist != null ? currentArtist : "PlayLish")
                .putString(MediaMetadata.METADATA_KEY_ALBUM, currentAlbum != null ? currentAlbum : "Hi-Res Audio")
                .putLong(MediaMetadata.METADATA_KEY_DURATION, Math.max(0L, currentDurationMs));

        if (cachedAppIcon != null) {
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, cachedAppIcon);
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, cachedAppIcon);
        }

        mediaSession.setMetadata(metaBuilder.build());
        mediaSession.setActive(true);

        // 3. Build MediaStyle Notification
        Notification notification = buildMediaNotification();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, notification);
            }
        }
    }

    private Notification buildMediaNotification() {
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 100, openAppIntent, pendingFlags);

        PendingIntent prevPending = PendingIntent.getService(
                this, 101, new Intent(this, PlayLishMediaService.class).setAction(ACTION_BTN_PREV), pendingFlags);

        PendingIntent playPausePending = PendingIntent.getService(
                this, 102,
                new Intent(this, PlayLishMediaService.class).setAction(currentIsPlaying ? ACTION_BTN_PAUSE : ACTION_BTN_PLAY),
                pendingFlags);

        PendingIntent nextPending = PendingIntent.getService(
                this, 103, new Intent(this, PlayLishMediaService.class).setAction(ACTION_BTN_NEXT), pendingFlags);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        Notification.Action prevAction = new Notification.Action.Builder(
                android.R.drawable.ic_media_previous, "Sebelumnya", prevPending).build();

        Notification.Action playPauseAction = new Notification.Action.Builder(
                currentIsPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                currentIsPlaying ? "Jeda" : "Putar",
                playPausePending).build();

        Notification.Action nextAction = new Notification.Action.Builder(
                android.R.drawable.ic_media_next, "Berikutnya", nextPending).build();

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2);

        builder.setStyle(mediaStyle)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSubText(currentAlbum)
                .setContentIntent(contentPendingIntent)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(currentIsPlaying)
                .setShowWhen(false)
                .addAction(prevAction)
                .addAction(playPauseAction)
                .addAction(nextAction);

        if (cachedAppIcon != null) {
            builder.setLargeIcon(cachedAppIcon);
        }

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "PlayLish Kontrol Pemutaran Musik",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Menampilkan informasi lagu dan kontrol pemutaran di notifikasi & layar kunci");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        heartbeatHandler.removeCallbacks(keepAliveRunnable);
        releaseWakeLock();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
