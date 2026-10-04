package com.playlish.musicplayer;

import android.Manifest;
import android.content.ContentUris;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static WeakReference<MainActivity> instanceRef;
    private static final int PERMISSION_REQ_CODE = 9001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instanceRef = new WeakReference<>(this);

        requestRequiredAndroidPermissions();
        configureWebViewForBackgroundAudio();
    }

    private void configureWebViewForBackgroundAudio() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                webView.addJavascriptInterface(new PlayLishNativeBridge(), "PlayLishNativeBridge");
            }
        } catch (Exception ignored) {
        }
    }

    private void requestRequiredAndroidPermissions() {
        try {
            List<String> needed = new ArrayList<>();
            if (Build.VERSION.SDK_INT >= 33) {
                // Android 13+ Notification & Audio Media permissions
                if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS")
                        != PackageManager.PERMISSION_GRANTED) {
                    needed.add("android.permission.POST_NOTIFICATIONS");
                }
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.READ_MEDIA_AUDIO);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                        != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                }
            }

            if (!needed.isEmpty()) {
                ActivityCompat.requestPermissions(
                        this,
                        needed.toArray(new String[0]),
                        PERMISSION_REQ_CODE
                );
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Keep WebView JS timers & audio queue progression alive in background so app never stalls/exits after 1 hour
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().resumeTimers();
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        instanceRef = new WeakReference<>(this);
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().resumeTimers();
            }
        } catch (Exception ignored) {
        }
    }

    public static void dispatchMediaActionToWebView(final String action, final long seekPosMs) {
        final MainActivity activity = instanceRef != null ? instanceRef.get() : null;
        if (activity == null) return;

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (activity.getBridge() != null && activity.getBridge().getWebView() != null) {
                        WebView wv = activity.getBridge().getWebView();
                        double seekSec = seekPosMs >= 0 ? (seekPosMs / 1000.0) : -1.0;
                        String js = "window.dispatchEvent(new CustomEvent('playlish-native-action', { detail: { action: '"
                                + action + "', seekTime: " + seekSec + " } }));";
                        wv.evaluateJavascript(js, null);
                    }
                } catch (Exception ignored) {
                }
            }
        });
    }

    public class PlayLishNativeBridge {
        @JavascriptInterface
        public void updateMediaSession(
                String title,
                String artist,
                String album,
                boolean isPlaying,
                long positionMs,
                long durationMs
        ) {
            try {
                Intent serviceIntent = new Intent(MainActivity.this, PlayLishMediaService.class);
                serviceIntent.setAction(PlayLishMediaService.ACTION_UPDATE);
                serviceIntent.putExtra("title", title != null ? title : "PlayLish Audio");
                serviceIntent.putExtra("artist", artist != null ? artist : "PlayLish");
                serviceIntent.putExtra("album", album != null ? album : "Koleksi Lokal");
                serviceIntent.putExtra("isPlaying", isPlaying);
                serviceIntent.putExtra("positionMs", positionMs);
                serviceIntent.putExtra("durationMs", durationMs);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void updatePlaybackState(boolean isPlaying, long positionMs, long durationMs) {
            try {
                Intent serviceIntent = new Intent(MainActivity.this, PlayLishMediaService.class);
                serviceIntent.setAction(PlayLishMediaService.ACTION_UPDATE);
                serviceIntent.putExtra("isPlaying", isPlaying);
                serviceIntent.putExtra("positionMs", positionMs);
                serviceIntent.putExtra("durationMs", durationMs);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void stopMediaSession() {
            try {
                Intent serviceIntent = new Intent(MainActivity.this, PlayLishMediaService.class);
                serviceIntent.setAction(PlayLishMediaService.ACTION_STOP_SERVICE);
                startService(serviceIntent);
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public String scanDeviceAudio() {
            JSONArray array = new JSONArray();
            try {
                // Ensure permission is requested if not granted yet
                boolean hasPerm;
                if (Build.VERSION.SDK_INT >= 33) {
                    hasPerm = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_MEDIA_AUDIO)
                            == PackageManager.PERMISSION_GRANTED;
                } else {
                    hasPerm = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_EXTERNAL_STORAGE)
                            == PackageManager.PERMISSION_GRANTED;
                }

                if (!hasPerm) {
                    requestRequiredAndroidPermissions();
                    return array.toString();
                }

                Uri collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                String[] projection = new String[]{
                        MediaStore.Audio.Media._ID,
                        MediaStore.Audio.Media.TITLE,
                        MediaStore.Audio.Media.ARTIST,
                        MediaStore.Audio.Media.ALBUM,
                        MediaStore.Audio.Media.DURATION,
                        MediaStore.Audio.Media.SIZE,
                        MediaStore.Audio.Media.MIME_TYPE,
                        MediaStore.Audio.Media.DATA
                };
                String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";
                String sortOrder = MediaStore.Audio.Media.DATE_ADDED + " DESC";

                try (Cursor cursor = getContentResolver().query(collection, projection, selection, null, sortOrder)) {
                    if (cursor != null) {
                        int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                        int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                        int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                        int albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                        int durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                        int sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
                        int mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);
                        int dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);

                        int count = 0;
                        while (cursor.moveToNext() && count < 500) {
                            long id = cursor.getLong(idCol);
                            String title = cursor.getString(titleCol);
                            String artist = cursor.getString(artistCol);
                            String album = cursor.getString(albumCol);
                            long duration = cursor.getLong(durationCol);
                            long size = cursor.getLong(sizeCol);
                            String mimeType = cursor.getString(mimeCol);
                            String filePath = dataCol >= 0 ? cursor.getString(dataCol) : "";

                            Uri contentUri = ContentUris.withAppendedId(
                                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id
                            );

                            JSONObject obj = new JSONObject();
                            obj.put("id", String.valueOf(id));
                            obj.put("title", title != null ? title : "Audio");
                            obj.put("artist", artist != null ? artist : "Artis Lokal");
                            obj.put("album", album != null ? album : "Koleksi HP");
                            obj.put("duration", duration);
                            obj.put("size", size);
                            obj.put("mimeType", mimeType != null ? mimeType : "audio/mpeg");
                            obj.put("contentUri", contentUri.toString());
                            obj.put("filePath", filePath != null ? filePath : "");

                            array.put(obj);
                            count++;
                        }
                    }
                }
            } catch (Exception ignored) {
            }
            return array.toString();
        }
    }
}
