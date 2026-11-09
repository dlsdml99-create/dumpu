package io.github.dlsdml99create.dumpu;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;

/** 앱 화면(자바스크립트)과 폰 기능을 잇는 다리. 화면에서 부를 수 있는 건 아래 6개뿐. */
public class Bridge {
    private final MainActivity act;

    Bridge(MainActivity a) { act = a; }

    @JavascriptInterface
    public boolean isApp() { return true; }

    /** 위젯·알림용 오늘부터 2주치 할 일과 알림 설정을 받는다. */
    @JavascriptInterface
    public void sync(String json) {
        if (json == null || json.length() > 200_000) return;
        Store.saveSnapshot(act, json);
        AlarmReceiver.schedule(act);
        DumpuWidget.refreshAll(act);
    }

    /** 위젯에서 체크한 기록을 넘기고 비운다. */
    @JavascriptInterface
    public String takeOps() { return Store.takeOps(act); }

    @JavascriptInterface
    public void requestNoti() { act.runOnUiThread(act::askNotiPermission); }

    @JavascriptInterface
    public void openUrl(String url) { act.runOnUiThread(() -> openSafe(act, url)); }

    /** 백업 글을 카톡·메모 등으로 보내기 (사용자가 받는 앱을 직접 고름). */
    @JavascriptInterface
    public void share(String text) {
        if (text == null || text.isEmpty() || text.length() > 200_000) return;
        act.runOnUiThread(() -> {
            try {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, "덤푸 백업");
                i.putExtra(Intent.EXTRA_TEXT, text);
                act.startActivity(Intent.createChooser(i, "덤푸 백업 보내기"));
            } catch (Exception ignored) { }
        });
    }

    /** 이 앱의 GitHub 페이지·다운로드 주소만 밖(브라우저)에서 연다. */
    static void openSafe(Context c, String url) {
        if (url == null) return;
        boolean ok = url.startsWith("https://github.com/dlsdml99-create/dumpu/")
                || url.startsWith("https://dlsdml99-create.github.io/dumpu/");
        if (!ok) return;
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
        } catch (Exception ignored) { }
    }
}
