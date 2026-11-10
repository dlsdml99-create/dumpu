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

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("Bridge");
            web.destroy();
        }
        super.onDestroy();
    }
}
