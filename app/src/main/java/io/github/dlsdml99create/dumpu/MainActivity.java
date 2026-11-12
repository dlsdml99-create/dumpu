package io.github.dlsdml99create.dumpu;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/assets/index.html";

    private WebView web;
    private String openTo = null; // 알림을 눌러 열 화면 (daily / habit)
    private WebViewAssetLoader loader;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        // 화면이 상태바·내비게이션바·키보드에 가리지 않게
        root.setOnApplyWindowInsetsListener((v, in) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets s = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                l = s.left; t = s.top; r = s.right; b = s.bottom;
            } else {
                l = in.getSystemWindowInsetLeft(); t = in.getSystemWindowInsetTop();
                r = in.getSystemWindowInsetRight(); b = in.getSystemWindowInsetBottom();
            }
            v.setPadding(l, t, r, b);
            return in;
        });

        loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(false);
        ws.setAllowContentAccess(false);
        ws.setGeolocationEnabled(false);
        ws.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        ws.setSupportMultipleWindows(false);
        ws.setJavaScriptCanOpenWindowsAutomatically(false);
        ws.setMediaPlaybackRequiresUserGesture(true);
        ws.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(this), "Bridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return loader.shouldInterceptRequest(u);
                return null; // 그 밖의 주소는 CSP가 막고, 화면 이동은 아래에서 막음
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                runOpenDaily();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                Bridge.openSafe(MainActivity.this, u.toString()); // 허용된 GitHub 주소만 밖에서 열기
                return true;
            }
        });

        openTo = safeOpen(getIntent().getStringExtra("open"));
        if (saved != null) web.restoreState(saved);
        else web.loadUrl(START);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        // 위젯에서 체크한 것을 화면에 반영
        web.evaluateJavascript("window.__onResume&&window.__onResume()", null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String o = safeOpen(intent.getStringExtra("open"));
        if (o != null) { openTo = o; runOpenDaily(); }
    }

    private static String safeOpen(String v) { return "daily".equals(v) || "habit".equals(v) ? v : null; }

    private void runOpenDaily() {
        if (openTo == null || web == null) return;
        String fn = "habit".equals(openTo) ? "__openHabit" : "__openDaily";
        web.evaluateJavascript("(window." + fn + "&&(window." + fn + "(),true))?'1':'0'", v -> {
            if ("\"1\"".equals(v)) openTo = null;
        });
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.onBackKey&&window.onBackKey())?'1':'0'", v -> {
            if (!"\"1\"".equals(v)) finish();
        });
    }

    void askNotiPermission() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7);
        }
    }

    // ── 백업 파일 (저장·불러오기): 사용자가 고른 파일 하나만 읽고 써요
    private static final int REQ_BK_SAVE = 7301, REQ_BK_OPEN = 7302;
    private String bkData;

    void js(String code) { runOnUiThread(() -> { if (web != null) web.evaluateJavascript(code, null); }); }

    void startBackupSave(String name, String text) {
        bkData = text;
        try {
            startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json").putExtra(Intent.EXTRA_TITLE, name), REQ_BK_SAVE);
        } catch (Exception e) { bkData = null; js("window.__bkDone&&window.__bkDone(false)"); }
    }

    void startBackupOpen() {
        try {
            startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("*/*").putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"}), REQ_BK_OPEN);
        } catch (Exception e) { js("window.__bkOpened&&window.__bkOpened(null)"); }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_BK_SAVE && req != REQ_BK_OPEN) return;
        final Uri u = (res == RESULT_OK && data != null) ? data.getData() : null;
        if (req == REQ_BK_SAVE) {
            final String text = bkData; bkData = null;
            if (u == null || text == null) { js("window.__bkDone&&window.__bkDone(false,'cancel')"); return; }
            new Thread(() -> {
                boolean ok;
                try (java.io.OutputStream o = getContentResolver().openOutputStream(u, "wt")) {
                    if (o == null) throw new java.io.IOException();
                    o.write(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)); ok = true;
                } catch (Exception e) { ok = false; }
                js("window.__bkDone&&window.__bkDone(" + ok + ")");
            }).start();
            return;
        }
        if (u == null) { js("window.__bkOpened&&window.__bkOpened(null,'cancel')"); return; }
        new Thread(() -> {
            String out = null;
            try (java.io.InputStream in = getContentResolver().openInputStream(u)) {
                if (in != null) {
                    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
                    byte[] buf = new byte[65536]; int n, total = 0;
                    while ((n = in.read(buf)) > 0) { total += n; if (total > 15_000_000) { bo = null; break; } bo.write(buf, 0, n); }
                    if (bo != null) out = bo.toString("UTF-8");
                }
            } catch (Exception ignored) { }
            js("window.__bkOpened&&window.__bkOpened(" + (out == null ? "null" : org.json.JSONObject.quote(out)) + ")");
        }).start();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("Bridge");
            web.destroy();
        }
        super.onDestroy();
    }
}
