package io.github.dlsdml99create.dumpu;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.io.OutputStream;

/** 앱 화면(자바스크립트)과 폰 기능을 잇는 다리. 화면에서 부를 수 있는 건 아래 9개뿐. */
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

    /** 백업 파일 저장: 사용자가 '파일' 창에서 고른 곳에만 써요 (권한 필요 없음, 인터넷으로 보내지 않음). */
    @JavascriptInterface
    public void backupSave(String name, String text) {
        if (text == null || text.isEmpty() || text.length() > 15_000_000) { act.js("window.__bkDone&&window.__bkDone(false)"); return; }
        String n = name != null && name.matches("[A-Za-z0-9._-]{1,60}") ? name : "dumpu-backup.json";
        act.runOnUiThread(() -> act.startBackupSave(n, text));
    }

    /** 백업 파일 불러오기: 사용자가 고른 파일 하나만 읽어요. */
    @JavascriptInterface
    public void backupOpen() { act.runOnUiThread(act::startBackupOpen); }

    /**
     * 데일리 그림(PNG)을 사진첩 Pictures/덤푸 에 저장하고, share 면 공유 창을 띄운다.
     * 안드로이드 10 이상만 (권한 없이 저장 가능). 반환: ok / old / fail
     */
    @JavascriptInterface
    public String saveImage(String b64, boolean share) {
        if (Build.VERSION.SDK_INT < 29) return "old";
        if (b64 == null || b64.length() > 12_000_000) return "fail";
        try {
            byte[] png = Base64.decode(b64, Base64.DEFAULT);
            if (png.length < 8 || (png[0] & 0xFF) != 0x89 || png[1] != 'P' || png[2] != 'N' || png[3] != 'G') return "fail"; // PNG 만
            ContentResolver cr = act.getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, "dumpu-" + System.currentTimeMillis() + ".png");
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/덤푸");
            v.put(MediaStore.Images.Media.IS_PENDING, 1);
            Uri uri = cr.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) return "fail";
            try (OutputStream os = cr.openOutputStream(uri)) {
                if (os == null) return "fail";
                os.write(png);
            }
            v.clear();
            v.put(MediaStore.Images.Media.IS_PENDING, 0);
            cr.update(uri, v, null, null);
            if (share) {
                act.runOnUiThread(() -> {
                    try {
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType("image/png");
                        i.putExtra(Intent.EXTRA_STREAM, uri);
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        act.startActivity(Intent.createChooser(i, "덤푸 그림 보내기"));
                    } catch (Exception ignored) { }
                });
            }
            return "ok";
        } catch (Exception e) {
            return "fail";
        }
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
